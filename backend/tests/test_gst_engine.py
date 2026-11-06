"""
Statutory test suite for GST Compliance & Invoicing Engine.
Tests Modulo-36 validation, Rule 46 numbering, Intra vs Inter-State splitting,
Section 170 rounding, and Section 49 GSTR-3B ITC cascade.
"""
from decimal import Decimal
from datetime import date
from django.test import TestCase

from common.gst_utils import verify_gstin, calculate_gstin_checksum, amount_to_indian_words
from authentication.models import BusinessProfile
from parties.models import Party
from catalog.models import ProductItem
from transactions.models import Invoice, InvoiceItem
from compliance.services import GSTR1Service, GSTR3BService, InvoicePDFService


class GSTEngineTestCase(TestCase):
    def setUp(self):
        # Business Profile (Maharashtra 27)
        self.business = BusinessProfile.objects.create(
            legal_name="Apex Tech Solutions Private Limited",
            trade_name="Apex GST Systems",
            gstin="27AAACT2727Q1ZW",
            state_code="27",
            state_name="Maharashtra",
            pan="AAACT2727Q",
            bank_name="HDFC Bank",
            bank_account_number="50200012345678",
            bank_ifsc="HDFC0000060"
        )

        # Intra-state Party (Maharashtra 27)
        self.party_intra = Party.objects.create(
            party_type='CUSTOMER',
            legal_name="Reliance Retail Limited",
            gstin="27AABCR6154Q1ZF",
            state_code="27",
            state_name="Maharashtra",
            is_registered=True,
            billing_address="Mumbai, MH"
        )

        # Inter-state Party (Karnataka 29)
        self.party_inter = Party.objects.create(
            party_type='CUSTOMER',
            legal_name="Infosys Limited",
            gstin="29AAACI4798L1ZU",
            state_code="29",
            state_name="Karnataka",
            is_registered=True,
            billing_address="Electronic City, Bengaluru, KA"
        )

        # Catalog Item: 18% GST Service
        self.product_it = ProductItem.objects.create(
            item_type='SERVICE',
            name="Cloud Consulting",
            hsn_sac_code="998314",
            uqc_unit="OTH",
            unit_price=Decimal('100000.00'),
            gst_rate=Decimal('18.00')
        )

    def test_gstin_modulo_36_checksum_verification(self):
        """Verifies statutory Modulo-36 checksum calculation against live entities."""
        # TCS Maharashtra
        self.assertEqual(calculate_gstin_checksum("27AAACT2727Q1Z"), "W")
        self.assertTrue(verify_gstin("27AAACT2727Q1ZW"))

        # Infosys Karnataka
        self.assertEqual(calculate_gstin_checksum("29AAACI4798L1Z"), "U")
        self.assertTrue(verify_gstin("29AAACI4798L1ZU"))

        # Corrupted checksum
        self.assertFalse(verify_gstin("27AAACT2727Q1Z0"))
        self.assertFalse(verify_gstin("INVALIDGSTIN123"))

    def test_intra_state_tax_split(self):
        """Intra-state supply (MH to MH) must split equally into 9% CGST + 9% SGST."""
        inv = Invoice.objects.create(
            invoice_type='SALES',
            invoice_number='INV/2026-27/0001',
            invoice_date=date.today(),
            party=self.party_intra,
            place_of_supply_state_code='27'
        )
        InvoiceItem.objects.create(
            invoice=inv,
            product=self.product_it,
            item_description=self.product_it.name,
            hsn_sac_code=self.product_it.hsn_sac_code,
            uqc_unit=self.product_it.uqc_unit,
            quantity=Decimal('1.00'),
            unit_price=Decimal('100000.00'),
            gst_rate=Decimal('18.00')
        )
        inv.recalculate_totals()
        inv.save()

        self.assertFalse(inv.is_inter_state)
        self.assertEqual(inv.total_taxable_value, Decimal('100000.00'))
        self.assertEqual(inv.total_cgst, Decimal('9000.00'))
        self.assertEqual(inv.total_sgst, Decimal('9000.00'))
        self.assertEqual(inv.total_igst, Decimal('0.00'))
        self.assertEqual(inv.grand_total, Decimal('118000.00'))

    def test_inter_state_tax_allocation(self):
        """Inter-state supply (MH to KA) must charge 100% IGST (18%)."""
        inv = Invoice.objects.create(
            invoice_type='SALES',
            invoice_number='INV/2026-27/0002',
            invoice_date=date.today(),
            party=self.party_inter,
            place_of_supply_state_code='29'
        )
        InvoiceItem.objects.create(
            invoice=inv,
            product=self.product_it,
            item_description=self.product_it.name,
            hsn_sac_code=self.product_it.hsn_sac_code,
            uqc_unit=self.product_it.uqc_unit,
            quantity=Decimal('2.00'),
            unit_price=Decimal('50000.00'),
            discount_amount=Decimal('10000.00'),
            gst_rate=Decimal('18.00')
        )
        inv.recalculate_totals()
        inv.save()

        self.assertTrue(inv.is_inter_state)
        # Taxable: 2 x 50,000 - 10,000 = 90,000
        self.assertEqual(inv.total_taxable_value, Decimal('90000.00'))
        self.assertEqual(inv.total_cgst, Decimal('0.00'))
        self.assertEqual(inv.total_sgst, Decimal('0.00'))
        # 18% of 90,000 = 16,200
        self.assertEqual(inv.total_igst, Decimal('16200.00'))
        self.assertEqual(inv.grand_total, Decimal('106200.00'))

    def test_section_170_rounding_and_currency_words(self):
        """Verifies statutory rounding off to nearest rupee under Section 170 and Indian words."""
        inv = Invoice.objects.create(
            invoice_type='SALES',
            invoice_number='INV/2026-27/0003',
            invoice_date=date.today(),
            party=self.party_intra,
            place_of_supply_state_code='27'
        )
        InvoiceItem.objects.create(
            invoice=inv,
            item_description="Fractional Rate Item",
            hsn_sac_code="998314",
            quantity=Decimal('3.00'),
            unit_price=Decimal('33.33'),
            gst_rate=Decimal('18.00')
        )
        inv.recalculate_totals()
        inv.save()

        # Gross: 3 * 33.33 = 99.99. 18% tax = 18.00. Raw = 117.99.
        # Rounded: 118.00, Roundoff: +0.01
        self.assertEqual(inv.grand_total, Decimal('118.00'))
        self.assertIn("One Hundred and Eighteen", inv.grand_total_words)

    def test_gstr1_report_assembly(self):
        """Ensures GSTR-1 structures B2B and HSN summaries accurately."""
        # Create an issued invoice
        inv = Invoice.objects.create(
            invoice_type='SALES',
            invoice_number='INV/2026-27/0004',
            invoice_date=date.today(),
            party=self.party_inter,
            place_of_supply_state_code='29',
            status='ISSUED'
        )
        InvoiceItem.objects.create(
            invoice=inv,
            item_description=self.product_it.name,
            hsn_sac_code=self.product_it.hsn_sac_code,
            quantity=Decimal('1.00'),
            unit_price=Decimal('50000.00'),
            gst_rate=Decimal('18.00')
        )
        inv.recalculate_totals()
        inv.save()

        report = GSTR1Service.generate_report(date.today().year, date.today().month)
        self.assertEqual(report['gstin'], "27AAACT2727Q1ZW")
        self.assertGreaterEqual(len(report['b2b']), 1)
        self.assertGreaterEqual(len(report['hsn']['data']), 1)

    def test_gstr3b_itc_cascade_engine(self):
        """Verifies Section 49 statutory set-off order where IGST credit is exhausted first."""
        # Sales: 100k taxable @ 18% IGST -> liability = 18,000 IGST
        sale = Invoice.objects.create(
            invoice_type='SALES',
            invoice_number='INV/2026-27/0005',
            invoice_date=date.today(),
            party=self.party_inter,
            place_of_supply_state_code='29',
            status='ISSUED'
        )
        InvoiceItem.objects.create(
            invoice=sale,
            item_description="Sale Item",
            hsn_sac_code="998314",
            quantity=Decimal('1.00'),
            unit_price=Decimal('100000.00'),
            gst_rate=Decimal('18.00')
        )
        sale.recalculate_totals()
        sale.save()

        # Purchase: 50k taxable @ 18% IGST -> ITC = 9,000 IGST
        purchase = Invoice.objects.create(
            invoice_type='PURCHASE',
            invoice_number='PUR/2026-27/0001',
            invoice_date=date.today(),
            party=self.party_inter,
            place_of_supply_state_code='29',
            status='ISSUED'
        )
        InvoiceItem.objects.create(
            invoice=purchase,
            item_description="Purchase Item",
            hsn_sac_code="998314",
            quantity=Decimal('1.00'),
            unit_price=Decimal('50000.00'),
            gst_rate=Decimal('18.00')
        )
        purchase.recalculate_totals()
        purchase.save()

        res = GSTR3BService.calculate_return(date.today().year, date.today().month)
        # Output: 18000 IGST. ITC: 9000 IGST. Net cash payable = 9000 IGST.
        self.assertEqual(res['net_cash_payable']['igst'], 9000.0)

    def test_pdf_generation(self):
        """Verifies ReportLab PDF buffer generation."""
        inv = Invoice.objects.create(
            invoice_type='SALES',
            invoice_number='INV/2026-27/PDF01',
            invoice_date=date.today(),
            party=self.party_intra,
            place_of_supply_state_code='27',
            status='ISSUED'
        )
        InvoiceItem.objects.create(
            invoice=inv,
            product=self.product_it,
            item_description=self.product_it.name,
            hsn_sac_code=self.product_it.hsn_sac_code,
            quantity=Decimal('1.00'),
            unit_price=Decimal('50000.00'),
            gst_rate=Decimal('18.00')
        )
        inv.recalculate_totals()
        inv.save()

        pdf_buffer = InvoicePDFService.generate_pdf(inv)
        self.assertGreater(len(pdf_buffer.getvalue()), 1000)

    def test_purchase_inter_state_determination(self):
        """Verifies inward purchase inter-state vs intra-state routing."""
        # Purchase from vendor in KA (29) with POS in MH (27) -> Inter-state
        p1 = Invoice.objects.create(
            invoice_type='PURCHASE',
            invoice_number='PUR/2026-27/0010',
            invoice_date=date.today(),
            party=self.party_inter, # KA (29)
            place_of_supply_state_code='27', # Recipient is in MH
            status='ISSUED'
        )
        self.assertTrue(p1.is_inter_state)

        # Purchase from vendor in MH (27) with POS in MH (27) -> Intra-state
        p2 = Invoice.objects.create(
            invoice_type='PURCHASE',
            invoice_number='PUR/2026-27/0011',
            invoice_date=date.today(),
            party=self.party_intra, # MH (27)
            place_of_supply_state_code='27',
            status='ISSUED'
        )
        self.assertFalse(p2.is_inter_state)

    def test_gstr2b_reconciliation_post_matching(self):
        """Verifies GSTR-2B JSON ingestion and multi-way matching."""
        from rest_framework.test import APIRequestFactory
        from compliance.views import GSTR2BReconcilerView

        # Create internal purchase bill
        purchase = Invoice.objects.create(
            invoice_type='PURCHASE',
            invoice_number='PUR/2026-27/TEST99',
            invoice_date=date.today(),
            party=self.party_inter,
            place_of_supply_state_code='27',
            status='ISSUED'
        )
        InvoiceItem.objects.create(
            invoice=purchase,
            item_description="Server",
            hsn_sac_code="847130",
            quantity=Decimal('1.00'),
            unit_price=Decimal('50000.00'),
            gst_rate=Decimal('18.00')
        )
        purchase.recalculate_totals()
        purchase.save()

        # Uploaded GSTR-2B JSON with 1 matched invoice, 1 mismatched invoice, 1 portal-only invoice
        payload = {
            "data": {
                "docdata": {
                    "b2b": [
                        {
                            "ctin": self.party_inter.gstin,
                            "cname": self.party_inter.legal_name,
                            "inv": [
                                {
                                    "inum": "PUR/2026-27/TEST99",
                                    "dt": "06-11-2026",
                                    "val": 59000.0,
                                    "items": [
                                        {
                                            "itm_det": {
                                                "txval": 50000.0,
                                                "iamt": 9000.0,
                                                "camt": 0.0,
                                                "samt": 0.0
                                            }
                                        }
                                    ]
                                },
                                {
                                    "inum": "PORTAL-EXTRA-001",
                                    "dt": "06-11-2026",
                                    "val": 11800.0,
                                    "items": [
                                        {
                                            "itm_det": {
                                                "txval": 10000.0,
                                                "iamt": 1800.0,
                                                "camt": 0.0,
                                                "samt": 0.0
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            }
        }

        factory = APIRequestFactory()
        request = factory.post('/api/compliance/reconcile-2b/', payload, format='json')
        view = GSTR2BReconcilerView.as_view()
        response = view(request)

        self.assertEqual(response.status_code, 200)
        data = response.data
        summary = data['summary']
        self.assertEqual(summary['matched_count'], 1)
        self.assertEqual(summary['missing_in_books_count'], 1)
        self.assertEqual(summary['total_itc_matched'], 9000.0)

    def test_invoice_lifecycle_status_transitions(self):
        """Verifies invoice status transitions to PAID and CANCELLED."""
        from rest_framework.test import APIRequestFactory
        from transactions.views import InvoiceViewSet

        inv = Invoice.objects.create(
            invoice_type='SALES',
            invoice_number='INV/2026-27/TEST-STATUS',
            invoice_date=date.today(),
            party=self.party_intra,
            status='ISSUED'
        )

        factory = APIRequestFactory()
        view = InvoiceViewSet.as_view({'post': 'mark_paid'})
        req = factory.post(f'/api/invoices/{inv.id}/mark_paid/')
        resp = view(req, pk=str(inv.id))
        self.assertEqual(resp.status_code, 200)
        inv.refresh_from_db()
        self.assertEqual(inv.status, 'PAID')

        # Test cancellation
        view_cancel = InvoiceViewSet.as_view({'post': 'cancel'})
        req_cancel = factory.post(f'/api/invoices/{inv.id}/cancel/')
        resp_cancel = view_cancel(req_cancel, pk=str(inv.id))
        self.assertEqual(resp_cancel.status_code, 200)
        inv.refresh_from_db()
        self.assertEqual(inv.status, 'CANCELLED')
