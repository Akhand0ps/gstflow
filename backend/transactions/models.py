import uuid
from decimal import Decimal
from django.db import models
from parties.models import Party
from catalog.models import ProductItem
from authentication.models import BusinessProfile
from common.gst_utils import (
    STATE_CODES,
    round_currency,
    round_statutory_rupee,
    amount_to_indian_words
)


class Invoice(models.Model):
    """
    Statutory Tax Invoice complying with Rule 46 of CGST Rules 2017.
    Supports Sales (Outward Supply) and Purchase (Inward Supply for ITC).
    """
    INVOICE_TYPES = (
        ('SALES', 'Sales (Tax Invoice / Outward)'),
        ('PURCHASE', 'Purchase (Bill / Inward Supply)'),
    )

    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('ISSUED', 'Issued / Final'),
        ('PAID', 'Paid'),
        ('CANCELLED', 'Cancelled'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_type = models.CharField(max_length=10, choices=INVOICE_TYPES, default='SALES')
    invoice_number = models.CharField(max_length=20, unique=True, help_text="Consecutive serial number under Rule 46 (e.g. INV/2026-27/0001)")
    invoice_date = models.DateField(help_text="Date of issue")
    
    party = models.ForeignKey(Party, on_delete=models.PROTECT, related_name='invoices')
    place_of_supply_state_code = models.CharField(max_length=2, help_text="2-digit Place of Supply state code")
    place_of_supply_state_name = models.CharField(max_length=100)
    is_inter_state = models.BooleanField(default=False, help_text="True if POS != Supplier state (attracts IGST)")
    is_reverse_charge = models.BooleanField(default=False, help_text="Section 9(3) / 9(4) Reverse Charge Mechanism")

    total_taxable_value = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    total_cgst = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    total_sgst = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    total_igst = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    total_cess = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    
    # Section 170 CGST Act Statutory Rounding
    round_off_amount = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    grand_total = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    grand_total_words = models.TextField(blank=True, help_text="Mandatory representation in Indian words")

    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='ISSUED')
    idempotency_key = models.CharField(max_length=64, blank=True, null=True, unique=True, help_text="Prevents duplicate billing on network retries")
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-invoice_date', '-created_at']

    def determine_inter_state(self):
        """
        Statutory POS determination under Section 7 & Section 8 of the IGST Act 2017:
        - SALES: Supplier is our registered BusinessProfile; Recipient POS is customer/POS state.
        - PURCHASE: Supplier is the Vendor (Party); Recipient POS is our business/POS state.
        If supplier state != recipient POS, it is Inter-State (IGST); otherwise Intra-State (CGST+SGST).
        """
        business = BusinessProfile.objects.first()
        business_state = business.state_code if business else "27"

        if self.invoice_type == 'PURCHASE':
            supplier_state = self.party.state_code if self.party else business_state
            pos_state = self.place_of_supply_state_code or business_state
        else:
            supplier_state = business_state
            pos_state = self.place_of_supply_state_code or (self.party.state_code if self.party else business_state)

        self.is_inter_state = (supplier_state != pos_state)
        self.place_of_supply_state_code = pos_state
        self.place_of_supply_state_name = STATE_CODES.get(pos_state, "Unknown State")

    def save(self, *args, **kwargs):
        self.determine_inter_state()
        super().save(*args, **kwargs)

    def recalculate_totals(self):
        """
        Recalculates line items, segregates CGST/SGST vs IGST, applies Section 170 rounding,
        and generates Indian number words.
        """
        self.determine_inter_state()
        
        taxable_sum = Decimal('0.00')
        cgst_sum = Decimal('0.00')
        sgst_sum = Decimal('0.00')
        igst_sum = Decimal('0.00')
        cess_sum = Decimal('0.00')

        for item in self.items.all():
            item.is_inter_state = self.is_inter_state
            item.calculate_line_taxes()
            item.save()

            taxable_sum += item.taxable_value
            cgst_sum += item.cgst_amount
            sgst_sum += item.sgst_amount
            igst_sum += item.igst_amount
            cess_sum += item.cess_amount

        self.total_taxable_value = round_currency(taxable_sum)
        self.total_cgst = round_currency(cgst_sum)
        self.total_sgst = round_currency(sgst_sum)
        self.total_igst = round_currency(igst_sum)
        self.total_cess = round_currency(cess_sum)

        raw_total = self.total_taxable_value + self.total_cgst + self.total_sgst + self.total_igst + self.total_cess
        rounded_total = round_statutory_rupee(raw_total)
        self.round_off_amount = round_currency(rounded_total - raw_total)
        self.grand_total = rounded_total
        self.grand_total_words = amount_to_indian_words(self.grand_total)

    def __str__(self):
        return f"{self.invoice_number} - {self.party.legal_name} (₹{self.grand_total})"


class InvoiceItem(models.Model):
    """Individual line item on an invoice."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(ProductItem, on_delete=models.SET_NULL, null=True, blank=True)
    item_description = models.CharField(max_length=255)
    hsn_sac_code = models.CharField(max_length=8)
    uqc_unit = models.CharField(max_length=10, default='OTH')
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('1.00'))
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    taxable_value = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('18.00'))
    
    cgst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    cgst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    sgst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    sgst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    igst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    igst_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    cess_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    total_item_value = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))

    def calculate_line_taxes(self):
        gross_value = round_currency(self.quantity * self.unit_price)
        self.taxable_value = round_currency(max(Decimal('0.00'), gross_value - self.discount_amount))
        
        # Determine whether intra-state (CGST+SGST) or inter-state (IGST)
        is_inter = self.invoice.is_inter_state if self.invoice_id else False

        if is_inter:
            self.cgst_rate = Decimal('0.00')
            self.cgst_amount = Decimal('0.00')
            self.sgst_rate = Decimal('0.00')
            self.sgst_amount = Decimal('0.00')
            self.igst_rate = self.gst_rate
            self.igst_amount = round_currency(self.taxable_value * (self.igst_rate / Decimal('100.0')))
        else:
            half_rate = self.gst_rate / Decimal('2.0')
            self.cgst_rate = half_rate
            self.cgst_amount = round_currency(self.taxable_value * (self.cgst_rate / Decimal('100.0')))
            self.sgst_rate = half_rate
            self.sgst_amount = round_currency(self.taxable_value * (self.sgst_rate / Decimal('100.0')))
            self.igst_rate = Decimal('0.00')
            self.igst_amount = Decimal('0.00')

        self.total_item_value = round_currency(
            self.taxable_value + self.cgst_amount + self.sgst_amount + self.igst_amount + self.cess_amount
        )

    def save(self, *args, **kwargs):
        self.calculate_line_taxes()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item_description} ({self.quantity} x {self.unit_price})"
