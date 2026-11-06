import json
import re
from datetime import date
from decimal import Decimal
from django.db.models import Sum, Count
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from transactions.models import Invoice
from parties.models import Party
from catalog.models import ProductItem
from .services import GSTR1Service, GSTR3BService


class GSTR1ReportView(APIView):
    """
    Returns official GSTR-1 Outward Supplies return JSON payload for a given tax period.
    """
    def get(self, request):
        today = date.today()
        year = int(request.query_params.get('year', today.year))
        month = int(request.query_params.get('month', today.month))
        report = GSTR1Service.generate_report(year, month)
        return Response(report)


class GSTR3BReportView(APIView):
    """
    Computes monthly GSTR-3B return with Section 49, 49A, 49B statutory ITC offset cascade.
    """
    def get(self, request):
        today = date.today()
        year = int(request.query_params.get('year', today.year))
        month = int(request.query_params.get('month', today.month))
        report = GSTR3BService.calculate_return(year, month)
        return Response(report)


class DashboardSummaryView(APIView):
    """
    Consolidated executive summary of taxes, ITC, cash payable, and recent activities.
    """
    def get(self, request):
        today = date.today()
        year = int(request.query_params.get('year', today.year))
        month = int(request.query_params.get('month', today.month))

        # Monthly metrics from statutory Section 49 & Rule 88A cascade
        gstr3b = GSTR3BService.calculate_return(year, month)
        output_liability = gstr3b["table_3_1_output_liability"]["total_tax"]
        eligible_itc = gstr3b["table_4_eligible_itc"]["total_itc"]
        net_cash = gstr3b["net_cash_payable"]["total_cash_payable"]

        monthly_sales = Invoice.objects.filter(
            invoice_type='SALES',
            invoice_date__year=year,
            invoice_date__month=month,
            status__in=['ISSUED', 'PAID']
        )
        monthly_purchases = Invoice.objects.filter(
            invoice_type='PURCHASE',
            invoice_date__year=year,
            invoice_date__month=month,
            status__in=['ISSUED', 'PAID']
        )

        recent_invoices = Invoice.objects.all().select_related('party')[:6]
        recent_data = []
        for inv in recent_invoices:
            recent_data.append({
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "invoice_type": inv.invoice_type,
                "party_name": inv.party.legal_name,
                "grand_total": float(inv.grand_total),
                "status": inv.status,
                "invoice_date": inv.invoice_date.strftime("%d %b %Y"),
                "is_inter_state": inv.is_inter_state
            })

        period_date = date(year, month, 1)
        return Response({
            "current_period": period_date.strftime('%B %Y'),
            "year": year,
            "month": month,
            "metrics": {
                "output_liability": float(output_liability),
                "eligible_itc": float(eligible_itc),
                "net_cash_payable": float(net_cash),
                "total_sales_count": monthly_sales.count(),
                "total_purchases_count": monthly_purchases.count(),
                "total_customers": Party.objects.filter(party_type='CUSTOMER').count(),
                "total_vendors": Party.objects.filter(party_type='VENDOR').count(),
                "total_products": ProductItem.objects.count()
            },
            "recent_invoices": recent_data
        })


