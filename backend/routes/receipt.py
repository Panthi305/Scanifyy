# receipt.py
from flask import Blueprint, request, jsonify
from PIL import Image
import pytesseract
import cv2
import numpy as np
from pdf2image import convert_from_bytes
import io
import traceback
from datetime import datetime
import re
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from routes.user import get_exchange_rate
import os
from dotenv import load_dotenv

load_dotenv()

receipt_bp = Blueprint('receipt', __name__)

POPLER_PATH = r"C:\Users\panth\Downloads\Release-25.07.0-0\poppler-25.07.0\Library\bin"
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

try:
    from db import expenses_collection
except Exception as e:
    print(f"Error importing expenses_collection: {str(e)}")
    expenses_collection = None

# Email configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def send_email(to_email, subject, body):
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_USERNAME, to_email, msg.as_string())
        server.quit()
        print(f"Email sent to {to_email}")
    except Exception as e:
        print(f"Error sending email: {str(e)}")

@receipt_bp.route('/upload', methods=['POST'])
def upload_receipt():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    email = request.form.get("email")
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    try:
        file_bytes = file.read()
        images = []

        if file.content_type in ['image/jpeg', 'image/png']:
            img = Image.open(io.BytesIO(file_bytes))
            images = [img]
        elif file.content_type == 'application/pdf':
            images = convert_from_bytes(file_bytes, poppler_path=POPLER_PATH)
        else:
            return jsonify({'error': 'Unsupported file type'}), 400

        text = ''
        for img in images:
            open_cv_image = np.array(img)
            gray = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2GRAY)
            thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
            text += pytesseract.image_to_string(thresh) + '\n\n'

        data = parse_receipt(text)
        data['created_at'] = datetime.utcnow()
        data['email'] = email
        result = expenses_collection.insert_one(data)
        data['_id'] = str(result.inserted_id)

        # Check budget alerts after uploading a receipt
        alerts_response = check_budget_alerts_internal(email)
        if alerts_response['has_alerts']:
            user = expenses_collection.database["users"].find_one({"email": email})
            if user and user.get("notifications", {}).get("email", True):
                for alert in alerts_response['alerts']:
                    subject = f"Budget Alert: {alert['category']} Exceeded"
                    body = (
                        f"Dear {user.get('username', 'User')},\n\n"
                        f"Your spending in the '{alert['category']}' category has exceeded your budget.\n"
                        f"Current: {alert['current_percentage']}% | Budget: {alert['budget_percentage']}%\n"
                        f"Overspend: {alert['overspend_amount']:.2f}%\n\n"
                        f"Please review your spending in the dashboard.\n"
                        f"Best,\nReceipt Scanner Team"
                    )
                    send_email(email, subject, body)

        return jsonify(data), 200

    except Exception as e:
        print(f"Error in upload_receipt: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': f'Failed to process receipt: {str(e)}'}), 500

# Internal function to check budget alerts
def check_budget_alerts_internal(email):
    try:
        if expenses_collection is None:
            return {"error": "Database not initialized", "alerts": [], "has_alerts": False}

        # Get user's budget preferences
        user = expenses_collection.database["users"].find_one({"email": email})
        if not user:
            return {"error": "User not found", "alerts": [], "has_alerts": False}

        budget_preferences = user.get("budget_preferences", {})

        # Get current category ratios
        pipeline_total = [
            {"$match": {"email": email}},
            {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$total", 0]}}}}
        ]
        total_result = list(expenses_collection.aggregate(pipeline_total))
        total_spend = total_result[0]["total"] if total_result else 1  # Avoid division by zero

        pipeline_category = [
            {"$match": {"email": email}},
            {"$unwind": {"path": "$items", "preserveNullAndEmptyArrays": True}},
            {"$group": {
                "_id": {"$ifNull": ["$items.category", "uncategorized"]},
                "amount": {"$sum": {"$ifNull": ["$items.amount", 0]}}
            }},
            {"$sort": {"amount": -1}}
        ]
        category_data = list(expenses_collection.aggregate(pipeline_category))

        # Check for exceeded budgets
        alerts = []
        for category in category_data:
            category_name = category["_id"]
            current_percentage = (category["amount"] / total_spend) * 100 if total_spend > 0 else 0
            budget_percentage = budget_preferences.get(category_name, 0)

            if budget_percentage and current_percentage > budget_percentage:
                alerts.append({
                    "category": category_name,
                    "current_percentage": round(current_percentage, 2),
                    "budget_percentage": budget_percentage,
                    "overspend_amount": round(current_percentage - budget_percentage, 2)
                })

        return {
            "alerts": alerts,
            "has_alerts": len(alerts) > 0,
            "status": "success"
        }

    except Exception as e:
        print(f"Error in check_budget_alerts_internal: {str(e)}")
        traceback.print_exc()
        return {"error": f"Failed to check budget alerts: {str(e)}", "alerts": [], "has_alerts": False}

@receipt_bp.route('/check-budget-alerts', methods=['GET'])
def check_budget_alerts():
    try:
        if expenses_collection is None:
            return jsonify({"error": "Database not initialized"}), 500
        
        email = request.args.get("email")
        if not email:
            return jsonify({"error": "Email is required"}), 400

        alerts_response = check_budget_alerts_internal(email)
        if "error" in alerts_response:
            return jsonify(alerts_response), 400

        return jsonify(alerts_response), 200

    except Exception as e:
        print(f"Error in check_budget_alerts: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to check budget alerts: {str(e)}"}), 500

@receipt_bp.route('/set-budget-preferences', methods=['POST'])
def set_budget_preferences():
    try:
        if expenses_collection is None:
            return jsonify({"error": "Database not initialized"}), 500
        
        email = request.json.get("email")
        preferences = request.json.get("preferences")
        
        if not email or not preferences:
            return jsonify({"error": "Email and preferences are required"}), 400

        # Validate preferences
        total_percentage = sum(float(p) for p in preferences.values() if p)
        if total_percentage > 100:
            return jsonify({"error": "Total percentage cannot exceed 100%"}), 400

        # Update user's budget preferences
        result = expenses_collection.database["users"].update_one(
            {"email": email},
            {"$set": {"budget_preferences": preferences}},
            upsert=True
        )

        if result.modified_count > 0 or result.upserted_id:
            # Check for alerts after updating preferences
            alerts_response = check_budget_alerts_internal(email)
            if alerts_response['has_alerts']:
                user = expenses_collection.database["users"].find_one({"email": email})
                if user and user.get("notifications", {}).get("email", True):
                    for alert in alerts_response['alerts']:
                        subject = f"Budget Alert: {alert['category']} Exceeded"
                        body = (
                            f"Dear {user.get('username', 'User')},\n\n"
                            f"Your spending in the '{alert['category']}' category has exceeded your budget.\n"
                            f"Current: {alert['current_percentage']}% | Budget: {alert['budget_percentage']}%\n"
                            f"Overspend: {alert['overspend_amount']:.2f}%\n\n"
                            f"Please review your spending in the dashboard.\n"
                            f"Best,\nReceipt Scanner Team"
                        )
                        send_email(email, subject, body)

            return jsonify({
                "message": "Budget preferences updated successfully",
                "status": "success"
            }), 200
        else:
            return jsonify({"error": "Failed to update preferences"}), 400

    except Exception as e:
        print(f"Error in set_budget_preferences: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to set budget preferences: {str(e)}"}), 500

