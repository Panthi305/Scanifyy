# 📲 Scanify: A Smart Receipt Scanner & Expense Manager

🎥 **[Watch Demo Video](https://drive.google.com/file/d/1UPdpdwv-02dSAKvXMcrG6ejsncTUs_LF/view?usp=sharing)**

---

## ❓ Problem Statement (#40)

Develop a tool that:
- **Scans and digitizes receipts**
- **Automatically categorizes expenses**
- **Generates financial reports**

---

## 🧭 Overview

**Scanify** is a full-stack financial management platform that helps users **digitize, categorize, and analyze** their spending effortlessly.  
By combining **OCR-based receipt scanning**, **AI-driven expense categorization**, and **visual financial analytics**, Scanify empowers users to gain complete control over their expenses and budgets.

---

## ✨ Key Features

- **🧾 Smart Receipt Scanning (OCR)**  
  Upload your receipts and let Scanify automatically extract key details such as store name, date, total amount, and items purchased.

- **📂 Automated Expense Categorization**  
  Intelligently classifies each expense into categories (Food, Travel, Rent, Shopping, etc.).

- **💰 Budget Management**  
  Set spending limits for each category.  
  Track allocations and get **real-time overspending alerts**.

- **📊 Interactive Dashboard**  
  Visualize your spending habits with charts and graphs.  
  View category-wise breakdowns and total monthly expenses.

- **📈 Report Generation**  
  Export your transaction summary and expense trends as a **PDF financial report**.

- **📨 Integrated Contact Form**  
  Allows users to reach out directly; automatically sends acknowledgment and forwards messages to support.

- **📧 Email Automation**  
  Built-in **Gmail SMTP** integration for notifications and confirmations.

---

## ⚙️ Tech Stack

| Layer | Technologies Used |
|:------|:------------------|
| **Frontend** | React + Vite |
| **Backend** | Flask (Python), Flask-Mail, Flask-CORS |
| **Database** | MongoDB Atlas |
| **Other Tools** | OCR (Tesseract / EasyOCR), Chart.js / Recharts |

---

## 🚀 Getting Started

Follow these steps to set up the project on your local machine:

### 🔹 Clone the Repository
```bash
git clone https://github.com/yourusername/scanify.git
cd scanify

# Navigate to backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate the environment
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the Flask server
python app.py


# Open a new terminal window

# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
