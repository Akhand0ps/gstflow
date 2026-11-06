"""
Seeds database with authentic Indian GST business profiles, customers, vendors,
catalog items, and sample sales/purchase invoices.
"""
import os
import django
from datetime import date
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from authentication.models import BusinessProfile
from parties.models import Party
from catalog.models import ProductItem
from transactions.models import Invoice, InvoiceItem

def run():
    print("🌱 Seeding GST Flow Database...")

    # 1. Business Profile
    BusinessProfile.objects.all().delete()
    business = BusinessProfile.objects.create(
        legal_name="Apex Tech Solutions Private Limited",
        trade_name="Apex GST Systems",
        gstin="27AAACT2727Q1ZW",
        state_code="27",
        state_name="Maharashtra",
        pan="AAACT2727Q",
        email="compliance@apextech.example",
        phone="+91 98200 12345",
        address="Level 5, Platina Tech Park, Bandra Kurla Complex, Mumbai",
        pincode="400051",
        annual_turnover=Decimal('35000000.00'),
        bank_name="HDFC Bank",
        bank_account_number="50200012345678",
        bank_ifsc="HDFC0000060"
    )
    print("✅ Created Business Profile:", business)

    # 2. Invoices & Parties (delete dependent Invoices first)
    Invoice.objects.all().delete()
    Party.objects.all().delete()

    c1 = Party.objects.create(
        party_type='CUSTOMER',
        legal_name="Infosys Limited",
        trade_name="Infosys",
        gstin="29AAACI4798L1ZU",
        state_code="29",
        state_name="Karnataka",
        pan="AAACI4798L",
        email="procurement@infosys.example",
        phone="+91 80 2852 0261",
        billing_address="Plot 44 & 97A, Electronic City, Hosur Road, Bengaluru",
        pincode="560100",
        is_registered=True
    )

    c2 = Party.objects.create(
        party_type='CUSTOMER',
        legal_name="Reliance Retail Limited",
        trade_name="Reliance Smart",
        gstin="27AABCR6154Q1ZF",
        state_code="27",
        state_name="Maharashtra",
        pan="AABCR6154Q",
        email="accounts@relianceretail.example",
        phone="+91 22 3555 3800",
        billing_address="Court House, Lokmanya Tilak Marg, Dhobi Talao, Mumbai",
        pincode="400002",
        is_registered=True
    )

    c3 = Party.objects.create(
        party_type='CUSTOMER',
        legal_name="Aarav Sharma",
        trade_name="",
        gstin="",
        state_code="07",
        state_name="Delhi",
        email="aarav.sharma@example.com",
        phone="+91 98111 22334",
        billing_address="B-42, Greater Kailash Part 1, New Delhi",
        pincode="110048",
        is_registered=False
    )

    v1 = Party.objects.create(
        party_type='VENDOR',
        legal_name="Cloud Matrix Technologies LLP",
        trade_name="Matrix Cloud",
        gstin="27AAACW8891P1ZX",
        state_code="27",
        state_name="Maharashtra",
        pan="AAACW8891P",
        email="billing@cloudmatrix.example",
        phone="+91 20 6601 9900",
        billing_address="Cyber City, Magarpatta, Hadapsar, Pune",
        pincode="411028",
        is_registered=True
    )

    v2 = Party.objects.create(
        party_type='VENDOR',
        legal_name="Dell International Services India Pvt Ltd",
        trade_name="Dell Technologies",
        gstin="29AABCD9912K1ZQ",
        state_code="29",
        state_name="Karnataka",
        pan="AABCD9912K",
        email="enterprise.sales@dell.example",
        phone="+91 80 6734 5000",
        billing_address="Divyasree Greens, Ground Floor, Challaghatta Village, Bengaluru",
        pincode="560071",
        is_registered=True
    )
    print("✅ Created Parties (Customers & Vendors)")

    # 3. Catalog Items
    ProductItem.objects.all().delete()

    p1 = ProductItem.objects.create(
        item_type='SERVICE',
        name="Cloud Architecture Consulting",
        hsn_sac_code="998314",
        description="High availability enterprise microservices & AWS/GCP architecture consulting",
        uqc_unit="OTH",
        unit_price=Decimal('150000.00'),
        gst_rate=Decimal('18.00'),
    )

    p2 = ProductItem.objects.create(
        item_type='SERVICE',
        name="Enterprise SaaS Annual Subscription",
        hsn_sac_code="998315",
        description="Multi-tenant GST invoice automation & compliance software license",
        uqc_unit="OTH",
        unit_price=Decimal('60000.00'),
        gst_rate=Decimal('18.00'),
    )

    p3 = ProductItem.objects.create(
        item_type='GOODS',
        name="Dell PowerEdge R750 Rack Server",
        hsn_sac_code="8471",
        description="Dual Intel Xeon Silver, 128GB RAM, 4TB NVMe Enterprise Storage",
        uqc_unit="NOS",
        unit_price=Decimal('420000.00'),
        gst_rate=Decimal('18.00'),
    )

    p4 = ProductItem.objects.create(
        item_type='GOODS',
        name="Ergonomic Developer Desk Pro",
        hsn_sac_code="9403",
        description="Motorized sit-stand desk with dual cable management track",
        uqc_unit="NOS",
        unit_price=Decimal('35000.00'),
        gst_rate=Decimal('18.00'),
    )

    p5 = ProductItem.objects.create(
        item_type='SERVICE',
        name="GST & Statutory Audit Services",
        hsn_sac_code="998222",
        description="Quarterly reconciliation of GSTR-1, 2B, 3B and statutory filing review",
        uqc_unit="OTH",
        unit_price=Decimal('45000.00'),
        gst_rate=Decimal('18.00'),
    )
    print("✅ Created Catalog Items")

    # 4. Invoices (Sales & Purchases)
    today = date.today()

    # Sale 1: Inter-State to Infosys (IGST)
    inv1 = Invoice.objects.create(
        invoice_type='SALES',
        invoice_number=f"INV/{today.year}-{str(today.year+1)[-2:]}/0001",
        invoice_date=today,
        party=c1,
        place_of_supply_state_code="29",
        status='ISSUED',
        notes="Net 30 days payment term. Bank transfer via NEFT/RTGS."
    )
    InvoiceItem.objects.create(
        invoice=inv1,
        product=p1,
        item_description=p1.name,
        hsn_sac_code=p1.hsn_sac_code,
        uqc_unit=p1.uqc_unit,
        quantity=Decimal('2.00'),
        unit_price=p1.unit_price,
        discount_amount=Decimal('10000.00'),
        gst_rate=p1.gst_rate
    )
    InvoiceItem.objects.create(
        invoice=inv1,
        product=p2,
        item_description=p2.name,
        hsn_sac_code=p2.hsn_sac_code,
        uqc_unit=p2.uqc_unit,
        quantity=Decimal('1.00'),
        unit_price=p2.unit_price,
        discount_amount=Decimal('0.00'),
        gst_rate=p2.gst_rate
    )
    inv1.recalculate_totals()
    inv1.save()

    # Sale 2: Intra-State to Reliance Retail (CGST + SGST)
    inv2 = Invoice.objects.create(
        invoice_type='SALES',
        invoice_number=f"INV/{today.year}-{str(today.year+1)[-2:]}/0002",
        invoice_date=today,
        party=c2,
        place_of_supply_state_code="27",
        status='ISSUED',
        notes="Supply delivered to BKC premises."
    )
    InvoiceItem.objects.create(
        invoice=inv2,
        product=p2,
        item_description=p2.name,
        hsn_sac_code=p2.hsn_sac_code,
        uqc_unit=p2.uqc_unit,
        quantity=Decimal('3.00'),
        unit_price=p2.unit_price,
        discount_amount=Decimal('5000.00'),
        gst_rate=p2.gst_rate
    )
    inv2.recalculate_totals()
    inv2.save()

    # Purchase 1: Cloud hosting from Cloud Matrix (Intra-state Inward ITC)
    pur1 = Invoice.objects.create(
        invoice_type='PURCHASE',
        invoice_number=f"PUR/{today.year}-{str(today.year+1)[-2:]}/0001",
        invoice_date=today,
        party=v1,
        place_of_supply_state_code="27",
        status='PAID',
        notes="Dedicated cloud compute cluster hosting monthly bill"
    )
    InvoiceItem.objects.create(
        invoice=pur1,
        item_description="Enterprise Cloud Virtual Machine Cluster (32 vCPU, 128GB)",
        hsn_sac_code="998315",
        uqc_unit="OTH",
        quantity=Decimal('1.00'),
        unit_price=Decimal('85000.00'),
        discount_amount=Decimal('0.00'),
        gst_rate=Decimal('18.00')
    )
    pur1.recalculate_totals()
    pur1.save()

    # Purchase 2: Server hardware from Dell (Inter-state Inward ITC)
    pur2 = Invoice.objects.create(
        invoice_type='PURCHASE',
        invoice_number=f"PUR/{today.year}-{str(today.year+1)[-2:]}/0002",
        invoice_date=today,
        party=v2,
        place_of_supply_state_code="29",
        status='ISSUED',
        notes="Core infrastructure replacement server."
    )
    InvoiceItem.objects.create(
        invoice=pur2,
        product=p3,
        item_description=p3.name,
        hsn_sac_code=p3.hsn_sac_code,
        uqc_unit=p3.uqc_unit,
        quantity=Decimal('1.00'),
        unit_price=p3.unit_price,
        discount_amount=Decimal('20000.00'),
        gst_rate=p3.gst_rate
    )
    pur2.recalculate_totals()
    pur2.save()

    print("✅ Created Invoices:")
    print(f"   Sales 1: {inv1.invoice_number} | ₹{inv1.grand_total} ({'Inter-State IGST' if inv1.is_inter_state else 'Intra-State'})")
    print(f"   Sales 2: {inv2.invoice_number} | ₹{inv2.grand_total} ({'Inter-State IGST' if inv2.is_inter_state else 'Intra-State'})")
    print(f"   Purchase 1: {pur1.invoice_number} | ₹{pur1.grand_total}")
    print(f"   Purchase 2: {pur2.invoice_number} | ₹{pur2.grand_total}")
    print("🎉 Database successfully seeded!")

if __name__ == '__main__':
    run()
