from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
from db import users_collection
from bson import ObjectId
from os import getenv
import logging
import requests

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

user_bp = Blueprint('users', __name__)

def get_exchange_rate(from_currency, to_currency):
    """
    Fetch exchange rate between two currencies.
    Uses open.er-api.com for live rates.
    """
    try:
        api_url = f'https://open.er-api.com/v6/latest/{from_currency}'
        resp = requests.get(api_url)
        resp.raise_for_status()
        data = resp.json()
        if 'rates' not in data or to_currency not in data['rates']:
            raise ValueError('Invalid currency in rates')
        rate = data['rates'][to_currency]
        logger.debug('Exchange rate %s->%s: %s', from_currency, to_currency, rate)
        return float(rate)
    except Exception as e:
        logger.error('Could not fetch exchange rate: %s', str(e))
        raise RuntimeError(f"Exchange rate fetch failed: {str(e)}")

@user_bp.route('/convert-currency', methods=['POST'])
def convert_currency():
    try:
        data = request.get_json()
        from_currency = data['from_currency']
        to_currency = data['to_currency']
        amount = float(data['amount'])
        rate = get_exchange_rate(from_currency, to_currency)
        converted = round(amount * rate, 2)
        return jsonify({'converted': converted}), 200
    except Exception as e:
        logger.error("Currency conversion error: %s", str(e))
        return jsonify({'message': f'Error converting currency: {str(e)}'}), 400

@user_bp.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        if not data:
            logger.error("No input data provided for signup")
            return jsonify({'message': 'No input data provided'}), 400
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        if not username or not email or not password:
            logger.error("Missing required fields: username=%s, email=%s", username, email)
            return jsonify({'message': 'Missing required fields'}), 400
        if users_collection.find_one({'email': email}):
            logger.warning("Email already exists: %s", email)
            return jsonify({'message': 'Email already exists'}), 400
        hashed_pw = generate_password_hash(password)
        user = {
            'username': username,
            'email': email,
            'password': hashed_pw,
            'created_at': datetime.utcnow(),
            'profile_completed': False,
            'name': username,
            'phone': '',
            'avatar': 'https://i.pravatar.cc/150?img=12',
            'dob': '',
            'gender': '',
            'address': '',
            'default_currency': 'USD',
            'monthly_budget': 0.0,
            'yearly_budget': 0.0,
            'preferred_categories': [],
            'tax_id': '',
            'emergency_phone': '',
            'language_preference': 'en',
            'notifications': {'email': True, 'sms': False},
            'budget_preferences': {
                'food & drinks': 0.0,
                'travel & transport': 0.0,
                'office & supplies': 0.0,
                'utilities & bills': 0.0,
                'electronics & gadgets': 0.0,
                'healthcare & pharmacy': 0.0,
                'entertainment & media': 0.0,
                'shopping & fashion': 0.0,
                'home & groceries': 0.0,
                'education & learning': 0.0,
                'personal care': 0.0,
                'sports & fitness': 0.0,
                'financial services': 0.0,
                'housing & rent': 0.0,
                'others': 0.0
            }
        }
        users_collection.insert_one(user)
        logger.info("User created successfully: %s", email)
        return jsonify({'message': 'User created successfully'}), 201
    except Exception as e:
        logger.error("Error during signup: %s", str(e))
        return jsonify({'message': f'Error during signup: {str(e)}'}), 500

@user_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            logger.error("No input data provided for login")
            return jsonify({'message': 'No input data provided'}), 400
        email = data.get('email')
        password = data.get('password')
        if not email or not password:
            logger.error("Missing required fields: email=%s", email)
            return jsonify({'message': 'Missing required fields'}), 400
        user = users_collection.find_one({'email': email})
        if not user or not check_password_hash(user['password'], password):
            logger.warning("Invalid credentials for email: %s", email)
            return jsonify({'message': 'Invalid credentials'}), 401
        jwt_secret = getenv('JWT_SECRET_KEY')
        if not jwt_secret:
            logger.error("JWT_SECRET_KEY not set")
            return jsonify({'message': 'Server configuration error: JWT_SECRET_KEY missing'}), 500
        token = jwt.encode(
            {
                'user_id': str(user['_id']),
                'exp': datetime.utcnow() + timedelta(hours=24)
            },
            jwt_secret,
            algorithm='HS256'
        )
        logger.info("User logged in: %s", email)
        return jsonify({'token': token}), 200
    except Exception as e:
        logger.error("Error during login: %s", str(e))
        return jsonify({'message': f'Error during login: {str(e)}'}), 500