def normalize_currency(symbol, code):
    mapping = {"INR": "₹", "USD": "$", "EUR": "€", "GBP": "£"}
    if symbol and symbol in mapping.values():
        return symbol
    if code:
        return mapping.get(code.upper(), code.upper())
    return "₹"

def parse_receipt(text):
    lines = [line.strip() for line in text.splitlines() if line.strip()]

    data = {
        'merchant': '',
        'date': '',
        'currency': '₹',
        'subtotal': 0.0,
        'tax': 0.0,
        'tax_percent': 0.0,
        'total': 0.0,
        'items': []
    }

    date_patterns = [
        re.compile(r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b'),
        re.compile(r'\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b'),
        re.compile(r'([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})')
    ]
    amount_pattern = re.compile(r'(?:(₹|\$|€|£)|(?:\b(INR|USD|EUR|GBP)\b))?\s*([\d]+(?:[.,]\d{1,2})?)', re.I)
    tax_pattern = re.compile(r'Tax\s*\(?\s*(\d{1,2}(?:\.\d{1,2})?)?\s*%?\s*(?:GST)?\)?\s*[:\-]?\s*(?:(₹|\$|€|£)|(?:\b(INR|USD|EUR|GBP)\b))?\s*([\d]+(?:[.,]\d{1,2})?)', re.I)

    item_pattern_table = re.compile(r'^(.*?)\s+(\d+)\s+([\d]+(?:[.,]\d{1,2})?)\s+([\d]+(?:[.,]\d{1,2})?)$')
    item_pattern_block_item = re.compile(r'item[:\-]\s*(.+)', re.I)
    item_pattern_block_price = re.compile(r'price[:\-]\s*(?:(₹|\$|€|£)|(?:\b(INR|USD|EUR|GBP)\b))?\s*([\d]+(?:[.,]\d{1,2})?)', re.I)
    item_pattern_block_qty = re.compile(r'quantity[:\-]\s*(.+)', re.I)
    item_pattern_compact = re.compile(r'^(.*?)\s*[x×]\s*(\d+)\s*(?:[^\d]*?)(?:(₹|\$|€|£)|(?:\b(INR|USD|EUR|GBP)\b))?\s*([\d]+(?:[.,]\d{1,2})?)$', re.I)
    item_pattern_direct_total = re.compile(r'^(.*?)\s*[x×]\s*(\d+)\s*(?:(₹|\$|€|£)|(?:\b(INR|USD|EUR|GBP)\b))?\s*([\d]+(?:[.,]\d{1,2})?)$', re.I)

    skip_keywords = ["address", "receipt", "invoice", "bill", "tax id", "store name",
                     "merchant", "cashier", "order", "payment", "mode", "date"]

    for i, line in enumerate(lines[:10]):
        if line.lower().startswith("store name"):
            data['merchant'] = line.split(":", 1)[-1].strip()
            break
        if not data['merchant'] and not any(k in line.lower() for k in skip_keywords):
            data['merchant'] = line

    for line in lines:
        if "date" in line.lower():
            data['date'] = line.split(":")[-1].strip()
            break
        for dp in date_patterns:
            m = dp.search(line)
            if m:
                data['date'] = m.group(1)
                break

    for line in lines:
        l = line.lower()
        m_tax = tax_pattern.search(line)
        if m_tax:
            try:
                percent = m_tax.group(1)
                symbol = m_tax.group(2)
                code = m_tax.group(3)
                amount = m_tax.group(4)
                data['tax_percent'] = float(percent) if percent else 0.0
                data['tax'] = float(amount.replace(',', '')) if amount else 0.0
                data['currency'] = normalize_currency(symbol, code)
            except:
                pass

        m = amount_pattern.search(line)
        if not m:
            continue
        symbol, code, number = m.groups()
        currency = normalize_currency(symbol, code)
        if currency:
            data['currency'] = currency
        try:
            val = float(number.replace(',', ''))
        except:
            continue
        if "subtotal" in l:
            data['subtotal'] = val
        elif "total" in l:
            data['total'] = val

    i = 0
    while i < len(lines):
        line = lines[i]
        l = line.lower()
        if any(k in l for k in skip_keywords) or "total" in l or "subtotal" in l or "tax" in l:
            i += 1
            continue

        m = item_pattern_table.match(line)
        if m:
            desc, qty_str, unit_str, total_str = m.groups()
            try:
                qty = int(qty_str)
                unit_price = float(unit_str.replace(',', ''))
                total_price = float(total_str.replace(',', ''))
                currency = data['currency']
                category = categorize_item(desc)
                data['items'].append({
                    'description': f"{desc} (x{qty} @ {currency}{unit_price:.2f})",
                    'amount': total_price,
                    'currency': currency,
                    'category': category
                })
            except:
                pass
            i += 1
            continue

        m = item_pattern_block_item.search(line)
        if m:
            desc = m.group(1).strip()
            price, qty_str = None, None
            j = i + 1
            while j < len(lines) and j <= i + 3:
                pm = item_pattern_block_price.search(lines[j])
                if pm:
                    symbol = pm.group(1)
                    code = pm.group(2)
                    currency = normalize_currency(symbol, code) or data['currency']
                    try:
                        price = float(pm.group(3).replace(',', ''))
                    except:
                        pass
                qm = item_pattern_block_qty.search(lines[j])
                if qm:
                    qty_str = qm.group(1).strip()
                j += 1
            if price is not None:
                qty = 1
                if qty_str:
                    m_qty = re.search(r'(\d+)', qty_str)
                    if m_qty:
                        qty = int(m_qty.group(1))
                total_price = qty * price
                category = categorize_item(desc)
                data['items'].append({
                    'description': f"{desc} (x{qty} @ {currency}{price:.2f})",
                    'amount': total_price,
                    'currency': currency,
                    'category': category
                })
            i = j
            continue

        m = item_pattern_compact.match(line)
        if m:
            desc, qty_str, symbol, code, price_str = m.groups()
            try:
                qty = int(qty_str)
                total_price = float(price_str.replace(',', ''))
                currency = normalize_currency(symbol, code) or data['currency']
                unit_price = total_price / qty if qty > 0 else total_price
                category = categorize_item(desc)
                data['items'].append({
                    'description': f"{desc} (x{qty} @ {currency}{unit_price:.2f})",
                    'amount': total_price,
                    'currency': currency,
                    'category': category
                })
            except:
                pass
            i += 1
            continue

        m = item_pattern_direct_total.match(line)
        if m:
            desc, qty_str, symbol, code, total_str = m.groups()
            try:
                qty = int(qty_str)
                total_price = float(total_str.replace(',', '')) if total_str else 0.0
                currency = normalize_currency(symbol, code) or data['currency']
                unit_price = total_price / qty if qty > 0 else total_price
                category = categorize_item(desc)
                data['items'].append({
                    'description': f"{desc} (x{qty} @ {currency}{unit_price:.2f})",
                    'amount': total_price,
                    'currency': currency,
                    'category': category
                })
            except:
                pass
            i += 1
            continue

        m = amount_pattern.search(line)
        if m and not any(k in l for k in skip_keywords + ["total", "subtotal", "tax"]):
            symbol, code, number = m.groups()
            currency = normalize_currency(symbol, code) or data['currency']
            try:
                price = float(number.replace(',', ''))
            except:
                price = 0.0
            desc = re.sub(r'[\d₹$€£.,]+', '', line).strip(" -:→")
            if len(desc.split()) > 0 and not desc.lower().startswith("date"):
                category = categorize_item(desc)
                data['items'].append({
                    'description': desc,
                    'amount': price,
                    'currency': currency,
                    'category': category
                })
        i += 1

    return data

def format_receipt(data):
    lines = []
    lines.append("Processed Receipt Report")
    lines.append(f"Merchant: {data.get('merchant', 'N/A')}")
    lines.append(f"Date: {data.get('date', 'N/A')}")
    currency = data.get('currency', '₹')
    lines.append(f"Total: {currency}{data.get('total', 0.0):.2f}")

    lines.append("\nItems:")
    for item in data.get('items', []):
        lines.append(f"{item.get('description', 'N/A')} - {item.get('currency', currency)}{item.get('amount', 0.0):.2f} ({item.get('category', 'uncategorized')})")

    if data.get('subtotal'):
        lines.append(f"\nSubtotal: {currency}{data.get('subtotal', 0.0):.2f}")
    if data.get('tax') or data.get('tax_percent'):
        tax_str = ""
        if data.get('tax_percent'):
            tax_str += f"{data.get('tax_percent', 0.0):.2f}%"
        if data.get('tax'):
            tax_str += f" ({currency}{data.get('tax', 0.0):.2f})"
        lines.append(f"Tax: {tax_str}")

    return "\n".join(lines)

def categorize_item(desc):
    desc_lower = desc.lower()
    categories = {
        'food & drinks': [
            'restaurant', 'grocery', 'meal', 'dinner', 'lunch', 'breakfast', 'cafe',
            'coffee', 'cappuccino', 'latte', 'espresso', 'muffin', 'pastry', 'croissant',
            'snack', 'burger', 'pizza', 'sandwich', 'cake', 'bakery', 'donut', 'cookie',
            'juice', 'beverage', 'drink', 'milk', 'apples', 'fruits', 'vegetables',
            'meat', 'chicken', 'fish', 'beef', 'pork', 'rice', 'pasta', 'noodles',
            'biryani', 'thali', 'paratha', 'samosa', 'pakora', 'tea'
        ],
        'travel & transport': [
            'taxi', 'cab', 'uber', 'ola', 'hotel', 'motel', 'resort', 'hostel', 'airbnb',
            'flight', 'airlines', 'indigo', 'emirates', 'spicejet', 'train', 'railway',
            'bus', 'metro', 'tram', 'ferry', 'toll', 'parking', 'fuel', 'diesel', 'petrol',
            'gasoline', 'car rental', 'bike rental', 'driver'
        ],
        'office & supplies': [
            'paper', 'pen', 'printer', 'stationery', 'office', 'supplies', 'notebook',
            'stapler', 'folder', 'file', 'highlighter', 'marker', 'ink', 'toner',
            'eraser', 'board', 'whiteboard', 'chair', 'desk', 'furniture'
        ],
        'utilities & bills': [
            'electricity', 'power', 'water', 'gas', 'internet', 'wifi', 'broadband',
            'phone', 'mobile', 'cell', 'bill', 'recharge', 'cable', 'dth', 'telecom',
            'airtel', 'jio', 'vodafone', 'bsnl'
        ],
        'electronics & gadgets': [
            'headphones', 'earphones', 'airpods', 'speakers', 'laptop', 'computer', 'pc',
            'desktop', 'monitor', 'keyboard', 'mouse', 'charger', 'adapter', 'mobile',
            'tablet', 'smartphone', 'tv', 'television', 'camera', 'dslr', 'microwave',
            'fridge', 'washing machine', 'ac', 'fan'
        ],
        'healthcare & pharmacy': [
            'doctor', 'hospital', 'clinic', 'pharmacy', 'chemist', 'medicine', 'tablet',
            'capsule', 'syrup', 'injection', 'surgery', 'xray', 'mri', 'scan',
            'health', 'wellness', 'dental', 'dentist', 'optical', 'eyewear', 'spectacles',
            'contact lens', 'mask', 'sanitizer', 'thermometer'
        ],
        'entertainment & media': [
            'movie', 'cinema', 'theater', 'netflix', 'prime video', 'spotify', 'youtube',
            'music', 'concert', 'game', 'gaming', 'playstation', 'xbox', 'nintendo',
            'book', 'novel', 'magazine', 'newspaper', 'event', 'show', 'ticket'
        ],
        'shopping & fashion': [
            'clothes', 'dress', 'shirt', 'tshirt', 'jeans', 'pants', 'trousers', 'jacket',
            'sweater', 'hoodie', 'kurta', 'saree', 'lehenga', 'salwar', 'shoes', 'sandals',
            'sneakers', 'boots', 'flipflops', 'bag', 'purse', 'handbag', 'wallet',
            'watch', 'belt', 'cap', 'hat', 'sunglasses', 'jewelry', 'ring', 'necklace',
            'bracelet', 'earrings', 'cosmetics', 'makeup', 'lipstick', 'perfume', 'beauty'
        ],
        'home & groceries': [
            'detergent', 'soap', 'shampoo', 'toothpaste', 'toothbrush', 'cleaner',
            'dishwash', 'floor cleaner', 'phenyl', 'mop', 'broom', 'utensil',
            'spices', 'oil', 'salt', 'sugar', 'flour', 'atta', 'dal', 'beans', 'cereal'
        ],
        'education & learning': [
            'school', 'college', 'university', 'fees', 'exam', 'coaching', 'tuition',
            'course', 'online course', 'udemy', 'coursera', 'byjus', 'textbook',
            'notebook', 'stationery', 'library', 'training', 'class','mouse'
        ],
        'personal care': [
            'salon', 'spa', 'parlor', 'barber', 'haircut', 'massage', 'facial',
            'cream', 'lotion', 'skincare', 'nail', 'manicure', 'pedicure'
        ],
        'sports & fitness': [
            'gym', 'fitness', 'workout', 'yoga', 'zumba', 'trainer', 'cricket', 'bat',
            'ball', 'football', 'basketball', 'tennis', 'racket', 'shuttle', 'jersey',
            'cycle', 'bicycle', 'helmet', 'sports shoes', 'treadmill', 'dumbbell'
        ],
        'financial services': [
            'bank', 'atm', 'loan', 'emi', 'insurance', 'mutual fund', 'policy',
            'lic', 'sip', 'investment', 'credit card', 'debit card', 'upi',
            'paytm', 'gpay', 'phonepe', 'stripe', 'paypal'
        ],
        'housing & rent': [
            'rent', 'lease', 'apartment', 'flat', 'villa', 'pg', 'guesthouse',
            'maintenance', 'society', 'property', 'brokerage'
        ],
        'others': [
            'gift', 'donation', 'charity', 'subscription', 'membership', 'miscellaneous','gym'
        ]
    }

    for cat, keywords in categories.items():
        if any(k in desc_lower for k in keywords):
            return cat
    return 'uncategorized'

@receipt_bp.route('/recent', methods=['GET'])
def get_recent_receipts():
    try:
        if expenses_collection is None:
            return jsonify({"error": "Database not initialized"}), 500
        email = request.args.get("email")
        if not email:
            return jsonify({"error": "Email is required"}), 400

        receipts = list(expenses_collection.find({"email": email}).sort("created_at", -1).limit(5))
        for receipt in receipts:
            receipt['_id'] = str(receipt['_id'])
            receipt['created_at'] = receipt.get('created_at', datetime.utcnow()).isoformat()
        return jsonify(receipts), 200
    except Exception as e:
        print(f"Error in get_recent_receipts: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to fetch recent receipts: {str(e)}"}), 500

