import uuid
from django.db import models
from django.contrib.auth.models import User
from common.gst_utils import verify_gstin, get_state_name_from_gstin


class BusinessProfile(models.Model):
    """
    Core taxpayer entity details. Maps to the registered GSTIN holder.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='business_profile', null=True, blank=True)
    legal_name = models.CharField(max_length=255, help_text="Legal name as registered on GST portal")
    trade_name = models.CharField(max_length=255, blank=True, help_text="Trade / Brand name")
    gstin = models.CharField(max_length=15, unique=True, help_text="15-character GSTIN")
    state_code = models.CharField(max_length=2, help_text="2-digit Census State Code (e.g., 27 for MH)")
    state_name = models.CharField(max_length=100)
    pan = models.CharField(max_length=10, blank=True, help_text="10-character Permanent Account Number")
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(help_text="Principal place of business address")
    pincode = models.CharField(max_length=6, blank=True)
    annual_turnover = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    is_composition_scheme = models.BooleanField(default=False)
    
    # Banking details printed on tax invoices
    bank_name = models.CharField(max_length=100, blank=True)
    bank_account_number = models.CharField(max_length=50, blank=True)
    bank_ifsc = models.CharField(max_length=20, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        super().clean()
        if self.gstin:
            self.gstin = self.gstin.strip().upper()
            if not self.state_code and len(self.gstin) >= 2:
                self.state_code = self.gstin[:2]
                self.state_name = get_state_name_from_gstin(self.gstin)
            if not self.pan and len(self.gstin) >= 12:
                self.pan = self.gstin[2:12]

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.trade_name or self.legal_name} ({self.gstin})"