@user_bp.route('/me', methods=['GET'])
def get_user():
    try:
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            logger.warning("Token missing or invalid")
            return jsonify({'message': 'Token missing or invalid'}), 401
        token = token.split(' ')[1]
        jwt_secret = getenv('JWT_SECRET_KEY')
        if not jwt_secret:
            logger.error("JWT_SECRET_KEY not set")
            return jsonify({'message': 'Server configuration error: JWT_SECRET_KEY missing'}), 500
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            logger.warning("Invalid token")
            return jsonify({'message': 'Invalid token'}), 401
        user_id = ObjectId(payload['user_id'])
        user = users_collection.find_one({'_id': user_id})
        if not user:
            logger.warning("User not found: %s", user_id)
            return jsonify({'message': 'User not found'}), 404
        logger.info("User fetched: %s", user['email'])
        return jsonify({
            '_id': str(user['_id']),
            'username': user.get('username', ''),
            'name': user.get('name', user.get('username', '')),
            'email': user.get('email', ''),
            'phone': user.get('phone', ''),
            'joined': user['created_at'].strftime('%Y-%m-%d'),
            'avatar': user.get('avatar', 'https://i.pravatar.cc/150?img=12'),
            'dob': user.get('dob', ''),
            'gender': user.get('gender', ''),
            'address': user.get('address', ''),
            'default_currency': user.get('default_currency', 'USD'),
            'monthly_budget': float(user.get('monthly_budget', 0.0)),
            'yearly_budget': float(user.get('yearly_budget', 0.0)),
            'preferred_categories': user.get('preferred_categories', []),
            'tax_id': user.get('tax_id', ''),
            'emergency_phone': user.get('emergency_phone', ''),
            'language_preference': user.get('language_preference', 'en'),
            'notifications': user.get('notifications', {'email': True, 'sms': False}),
            'profile_completed': user.get('profile_completed', False),
            'budget_preferences': user.get('budget_preferences', {
                'food & drinks': 0.0,
                'travel & transport': 0.0,
                'office & supplies': 0.0,
                'utilities & bills': 0.0,
                'electronics & gadgets': 0.0,
                'healthcare & pharmacy': 0.0,
                'entertainment & media': 0.0,
                'shopping & fashion': 0.0,
                'home & groceries': 0.0,
                'education & learning': 0.0,
                'personal care': 0.0,
                'sports & fitness': 0.0,
                'financial services': 0.0,
                'housing & rent': 0.0,
                'others': 0.0
            })
        }), 200
    except Exception as e:
        logger.error("Error fetching user: %s", str(e))
        return jsonify({'message': f'Error fetching user: {str(e)}'}), 500

