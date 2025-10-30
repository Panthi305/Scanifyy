import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_mail import Mail, Message
from routes.user import user_bp
from routes.receipt import receipt_bp
from dotenv import load_dotenv
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)           

# Flask-Mail configuration from environment variables
app.config['MAIL_SERVER'] = os.getenv('SMTP_HOST', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('SMTP_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'False').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('EMAIL_USER')
app.config['MAIL_PASSWORD'] = os.getenv('EMAIL_PASS')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('FROM_EMAIL')

# Initialize Flask-Mail
mail = Mail(app)

# CORS configuration
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "https://scanify-frontend.onrender.com",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "https://1z04b690-5173.inc1.devtunnels.ms",
                "https://1z04b690-5000.inc1.devtunnels.ms"
            ]
        }
    },
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)

# Register blueprints
app.register_blueprint(user_bp, url_prefix="/api/users")
app.register_blueprint(receipt_bp, url_prefix="/api/receipt")

# Contact form endpoint
@app.route('/api/contact', methods=['POST'])
def handle_contact_form():
    try:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        message = data.get('message')

        if not name or not email or not message:
            logger.error("Missing fields in contact form: name=%s, email=%s", name, email)
            return jsonify({'success': False, 'message': 'All fields are required.'}), 400

        # Email to user 
        msg_user = Message(
            subject="Thank You for Contacting Us!",
            recipients=[email],
            body=f"Hello {name},\n\nThank you for reaching out to us. We'll get back to you soon.\n\nBest,\nSupport Team"
        )
        mail.send(msg_user)

        # Email to support
        msg_support = Message(
            subject=f"New Contact Form Submission from {name}",
            recipients=[os.getenv('EMAIL_USER')],
            body=f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}"
        )
        mail.send(msg_support)

        logger.info("Contact form submitted successfully: %s", email)
        return jsonify({'success': True, 'message': 'Message sent successfully!'}), 200

    except Exception as e:
        logger.error("Error sending email: %s", str(e))
        return jsonify({'success': False, 'message': 'Failed to send message.'}), 500

# Health check endpoint for debugging
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Backend is running'}), 200

if __name__ == "__main__":
    # Get port from environment variable or default to 5000
    port = int(os.getenv('PORT', 5000))
    logger.info("Starting Flask server on port %s", port)
    app.run(debug=True, host="0.0.0.0", port=port)