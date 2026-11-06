import uuid
from django.db import models
from common.gst_utils import verify_gstin, get_state_name_from_gstin


class Party(models.Model):
    """
    Represents Customers (debtors) or Vendors/Suppliers (creditors).
    """
    PARTY_TYPES = (
        ('CUSTOMER', 'Customer (Buyer)'),
        ('VENDOR', 'Vendor (Supplier)'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    party_type = models.CharField(max_length=10, choices=PARTY_TYPES, default='CUSTOMER')
    legal_name = models.CharField(max_length=255, help_text="Legal name or individual name")
    trade_name = models.CharField(max_length=255, blank=True)
    gstin = models.CharField(max_length=15, blank=True, help_text="15-character GSTIN (Leave empty for unregistered consumer)")
    pan = models.CharField(max_length=10, blank=True)
    state_code = models.CharField(max_length=2, help_text="2-digit Place of Supply state code")
    state_name = models.CharField(max_length=100)
    is_registered = models.BooleanField(default=False, help_text="True if party holds active GSTIN")
    
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    billing_address = models.TextField()
    shipping_address = models.TextField(blank=True)
    pincode = models.CharField(max_length=6, blank=True)

    opening_balance = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    current_balance = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Parties"
        ordering = ['legal_name']

    def clean(self):
        super().clean()
        if self.gstin:
            self.gstin = self.gstin.strip().upper()
            self.is_registered = True
            if not self.state_code:
                self.state_code = self.gstin[:2]
                self.state_name = get_state_name_from_gstin(self.gstin)
            if not self.pan and len(self.gstin) >= 12:
                self.pan = self.gstin[2:12]
        else:
            self.is_registered = False

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        reg = f" - {self.gstin}" if self.gstin else " (Unregistered)"
        return f"{self.trade_name or self.legal_name}{reg} [{self.party_type}]"