@user_bp.route('/me', methods=['PUT'])
def update_user():
    try:
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            logger.warning("Token missing or invalid")
            return jsonify({'message': 'Token missing or invalid'}), 401
        token = token.split(' ')[1]
        jwt_secret = getenv('JWT_SECRET_KEY')
        if not jwt_secret:
            logger.error("JWT_SECRET_KEY not set")
            return jsonify({'message': 'Server configuration error: JWT_SECRET_KEY missing'}), 500
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            logger.warning("Invalid token")
            return jsonify({'message': 'Invalid token'}), 401
        user_id = ObjectId(payload['user_id'])
        user = users_collection.find_one({'_id': user_id})
        if not user:
            logger.warning("User not found: %s", user_id)
            return jsonify({'message': 'User not found'}), 404
        data = request.get_json()
        if not data:
            logger.error("No input data provided for update")
            return jsonify({'message': 'No input data provided'}), 400
        update_data = {}

        # Track currency change for conversion
        old_currency = user.get('default_currency', 'USD')
        new_currency = data.get('default_currency', old_currency)

        # Define allowed fields, including new fields from schema
        allowed_fields = [
            'name', 'email', 'phone', 'avatar', 'dob', 'gender', 'address',
            'default_currency', 'monthly_budget', 'yearly_budget', 'preferred_categories',
            'tax_id', 'emergency_phone', 'language_preference', 'notifications', 'budget_preferences'
        ]

        # Validate and process each field
        for field in allowed_fields:
            if field in data:
                if field in ['monthly_budget', 'yearly_budget']:
                    try:
                        update_data[field] = float(data[field])
                    except (ValueError, TypeError):
                        logger.error("Invalid value for %s: %s", field, data[field])
                        return jsonify({'message': f'Invalid value for {field}'}), 400
                elif field == 'email' and data[field] != user['email']:
                    if users_collection.find_one({'email': data[field]}):
                        logger.warning("Email already exists: %s", data[field])
                        return jsonify({'message': 'Email already exists'}), 400
                    update_data[field] = data[field]
                elif field == 'avatar':
                    if data[field] is None or data[field] == 'https://i.pravatar.cc/150?img=12' or str(data[field]).startswith('data:image/'):
                        update_data[field] = data[field]
                    else:
                        logger.error("Invalid avatar format: %s", str(data[field])[:50] if data[field] else 'None')
                        return jsonify({'message': 'Invalid avatar image format'}), 400
                elif field == 'budget_preferences':
                    # Validate budget_preferences structure
                    expected_keys = [
                        'food & drinks', 'travel & transport', 'office & supplies', 'utilities & bills',
                        'electronics & gadgets', 'healthcare & pharmacy', 'entertainment & media',
                        'shopping & fashion', 'home & groceries', 'education & learning',
                        'personal care', 'sports & fitness', 'financial services', 'housing & rent', 'others'
                    ]
                    if not isinstance(data[field], dict) or not all(k in expected_keys for k in data[field].keys()):
                        logger.error("Invalid budget_preferences structure: %s", str(data[field]))
                        return jsonify({'message': 'Invalid budget_preferences structure'}), 400
                    try:
                        update_data[field] = {k: float(v) for k, v in data[field].items()}
                    except (ValueError, TypeError):
                        logger.error("Invalid values in budget_preferences: %s", str(data[field]))
                        return jsonify({'message': 'Invalid values in budget_preferences'}), 400
                elif field == 'preferred_categories':
                    if not isinstance(data[field], list):
                        logger.error("Invalid preferred_categories format: %s", str(data[field]))
                        return jsonify({'message': 'Invalid preferred_categories format'}), 400
                    update_data[field] = data[field]
                elif field == 'notifications':
                    if not isinstance(data[field], dict) or not all(k in ['email', 'sms'] for k in data[field].keys()):
                        logger.error("Invalid notifications structure: %s", str(data[field]))
                        return jsonify({'message': 'Invalid notifications structure'}), 400
                    update_data[field] = data[field]
                else:
                    update_data[field] = data[field]

        # Handle currency conversion if default_currency changes
        if 'default_currency' in data and new_currency != old_currency:
            try:
                rate = get_exchange_rate(old_currency, new_currency)
                # Convert budgets
                monthly_budget = user.get('monthly_budget', 0.0)
                yearly_budget = user.get('yearly_budget', 0.0)
                update_data['monthly_budget'] = round(float(monthly_budget) * rate, 2)
                update_data['yearly_budget'] = round(float(yearly_budget) * rate, 2)
                # Convert budget_preferences if present
                if 'budget_preferences' not in data:
                    budget_prefs = user.get('budget_preferences', {})
                    update_data['budget_preferences'] = {k: round(float(v) * rate, 2) for k, v in budget_prefs.items()}
                logger.info("Converted budgets from %s to %s: monthly=%s, yearly=%s, preferences=%s",
                            old_currency, new_currency,
                            update_data['monthly_budget'], update_data['yearly_budget'],
                            update_data.get('budget_preferences', {}))
            except Exception as e:
                logger.error("Currency conversion failed: %s", str(e))
                return jsonify({'message': f'Currency conversion failed: {str(e)}'}), 500

        # Update profile_completed based on required fields
        required_fields = ['name', 'email', 'default_currency']
        profile_completed = all(
            update_data.get(field, user.get(field)) for field in required_fields
        ) and user.get('profile_completed', False) or all(
            data.get(field) for field in required_fields if field in data
        )
        update_data['profile_completed'] = profile_completed

        if update_data:
            users_collection.update_one({'_id': user_id}, {'$set': update_data})
        logger.info("Profile updated for user: %s", user['email'])
        return jsonify({'message': 'Profile updated successfully'}), 200

    except Exception as e:
        logger.error("Error updating profile: %s", str(e))
        return jsonify({'message': f'Error updating profile: {str(e)}'}), 500