@receipt_bp.route('/report/summary', methods=['GET'])
def expense_summary():
    try:
        if expenses_collection is None:
            return jsonify({"error": "Database not initialized"}), 500
        email = request.args.get("email")
        if not email:
            return jsonify({"error": "Email is required"}), 400

        pipeline_category = [
            {"$match": {"email": email}},
            {"$unwind": {"path": "$items", "preserveNullAndEmptyArrays": True}},
            {"$group": {"_id": {"$ifNull": ["$items.category", "uncategorized"]}, "total": {"$sum": {"$ifNull": ["$items.amount", 0]}}}},
            {"$sort": {"total": -1}}
        ]
        category_summary = list(expenses_collection.aggregate(pipeline_category))

        pipeline_merchant = [
            {"$match": {"email": email}},
            {"$group": {"_id": {"$ifNull": ["$merchant", "unknown"]}, "total": {"$sum": {"$ifNull": ["$total", 0]}}}},
            {"$sort": {"total": -1}}
        ]
        merchant_summary = list(expenses_collection.aggregate(pipeline_merchant))

        pipeline_payment = [
            {"$match": {"email": email}},
            {"$group": {"_id": {"$ifNull": ["$payment_mode", "unknown"]}, "total": {"$sum": {"$ifNull": ["$total", 0]}}}}
        ]
        payment_summary = list(expenses_collection.aggregate(pipeline_payment))

        pipeline_month = [
            {"$match": {"email": email}},
            {"$group": {"_id": {"$dateToString": {"format": "%Y-%m", "date": {"$ifNull": ["$created_at", datetime.utcnow()]}}}, "total": {"$sum": {"$ifNull": ["$total", 0]}}}},
            {"$sort": {"_id": 1}}
        ]
        monthly_summary = list(expenses_collection.aggregate(pipeline_month))

        # Get the most common currency from receipts
        pipeline_currency = [
            {"$match": {"email": email}},
            {"$group": {"_id": "$currency", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1}
        ]
        currency_result = list(expenses_collection.aggregate(pipeline_currency))
        currency = currency_result[0]["_id"] if currency_result else "₹"

        return jsonify({
            "by_category": category_summary,
            "by_merchant": merchant_summary,
            "by_payment_mode": payment_summary,
            "monthly_trend": monthly_summary,
            "currency": currency
        }), 200
    except Exception as e:
        print(f"Error in expense_summary: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to fetch summary: {str(e)}"}), 500
