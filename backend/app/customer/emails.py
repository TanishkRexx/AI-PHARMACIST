import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.database import get_database # your db connector

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

EMAIL = "your_email@gmail.com"        # sender email
PASSWORD = "your_app_password_here"   # app password


async def send_notification_email_by_user_id(user_id: str, subject: str, message: str):
    try:
        db = get_database()

        # 🔍 Get user from DB
        user = await db["users"].find_one({"_id": user_id})

        if not user:
            print("User not found")
            return False

        to_email = user.get("email")

        if not to_email:
            print("User has no email")
            return False

        # 📧 Build email
        msg = MIMEMultipart()
        msg["From"] = EMAIL
        msg["To"] = to_email
        msg["Subject"] = subject

        msg.attach(MIMEText(message, "plain"))

        # 🚀 Send email
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL, PASSWORD)
        server.send_message(msg)
        server.quit()

        print(f"Email sent to {to_email}")
        return True

    except Exception as e:
        print("Email Error:", e)
        return False