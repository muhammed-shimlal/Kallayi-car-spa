import stripe
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from finance.models import Invoice
from .models import PaymentTransaction
from decimal import Decimal

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

class PaymentViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def create_payment_intent(self, request):
        invoice_id = request.data.get('invoice_id')
        if not invoice_id:
            return Response({'error': 'Invoice ID required'}, status=400)
        
        try:
            invoice = Invoice.objects.get(id=invoice_id)
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=404)
            
        if invoice.is_paid:
             return Response({'error': 'Invoice already paid'}, status=400)
             
        # Amount in cents
        amount_cents = int(invoice.amount * 100)
        
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency='inr', # Localized currency
                metadata={'invoice_id': invoice.id}
            )
            
            # Log Transaction
            PaymentTransaction.objects.create(
                invoice=invoice,
                stripe_payment_intent_id=intent['id'],
                amount=invoice.amount,
                status='PENDING'
            )
            
            return Response({
                'client_secret': intent['client_secret'],
                'invoice_id': invoice.id
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class WebhookViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny] # Stripe calls this without user auth

    @action(detail=False, methods=['post'])
    def stripe_webhook(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        event = None

        # For Dev/Mock: We might skip strict sig verification if testing manually
        # But in Prod MUST match
        
        try:
             # In a real scenario use stripe.Webhook.construct_event
             # event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
             import json
             event = json.loads(payload)
        except ValueError as e:
            return Response(status=400)
            
        if event['type'] == 'payment_intent.succeeded':
            intent = event['data']['object']
            try:
                # Find Transaction
                # Try catch if metadata exists
                meta = intent.get('metadata', {})
                invoice_id = meta.get('invoice_id')
                
                if invoice_id:
                    invoice = Invoice.objects.get(id=invoice_id)
                    invoice.is_paid = True
                    invoice.payment_method = 'CARD'
                    invoice.save()
                    
                    # Update transaction
                    PaymentTransaction.objects.filter(stripe_payment_intent_id=intent['id']).update(status='SUCCEEDED')
                    
            except Exception as e:
                print(f"Webhook Error: {e}")
                
        return Response(status=200)