from flask import Blueprint, request, jsonify
from datetime import datetime
import traceback

@receipt_bp.route('/report/budget', methods=['GET'])
def budget_vs_actual():
    try:
        if expenses_collection is None:
            print("Database not initialized")
            return jsonify({"error": "Database not initialized"}), 500
        email = request.args.get("email")
        if not email:
            print("Email is required")
            return jsonify({"error": "Email is required"}), 400

        # Check if user exists
        user = expenses_collection.database["users"].find_one({"email": email})
        print(f"User found for {email}: {user is not None}")
        if not user:
            print("User not found")
            return jsonify({"error": "User not found"}), 404

        # Get user's default currency
        default_currency = user.get("default_currency", "USD")
        print(f"User default currency: {default_currency}")

        # Get the most common currency from receipts
        pipeline_currency = [
            {"$match": {"email": email}},
            {"$group": {"_id": "$currency", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1}
        ]
        currency_result = list(expenses_collection.aggregate(pipeline_currency))
        receipt_currency = normalize_currency(currency_result[0]["_id"], None) if currency_result else "INR"
        print(f"Receipt currency: {receipt_currency}")

        year = datetime.utcnow().year
        start_of_year = datetime(year, 1, 1)
        actual_total = expenses_collection.aggregate([
            {"$match": {"email": email, "created_at": {"$gte": start_of_year}}},
            {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$total", 0]}}}}
        ])
        actual_total = next(actual_total, {"total": 0})["total"]
        print(f"Actual total: {actual_total}")

        # Convert actual_total to user's default currency if necessary
        if receipt_currency != default_currency:
            try:
                rate = get_exchange_rate(receipt_currency, default_currency)
                print(f"Exchange rate {receipt_currency} to {default_currency}: {rate}")
                actual_total = actual_total * rate
            except Exception as e:
                print(f"Error converting actual total: {str(e)}")
                return jsonify({"error": f"Currency conversion failed: {str(e)}"}), 500

        monthly_budget = float(user.get("monthly_budget", 0.0))
        yearly_budget = float(user.get("yearly_budget", 0.0))
        print(f"Monthly budget: {monthly_budget}, Yearly budget: {yearly_budget}")

        data = {
            "actual": round(float(actual_total), 2),
            "monthly_budget": round(float(monthly_budget), 2),
            "yearly_budget": round(float(yearly_budget), 2),
            "status": "over" if actual_total > yearly_budget else "within",
            "currency": default_currency
        }
        return jsonify(data), 200
    except Exception as e:
        print(f"Error in budget_vs_actual: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to fetch budget data: {str(e)}"}), 500

@receipt_bp.route('/report/tax', methods=['GET'])
def tax_report():
    try:
        if expenses_collection is None:
            print("Database not initialized")
            return jsonify({"error": "Database not initialized"}), 500
        email = request.args.get("email")
        if not email:
            print("Email is required")
            return jsonify({"error": "Email is required"}), 400

        # Check if user exists
        user = expenses_collection.database["users"].find_one({"email": email})
        print(f"User found for {email}: {user is not None}")
        if not user:
            print("User not found")
            return jsonify({"error": "User not found"}), 404

        # Get user's default currency
        default_currency = user.get("default_currency", "USD")
        print(f"User default currency: {default_currency}")

        # Get the most common currency from receipts
        pipeline_currency = [
            {"$match": {"email": email}},
            {"$group": {"_id": "$currency", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1}
        ]
        currency_result = list(expenses_collection.aggregate(pipeline_currency))
        receipt_currency = normalize_currency(currency_result[0]["_id"], None) if currency_result else "INR"
        print(f"Receipt currency: {receipt_currency}")

        pipeline = [
            {"$match": {"email": email}},
            {"$group": {
                "_id": None,
                "total_tax": {"$sum": {"$ifNull": ["$tax", 0]}},
                "avg_tax_rate": {"$avg": {"$ifNull": ["$tax_percent", 0]}},
                "receipts_with_tax": {"$sum": {"$cond": [{"$gt": ["$tax", 0]}, 1, 0]}}
            }}
        ]
        result = list(expenses_collection.aggregate(pipeline))

        data = result[0] if result else {
            "total_tax": 0,
            "avg_tax_rate": 0,
            "receipts_with_tax": 0
        }
        print(f"Raw tax data: {data}")

        # Convert total_tax to user's default currency if necessary
        total_tax = float(data["total_tax"])
        if receipt_currency != default_currency:
            try:
                rate = get_exchange_rate(receipt_currency, default_currency)
                print(f"Exchange rate {receipt_currency} to {default_currency}: {rate}")
                total_tax = total_tax * rate
            except Exception as e:
                print(f"Error converting total tax: {str(e)}")
                return jsonify({"error": f"Currency conversion failed: {str(e)}"}), 500

        data = {
            "total_tax": round(total_tax, 2),
            "avg_tax_rate": round(float(data["avg_tax_rate"]), 2),
            "receipts_with_tax": data["receipts_with_tax"],
            "currency": default_currency
        }
        return jsonify(data), 200
    except Exception as e:
        print(f"Error in tax_report: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to fetch tax data: {str(e)}"}), 500

def normalize_currency(symbol, code):
    mapping = {"₹": "INR", "$": "USD", "€": "EUR", "£": "GBP"}
    reverse_mapping = {"INR": "₹", "USD": "$", "EUR": "€", "GBP": "£"}
    if symbol and symbol in mapping:
        return mapping[symbol]  # Return currency code for API
    if code:
        return code.upper()
    return "INR"  # Default to INR code
    
@receipt_bp.route('/report/forecast', methods=['GET'])
def forecast_expenses():
    try:
        if expenses_collection is None:
            return jsonify({
                "error": "Database not initialized",
                "months": [],
                "totals": [],
                "forecast_next_month": 0,
                "category_forecasts": [],
                "currency": "₹"
            }), 500

        email = request.args.get("email")
        if not email:
            return jsonify({
                "error": "Email is required",
                "months": [],
                "totals": [],
                "forecast_next_month": 0,
                "category_forecasts": [],
                "currency": "₹"
            }), 400

        # Check if user exists
        user = expenses_collection.database["users"].find_one({"email": email})
        if not user:
            return jsonify({
                "error": "User not found",
                "months": [],
                "totals": [],
                "forecast_next_month": 0,
                "category_forecasts": [],
                "currency": "₹"
            }), 404

        # Validate MongoDB connection
        try:
            expenses_collection.database.command("ping")
            print("MongoDB connection successful")
        except Exception as e:
            print(f"MongoDB connection failed: {str(e)}")
            return jsonify({
                "error": "Database connection error",
                "months": [],
                "totals": [],
                "forecast_next_month": 0,
                "category_forecasts": [],
                "currency": "₹"
            }), 500

        # Get monthly totals
        pipeline_total = [
            {"$match": {"email": email}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m", "date": {"$ifNull": ["$created_at", datetime.utcnow()]}}},
                "total": {"$sum": {"$ifNull": ["$total", 0]}}
            }},
            {"$sort": {"_id": 1}}
        ]
        monthly_data = list(expenses_collection.aggregate(pipeline_total))
        months = [d["_id"] for d in monthly_data]
        totals = [float(d["total"]) for d in monthly_data]

        # Simple moving average for forecasting
        forecast_next_month = 0
        if len(totals) >= 3:
            forecast_next_month = float(np.mean(totals[-3:]))
        elif len(totals) >= 1:
            forecast_next_month = float(totals[-1])

        # Category-wise forecasting
        pipeline_cat = [
            {"$match": {"email": email}},
            {"$unwind": {"path": "$items", "preserveNullAndEmptyArrays": True}},
            {"$group": {
                "_id": {
                    "month": {"$dateToString": {"format": "%Y-%m", "date": {"$ifNull": ["$created_at", datetime.utcnow()]}}},
                    "category": {"$ifNull": ["$items.category", "uncategorized"]}
                },
                "total": {"$sum": {"$ifNull": ["$items.amount", 0]}}
            }},
            {"$sort": {"_id.month": 1, "_id.category": 1}}
        ]
        cat_data = list(expenses_collection.aggregate(pipeline_cat))

        categories = {}
        for d in cat_data:
            cat = d["_id"]["category"]
            month = d["_id"]["month"]
            if cat not in categories:
                categories[cat] = {}
            categories[cat][month] = float(d["total"])

        all_months = sorted(set(months)) if months else []
        category_forecasts = []
        for cat, month_totals in categories.items():
            cat_totals = [month_totals.get(m, 0) for m in all_months] if all_months else []
            if not any(t > 0 for t in cat_totals):
                continue

            cat_forecast = 0
            if len(cat_totals) >= 3:
                cat_forecast = float(np.mean(cat_totals[-3:]))
            elif len(cat_totals) >= 1:
                cat_forecast = float(cat_totals[-1])

            hist_avg = float(np.mean([t for t in cat_totals if t > 0])) if any(t > 0 for t in cat_totals) else 0
            likely_overspend = cat_forecast > hist_avg * 1.2 if hist_avg > 0 else False

            category_forecasts.append({
                "category": cat,
                "forecast": round(cat_forecast, 2),
                "likely_overspend": likely_overspend
            })

        # Get the most common currency from receipts
        pipeline_currency = [
            {"$match": {"email": email}},
            {"$group": {"_id": "$currency", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1}
        ]
        currency_result = list(expenses_collection.aggregate(pipeline_currency))
        currency = currency_result[0]["_id"] if currency_result else "₹"

        data = {
            "months": months,
            "totals": [round(float(t), 2) for t in totals],
            "forecast_next_month": round(float(forecast_next_month), 2),
            "category_forecasts": sorted(category_forecasts, key=lambda x: x["forecast"], reverse=True),
            "currency": currency
        }
        return jsonify(data), 200
    except Exception as e:
        print(f"Error in forecast_expenses: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "error": f"Failed to generate forecast: {str(e)}",
            "months": [],
            "totals": [],
            "forecast_next_month": 0,
            "category_forecasts": [],
            "currency": "₹"
        }), 500

