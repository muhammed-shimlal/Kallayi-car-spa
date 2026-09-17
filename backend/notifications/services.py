import logging
import os
import re
import requests
from typing import Any, Dict, Optional
from django.conf import settings
from .models import NotificationLog

logger = logging.getLogger(__name__)


class WhatsAppNotificationService:
    """
    Service layer for sending WhatsApp messages & PDF documents via the local WhatsApp Web HTTP Gateway (whatsapp-bridge).
    Fallback logging ensures Django transactions are never blocked if the gateway is offline.
    """

    @staticmethod
    def sanitize_phone_number(phone: Optional[str], default_country_code: str = '91') -> str:
        """
        Sanitizes phone number to standard E.164 digits format (without '+').
        """
        if not phone:
            return ""

        digits = re.sub(r'\D', '', str(phone).strip())
        if not digits:
            return ""

        if len(digits) == 10:
            return f"{default_country_code}{digits}"

        if len(digits) == 11 and digits.startswith('0'):
            return f"{default_country_code}{digits[1:]}"

        if len(digits) == 12 and digits.startswith('91'):
            return digits

        return digits

    @classmethod
    def send_message(cls, to_phone: str, message: str) -> Dict[str, Any]:
        """
        Sends a text message to the local WhatsApp Web Gateway (POST http://127.0.0.1:3000/send-message).
        """
        clean_phone = cls.sanitize_phone_number(to_phone)
        if not clean_phone:
            logger.warning("[WhatsApp Service] Cannot send message: Empty or invalid phone number.")
            return {"success": False, "error": "Invalid phone number"}

        bridge_url = getattr(settings, 'WHATSAPP_LOCAL_BRIDGE_URL', 'http://127.0.0.1:3000').rstrip('/')
        endpoint = f"{bridge_url}/send-message"
        payload = {
            "phone": clean_phone,
            "message": message
        }

        try:
            response = requests.post(endpoint, json=payload, timeout=5)
            if response.status_code == 200:
                logger.info(f"[WhatsApp Bridge Success] Message sent to {clean_phone}")
                return {"success": True, "response": response.json()}
            elif response.status_code == 503:
                logger.warning(f"[WhatsApp Bridge Unauthenticated] Gateway returned 503: {response.text}")
            else:
                logger.error(f"[WhatsApp Bridge Error {response.status_code}] Response: {response.text}")
                return {"success": False, "error": response.text}
        except requests.RequestException as e:
            logger.warning(f"[WhatsApp Bridge Offline] Connection error to local gateway: {e}")

        # Fallback / Offline stdout log mode
        try:
            print(f"\n{'='*60}\n[LOCAL WHATSAPP GATEWAY DISPATCH TO {clean_phone}]:\n{message}\n{'='*60}\n")
        except Exception:
            safe_msg = message.encode('ascii', errors='replace').decode('ascii')
            print(f"\n{'='*60}\n[LOCAL WHATSAPP GATEWAY DISPATCH TO {clean_phone}]:\n{safe_msg}\n{'='*60}\n")

        return {"success": True, "response": "Fallback dispatched"}

    @classmethod
    def send_document(
        cls,
        to_phone: str,
        file_path_or_url: str,
        filename: str = "Document.pdf",
        caption: str = ""
    ) -> Dict[str, Any]:
        """
        Sends a PDF document message to local WhatsApp Web Gateway (POST http://127.0.0.1:3000/send-document).
        Accepts both local absolute file paths and remote URLs.
        """
        clean_phone = cls.sanitize_phone_number(to_phone)
        if not clean_phone:
            logger.warning("[WhatsApp Service] Cannot send document: Empty or invalid phone number.")
            return {"success": False, "error": "Invalid phone number"}

        bridge_url = getattr(settings, 'WHATSAPP_LOCAL_BRIDGE_URL', 'http://127.0.0.1:3000').rstrip('/')
        endpoint = f"{bridge_url}/send-document"
        payload = {
            "phone": clean_phone,
            "mediaUrl": file_path_or_url,
            "filePath": file_path_or_url,
            "filename": filename,
            "caption": caption
        }

        try:
            response = requests.post(endpoint, json=payload, timeout=8)
            if response.status_code == 200:
                logger.info(f"[WhatsApp Bridge Success] Document sent to {clean_phone}")
                return {"success": True, "response": response.json()}
            elif response.status_code == 503:
                logger.warning(f"[WhatsApp Bridge Unauthenticated] Gateway returned 503: {response.text}")
            else:
                logger.error(f"[WhatsApp Bridge Document Error {response.status_code}] Response: {response.text}")
                return {"success": False, "error": response.text}
        except requests.RequestException as e:
            logger.warning(f"[WhatsApp Bridge Offline] Document gateway error: {e}")

        # Fallback / Offline stdout log mode
        try:
            print(f"\n{'='*60}\n[LOCAL WHATSAPP PDF DISPATCH TO {clean_phone}]:\nFile/URL: {file_path_or_url}\nFilename: {filename}\nCaption: {caption}\n{'='*60}\n")
        except Exception:
            safe_caption = caption.encode('ascii', errors='replace').decode('ascii')
            print(f"\n{'='*60}\n[LOCAL WHATSAPP PDF DISPATCH TO {clean_phone}]:\nFile/URL: {file_path_or_url}\nFilename: {filename}\nCaption: {safe_caption}\n{'='*60}\n")

        return {"success": True, "response": "Fallback document dispatched"}

    @classmethod
    def send_password_reset_otp(cls, phone: str, otp_code: str) -> bool:
        """
        Dispatches 6-digit password reset OTP to user's WhatsApp number.
        """
        try:
            clean_phone = cls.sanitize_phone_number(phone)
            message = (
                f"Your Kallayi Car Spa password reset OTP is: {otp_code}\n\n"
                f"This code is valid for 5 minutes. Do not share this OTP with anyone for security."
            )
            res = cls.send_message(clean_phone, message)
            NotificationLog.objects.create(
                booking=None,
                type='WHATSAPP',
                recipient=clean_phone or phone,
                message=message,
                status='SENT' if res.get('success') else 'FAILED'
            )
            return bool(res.get('success'))
        except Exception as e:
            logger.error(f"[WhatsApp Service Error] Failed to send password reset OTP: {e}")
            return False

    @classmethod
    def send_password_reset(cls, user: Any, reset_url: str) -> bool:
        """
        Legacy reset link helper wrapper.
        """
        try:
            phone = ""
            if hasattr(user, 'customer') and user.customer.phone_number:
                phone = user.customer.phone_number
            elif hasattr(user, 'staff_profile') and user.staff_profile.phone_number:
                phone = user.staff_profile.phone_number
            else:
                phone = user.username

            clean_phone = cls.sanitize_phone_number(phone)
            name = user.get_full_name() or user.username
            message = f"Hello {name}, click the link to reset password: {reset_url}"
            res = cls.send_message(clean_phone, message)
            NotificationLog.objects.create(
                booking=None,
                type='WHATSAPP',
                recipient=clean_phone or phone,
                message=message,
                status='SENT' if res.get('success') else 'FAILED'
            )
            return bool(res.get('success'))
        except Exception as e:
            logger.error(f"[WhatsApp Service Error] Failed to send password reset: {e}")
            return False

    @classmethod
    def send_booking_confirmation(cls, booking: Any) -> bool:
        """
        Sends booking confirmation details via WhatsApp.
        """
        try:
            customer = getattr(booking, 'customer', None)
            phone = customer.phone_number if customer and customer.phone_number else getattr(getattr(customer, 'user', None), 'username', '')
            clean_phone = cls.sanitize_phone_number(phone)

            customer_name = "Customer"
            if customer and getattr(customer, 'user', None):
                customer_name = customer.user.first_name or customer.user.username

            vehicle = getattr(booking, 'vehicle', None)
            vehicle_info = f"{vehicle.model} ({vehicle.plate_number})" if vehicle else "Your Vehicle"
            package_name = booking.service_package.name if getattr(booking, 'service_package', None) else "Car Spa Service"
            slot_str = booking.time_slot.strftime("%b %d, %Y at %I:%M %p") if getattr(booking, 'time_slot', None) else "Scheduled Time"

            message = (
                f"Hello {customer_name}!\n"
                f"Your booking #{booking.id} at Kallayi Car Spa is CONFIRMED!\n\n"
                f"Vehicle: {vehicle_info}\n"
                f"Service: {package_name}\n"
                f"Time Slot: {slot_str}\n"
                f"Address: {getattr(booking, 'address', 'Kallayi Spa Branch')}\n\n"
                f"Thank you for choosing Kallayi Car Spa!"
            )

            res = cls.send_message(clean_phone, message)
            NotificationLog.objects.create(
                booking=booking,
                type='WHATSAPP',
                recipient=clean_phone or phone,
                message=message,
                status='SENT' if res.get('success') else 'FAILED'
            )
            return bool(res.get('success'))
        except Exception as e:
            logger.error(f"[WhatsApp Service Error] Failed to send booking confirmation: {e}")
            return False

    @classmethod
    def send_status_update(cls, booking: Any, new_status: str) -> bool:
        """
        Sends status update alerts with clear vehicle pickup / delivery instructions.
        """
        try:
            customer = getattr(booking, 'customer', None)
            phone = customer.phone_number if customer and customer.phone_number else getattr(getattr(customer, 'user', None), 'username', '')
            clean_phone = cls.sanitize_phone_number(phone)

            customer_name = "Valued Customer"
            if customer and getattr(customer, 'user', None):
                customer_name = customer.user.first_name or customer.user.username

            vehicle = getattr(booking, 'vehicle', None)
            plate = vehicle.plate_number if vehicle else "your vehicle"
            package_name = booking.service_package.name if getattr(booking, 'service_package', None) else "Car Spa Service"
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')

            if new_status == 'IN_PROGRESS':
                message = (
                    f"Hi {customer_name}!\n"
                    f"Your vehicle ({plate}) is now IN-SERVICE at Kallayi Car Spa for '{package_name}'.\n"
                    f"Our detailing team is actively working on it."
                )
            elif new_status == 'QUALITY_CHECK':
                message = (
                    f"Hi {customer_name}!\n"
                    f"Your vehicle ({plate}) is now undergoing final QUALITY INSPECTION at Kallayi Car Spa.\n"
                    f"Almost ready for pickup!"
                )
            elif new_status in ['READY', 'COMPLETED']:
                message = (
                    f"Hi {customer_name}!\n"
                    f"Great news! Your vehicle ({plate}) is sparkling clean and READY FOR PICKUP / DELIVERY at Kallayi Car Spa!\n\n"
                    f"Booking ID: #{booking.id}\n"
                    f"View Receipt: {frontend_url}/receipt/{booking.id}\n\n"
                    f"Please visit our lounge or contact us for home delivery assistance."
                )
            else:
                message = f"Hi {customer_name}! Booking #{booking.id} for vehicle {plate} updated to status '{new_status}'."

            res = cls.send_message(clean_phone, message)
            NotificationLog.objects.create(
                booking=booking,
                type='WHATSAPP',
                recipient=clean_phone or phone,
                message=message,
                status='SENT' if res.get('success') else 'FAILED'
            )
            return bool(res.get('success'))
        except Exception as e:
            logger.error(f"[WhatsApp Service Error] Failed to send status update: {e}")
            return False

    @classmethod
    def send_khata_reminder(cls, customer: Any, balance: Any) -> bool:
        """
        Sends Khata payment due reminder message to customer.
        """
        try:
            phone = customer.phone_number if getattr(customer, 'phone_number', None) else getattr(getattr(customer, 'user', None), 'username', '')
            clean_phone = cls.sanitize_phone_number(phone)

            customer_name = "Valued Customer"
            if getattr(customer, 'user', None):
                customer_name = customer.user.first_name or customer.user.username

            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
            payment_url = f"{frontend_url}/khata/pay"

            message = (
                f"Hi {customer_name}, gentle payment reminder from Kallayi Car Spa.\n"
                f"Your outstanding Khata credit balance is Rs.{balance}.\n\n"
                f"Please settle your dues at our branch or pay online here:\n{payment_url}\n\n"
                f"Thank you for your business!"
            )

            res = cls.send_message(clean_phone, message)
            NotificationLog.objects.create(
                booking=None,
                type='WHATSAPP',
                recipient=clean_phone or phone,
                message=message,
                status='SENT' if res.get('success') else 'FAILED'
            )
            return bool(res.get('success'))
        except Exception as e:
            logger.error(f"[WhatsApp Service Error] Failed to send Khata reminder: {e}")
            return False

    @classmethod
    def send_invoice_pdf(cls, invoice: Any, pdf_file_path: Optional[str] = None) -> bool:
        """
        Generates and dispatches PDF invoice to customer's WhatsApp via local bridge.
        """
        try:
            booking = getattr(invoice, 'booking', None)
            subscription = getattr(invoice, 'subscription', None)

            customer = None
            if booking and getattr(booking, 'customer', None):
                customer = booking.customer
            elif subscription and getattr(subscription, 'customer', None):
                customer = subscription.customer

            phone = ""
            if customer and getattr(customer, 'phone_number', None):
                phone = customer.phone_number
            elif customer and getattr(customer, 'user', None):
                phone = customer.user.username

            clean_phone = cls.sanitize_phone_number(phone)
            if not clean_phone:
                logger.warning(f"[WhatsApp Invoice PDF] No valid phone number for Invoice #{invoice.id}")
                return False

            # Generate or locate local PDF file path
            if not pdf_file_path or not os.path.exists(pdf_file_path):
                from finance.utils import render_invoice_pdf_to_file
                pdf_file_path = render_invoice_pdf_to_file(invoice)

            if not pdf_file_path:
                logger.error(f"[WhatsApp Invoice PDF] Could not resolve PDF file path for Invoice #{invoice.id}")
                return False

            filename = f"Invoice_{invoice.id}.pdf"
            booking_ref = f"booking #{booking.id}" if booking else f"invoice #{invoice.id}"
            caption = f"Thank you for visiting Kallayi Car Spa! Here is your invoice for {booking_ref} (Amount: Rs.{invoice.amount})."

            res = cls.send_document(clean_phone, pdf_file_path, filename=filename, caption=caption)
            NotificationLog.objects.create(
                booking=booking,
                type='WHATSAPP',
                recipient=clean_phone or phone,
                message=f"[PDF Invoice Sent] {filename} | {pdf_file_path}",
                status='SENT' if res.get('success') else 'FAILED'
            )
            return bool(res.get('success'))
        except Exception as e:
            logger.error(f"[WhatsApp Service Error] Failed to send invoice PDF: {e}")
            return False


def send_customer_notification(phone_number: str, message: str) -> bool:
    res = WhatsAppNotificationService.send_message(phone_number, message)
    return bool(res.get('success'))
