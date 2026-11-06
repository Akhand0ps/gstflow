import uuid
from decimal import Decimal
from django.db import models


class ProductItem(models.Model):
    """
    Catalog of Goods and Services sold or purchased, tagged with HSN/SAC codes
    and official GST tax slabs.
    """
    ITEM_TYPES = (
        ('GOODS', 'Goods (HSN)'),
        ('SERVICE', 'Services (SAC)'),
    )

    GST_SLABS = (
        (Decimal('0.00'), '0% (Nil / Exempt)'),
        (Decimal('0.25'), '0.25% (Diamonds / Precious stones)'),
        (Decimal('3.00'), '3% (Gold / Silver)'),
        (Decimal('5.00'), '5% (Essential goods / Transport)'),
        (Decimal('12.00'), '12% (Standard I)'),
        (Decimal('18.00'), '18% (Standard II / IT / SaaS)'),
        (Decimal('28.00'), '28% (Luxury / Automobiles)'),
    )

    UQC_UNITS = (
        ('NOS', 'Numbers (NOS)'),
        ('PCS', 'Pieces (PCS)'),
        ('KGS', 'Kilograms (KGS)'),
        ('MTR', 'Meters (MTR)'),
        ('BOX', 'Boxes (BOX)'),
        ('SET', 'Sets (SET)'),
        ('OTH', 'Other / Service (OTH)'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item_type = models.CharField(max_length=10, choices=ITEM_TYPES, default='SERVICE')
    name = models.CharField(max_length=255)
    hsn_sac_code = models.CharField(max_length=8, help_text="4/6-digit HSN code for goods or 6-digit SAC starting with 99 for services")
    description = models.TextField(blank=True)
    uqc_unit = models.CharField(max_length=10, choices=UQC_UNITS, default='OTH')
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, choices=GST_SLABS, default=Decimal('18.00'))
    cess_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    
    stock_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} [{self.hsn_sac_code}] - {self.gst_rate}%"