@receipt_bp.route('/overview-data', methods=['GET'])
def get_overview_data():
    try:
        if expenses_collection is None:
            return jsonify({"error": "Database not initialized"}), 500
        
        email = request.args.get("email")
        if not email:
            return jsonify({"error": "Email is required"}), 400

        # Get currency
        pipeline_currency = [
            {"$match": {"email": email}},
            {"$group": {"_id": "$currency", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1}
        ]
        currency_result = list(expenses_collection.aggregate(pipeline_currency))
        currency = currency_result[0]["_id"] if currency_result else "₹"

        # Total Spend (year-to-date)
        year = datetime.utcnow().year
        start_of_year = datetime(year, 1, 1)
        pipeline_total = [
            {"$match": {"email": email, "created_at": {"$gte": start_of_year}}},
            {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$total", 0]}}}}
        ]
        total_result = list(expenses_collection.aggregate(pipeline_total))
        total_spend = total_result[0]["total"] if total_result else 0

        # This Month's Spend
        now = datetime.utcnow()
        start_of_month = datetime(now.year, now.month, 1)
        end_of_month = datetime(now.year, now.month + 1, 1) if now.month < 12 else datetime(now.year + 1, 1, 1)
        
        pipeline_month = [
            {"$match": {"email": email, "created_at": {"$gte": start_of_month, "$lt": end_of_month}}},
            {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$total", 0]}}}}
        ]
        month_result = list(expenses_collection.aggregate(pipeline_month))
        this_month_spend = month_result[0]["total"] if month_result else 0

        # Total Receipts Count
        receipts_count = expenses_collection.count_documents({"email": email})

        # Categories Count
        pipeline_categories = [
            {"$match": {"email": email}},
            {"$unwind": {"path": "$items", "preserveNullAndEmptyArrays": True}},
            {"$group": {"_id": {"$ifNull": ["$items.category", "uncategorized"]}}},
            {"$count": "categoriesCount"}
        ]
        categories_result = list(expenses_collection.aggregate(pipeline_categories))
        categories_count = categories_result[0]["categoriesCount"] if categories_result else 0

        return jsonify({
            "totalSpend": total_spend,
            "thisMonthSpend": this_month_spend,
            "receiptsCount": receipts_count,
            "categoriesCount": categories_count,
            "currency": currency,
            "status": "success"
        }), 200

    except Exception as e:
        print(f"Error in get_overview_data: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to fetch overview data: {str(e)}"}), 500
    
    
    
@receipt_bp.route("/overview-data", methods=["GET"])
def overview_data():
    try:
        if expenses_collection is None:
            return jsonify({"error": "Database not initialized"}), 500

        email = request.args.get("email")
        if not email:
            return jsonify({"error": "Email is required"}), 400

        # Total spend
        total_spend = expenses_collection.aggregate([
            {"$match": {"email": email}},
            {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$total", 0]}}}}
        ])
        total_spend = next(total_spend, {}).get("total", 0)

        # This month spend
        now = datetime.utcnow()
        month_start = datetime(now.year, now.month, 1)
        this_month = expenses_collection.aggregate([
            {"$match": {"email": email, "created_at": {"$gte": month_start}}},
            {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$total", 0]}}}}
        ])
        this_month_spend = next(this_month, {}).get("total", 0)

        # Receipts count
        receipts_count = expenses_collection.count_documents({"email": email})

        # Distinct categories count
        categories_count = len(expenses_collection.distinct("items.category", {"email": email}))

        # Most common currency
        currency_result = list(expenses_collection.aggregate([
            {"$match": {"email": email}},
            {"$group": {"_id": "$currency", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1}
        ]))
        currency = currency_result[0]["_id"] if currency_result else "₹"

        return jsonify({
            "totalSpend": total_spend,
            "thisMonthSpend": this_month_spend,
            "receiptsCount": receipts_count,
            "categoriesCount": categories_count,
            "currency": currency
        }), 200

    except Exception as e:
        print(f"Error in overview_data: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to fetch overview data: {str(e)}"}), 500























@receipt_bp.route('/category-ratios', methods=['GET'])
def get_category_ratios():
    try:
        if expenses_collection is None:
            return jsonify({"error": "Database not initialized"}), 500
        
        email = request.args.get("email")
        if not email:
            return jsonify({"error": "Email is required"}), 400

        # Get total spending
        pipeline_total = [
            {"$match": {"email": email}},
            {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$total", 0]}}}}
        ]
        total_result = list(expenses_collection.aggregate(pipeline_total))
        total_spend = total_result[0]["total"] if total_result else 1  # Avoid division by zero

        # Get spending by category
        pipeline_category = [
            {"$match": {"email": email}},
            {"$unwind": {"path": "$items", "preserveNullAndEmptyArrays": True}},
            {"$group": {
                "_id": {"$ifNull": ["$items.category", "uncategorized"]},
                "amount": {"$sum": {"$ifNull": ["$items.amount", 0]}}
            }},
            {"$sort": {"amount": -1}}
        ]
        category_data = list(expenses_collection.aggregate(pipeline_category))

        # Calculate percentages
        category_ratios = []
        for category in category_data:
            percentage = (category["amount"] / total_spend) * 100 if total_spend > 0 else 0
            category_ratios.append({
                "category": category["_id"],
                "amount": category["amount"],
                "percentage": round(percentage, 2)
            })

        return jsonify({
            "category_ratios": category_ratios,
            "total_spend": total_spend,
            "status": "success"
        }), 200

    except Exception as e:
        print(f"Error in get_category_ratios: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to fetch category ratios: {str(e)}"}), 500