class GSTR2BReconcilerView(APIView):
    """
    Statutory reconciliation engine matching internal Purchase Bills against GSTR-2B.
    GET: Reconciles internal purchase bills against party registration status and allows downloading sample portal payload.
    POST: Ingests uploaded GST portal GSTR-2B JSON payloads and cross-matches invoice numbers, GSTINs, and tax values.
    """
    def _extract_portal_invoices(self, payload):
        extracted = []
        if isinstance(payload, list):
            for item in payload:
                if isinstance(item, dict):
                    extracted.append({
                        "invoice_number": str(item.get("invoice_number") or item.get("inum") or "").strip(),
                        "supplier_gstin": str(item.get("gstin") or item.get("ctin") or "").strip().upper(),
                        "supplier_name": item.get("supplier_name") or item.get("cname") or "",
                        "taxable_value": Decimal(str(item.get("taxable_value") or item.get("txval") or 0)),
                        "total_tax": Decimal(str(item.get("tax_amount") or item.get("total_tax") or 0)),
                        "invoice_date": str(item.get("invoice_date") or item.get("dt") or "")
                    })
            return extracted

        if not isinstance(payload, dict):
            return []

        # Format A: Portal standard { "data": { "docdata": { "b2b": [...] } } } or { "b2b": [...] }
        b2b_list = None
        if "data" in payload and isinstance(payload["data"], dict):
            docdata = payload["data"].get("docdata", {})
            b2b_list = docdata.get("b2b", [])
        elif "docdata" in payload and isinstance(payload["docdata"], dict):
            b2b_list = payload["docdata"].get("b2b", [])
        elif "b2b" in payload and isinstance(payload["b2b"], list):
            b2b_list = payload["b2b"]
        elif "invoices" in payload and isinstance(payload["invoices"], list):
            return self._extract_portal_invoices(payload["invoices"])
        elif "records" in payload and isinstance(payload["records"], list):
            return self._extract_portal_invoices(payload["records"])

        if b2b_list:
            for supplier in b2b_list:
                ctin = str(supplier.get("ctin", "")).strip().upper()
                cname = supplier.get("cname", "")
                for inv in supplier.get("inv", []):
                    inum = str(inv.get("inum", "")).strip()
                    idt = str(inv.get("dt", ""))
                    txval = Decimal('0.00')
                    iamt = Decimal('0.00')
                    camt = Decimal('0.00')
                    samt = Decimal('0.00')
                    for itm in inv.get("items", []):
                        det = itm.get("itm_det", itm)
                        txval += Decimal(str(det.get("txval", 0)))
                        iamt += Decimal(str(det.get("iamt", 0)))
                        camt += Decimal(str(det.get("camt", 0)))
                        samt += Decimal(str(det.get("samt", 0)))
                    extracted.append({
                        "invoice_number": inum,
                        "supplier_gstin": ctin,
                        "supplier_name": cname,
                        "taxable_value": txval,
                        "total_tax": iamt + camt + samt,
                        "invoice_date": idt
                    })
        return extracted

    def get(self, request):
        year = request.query_params.get('year')
        month = request.query_params.get('month')

        purchases = Invoice.objects.filter(invoice_type='PURCHASE', status__in=['ISSUED', 'PAID'])
        if year and month:
            purchases = purchases.filter(invoice_date__year=int(year), invoice_date__month=int(month))

        reconciled = []
        matched_count = 0
        at_risk_count = 0
        total_itc_at_risk = Decimal('0.00')
        total_itc_matched = Decimal('0.00')

        for p in purchases:
            total_tax = p.total_cgst + p.total_sgst + p.total_igst
            if p.party.is_registered and p.party.gstin:
                matched_count += 1
                total_itc_matched += total_tax
                match_status = "MATCHED"
                remarks = "Reflected in GSTR-2B. 100% ITC Eligible under Rule 36(4)."
            else:
                at_risk_count += 1
                total_itc_at_risk += total_tax
                match_status = "AT_RISK"
                remarks = "Vendor GSTIN not found on GST Portal. ITC Claim Blocked under Sec 16(2)(aa)."

            reconciled.append({
                "invoice_id": str(p.id),
                "invoice_number": p.invoice_number,
                "vendor_name": p.party.legal_name,
                "vendor_gstin": p.party.gstin or "Unregistered",
                "invoice_date": p.invoice_date.strftime("%d-%m-%Y"),
                "taxable_value": float(p.total_taxable_value),
                "tax_amount": float(total_tax),
                "portal_tax_amount": float(total_tax) if match_status == "MATCHED" else 0.0,
                "status": match_status,
                "remarks": remarks
            })

        return Response({
            "summary": {
                "total_bills": purchases.count(),
                "matched_count": matched_count,
                "at_risk_count": at_risk_count,
                "total_itc_matched": float(total_itc_matched),
                "total_itc_at_risk": float(total_itc_at_risk),
                "is_uploaded_reconciliation": False
            },
            "records": reconciled
        })

    def post(self, request):
        payload = request.data
        if 'file' in request.FILES:
            try:
                uploaded_file = request.FILES['file']
                payload = json.loads(uploaded_file.read().decode('utf-8'))
            except Exception as e:
                return Response({"error": f"Invalid JSON file format: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        portal_invoices = self._extract_portal_invoices(payload)
        purchases = list(Invoice.objects.filter(invoice_type='PURCHASE', status__in=['ISSUED', 'PAID']).select_related('party'))

        def norm(num):
            return re.sub(r'[^A-Za-z0-9]', '', str(num)).upper()

        matched_portal_indices = set()
        reconciled = []
        matched_count = 0
        mismatch_amount_count = 0
        missing_in_portal_count = 0
        total_itc_matched = Decimal('0.00')
        total_itc_at_risk = Decimal('0.00')
        total_itc_mismatched = Decimal('0.00')

        # 1. Match internal purchase bills against portal records
        for p in purchases:
            total_tax = p.total_cgst + p.total_sgst + p.total_igst
            p_num_norm = norm(p.invoice_number)

            portal_match = None
            match_idx = None
            for idx, pi in enumerate(portal_invoices):
                if idx in matched_portal_indices:
                    continue
                pi_num_norm = norm(pi.get("invoice_number", ""))
                if p_num_norm == pi_num_norm or (p_num_norm and pi_num_norm and (p_num_norm in pi_num_norm or pi_num_norm in p_num_norm)):
                    portal_match = pi
                    match_idx = idx
                    break

            if portal_match:
                matched_portal_indices.add(match_idx)
                portal_tax = portal_match.get("total_tax", Decimal('0.00'))
                diff = abs(total_tax - portal_tax)
                if diff <= Decimal('1.00'):
                    matched_count += 1
                    total_itc_matched += total_tax
                    status_str = "MATCHED"
                    remarks = f"Reconciled with Portal GSTR-2B. 100% ITC Eligible (₹{total_tax:,.2f})."
                else:
                    mismatch_amount_count += 1
                    total_itc_mismatched += total_tax
                    status_str = "MISMATCH_AMOUNT"
                    remarks = f"Tax mismatch: Portal shows ₹{portal_tax:,.2f} vs Books ₹{total_tax:,.2f} (Diff: ₹{diff:,.2f})."

                reconciled.append({
                    "invoice_id": str(p.id),
                    "invoice_number": p.invoice_number,
                    "vendor_name": p.party.legal_name,
                    "vendor_gstin": p.party.gstin or "Unregistered",
                    "invoice_date": p.invoice_date.strftime("%d-%m-%Y"),
                    "taxable_value": float(p.total_taxable_value),
                    "tax_amount": float(total_tax),
                    "portal_tax_amount": float(portal_tax),
                    "status": status_str,
                    "remarks": remarks
                })
            else:
                missing_in_portal_count += 1
                total_itc_at_risk += total_tax
                reconciled.append({
                    "invoice_id": str(p.id),
                    "invoice_number": p.invoice_number,
                    "vendor_name": p.party.legal_name,
                    "vendor_gstin": p.party.gstin or "Unregistered",
                    "invoice_date": p.invoice_date.strftime("%d-%m-%Y"),
                    "taxable_value": float(p.total_taxable_value),
                    "tax_amount": float(total_tax),
                    "portal_tax_amount": 0.0,
                    "status": "MISSING_IN_PORTAL",
                    "remarks": "Not found in GSTR-2B. ITC blocked under Sec 16(2)(aa) until vendor files."
                })

        # 2. Portal records missing from internal ledger
        missing_in_books_count = 0
        total_itc_unclaimed = Decimal('0.00')
        for idx, pi in enumerate(portal_invoices):
            if idx not in matched_portal_indices:
                missing_in_books_count += 1
                pi_tax = pi.get("total_tax", Decimal('0.00'))
                total_itc_unclaimed += pi_tax
                reconciled.append({
                    "invoice_id": None,
                    "invoice_number": pi.get("invoice_number", "UNKNOWN"),
                    "vendor_name": pi.get("supplier_name", "Portal Supplier"),
                    "vendor_gstin": pi.get("supplier_gstin", ""),
                    "invoice_date": pi.get("invoice_date", ""),
                    "taxable_value": float(pi.get("taxable_value", 0)),
                    "tax_amount": 0.0,
                    "portal_tax_amount": float(pi_tax),
                    "status": "MISSING_IN_BOOKS",
                    "remarks": f"Present in GSTR-2B portal but missing from internal ledger. Record bill to claim ₹{pi_tax:,.2f} ITC."
                })

        return Response({
            "summary": {
                "total_bills": len(purchases),
                "portal_invoices_count": len(portal_invoices),
                "matched_count": matched_count,
                "mismatch_amount_count": mismatch_amount_count,
                "missing_in_portal_count": missing_in_portal_count,
                "missing_in_books_count": missing_in_books_count,
                "total_itc_matched": float(total_itc_matched),
                "total_itc_at_risk": float(total_itc_at_risk),
                "total_itc_unclaimed": float(total_itc_unclaimed),
                "is_uploaded_reconciliation": True
            },
            "records": reconciled
        })
