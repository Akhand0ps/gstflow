"""
Statutory GST Compliance Engines: GSTR-1 Generator, GSTR-3B Settlement Engine,
and ReportLab PDF Tax Invoice Generator.
"""
from io import BytesIO
from decimal import Decimal
from django.db.models import Sum, Count
from transactions.models import Invoice, InvoiceItem
from authentication.models import BusinessProfile
from common.gst_utils import round_currency, round_statutory_rupee

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


class GSTR1Service:
    """
    Assembles official GSTR-1 JSON payloads formatted according to the
    statutory GST offline utility tool.
    """
    @staticmethod
    def generate_report(year: int, month: int):
        business = BusinessProfile.objects.first()
        fp = f"{month:02d}{year}"
        
        # Outward sales invoices for given tax period
        sales_invoices = Invoice.objects.filter(
            invoice_type='SALES',
            invoice_date__year=year,
            invoice_date__month=month,
            status__in=['ISSUED', 'PAID']
        )

        b2b_list = []
        b2cl_list = []
        b2cs_dict = {}  # Key: (pos, rate)
        hsn_dict = {}   # Key: (hsn, uqc, rate)

        for inv in sales_invoices:
            party = inv.party
            
            # 1. Table 4: B2B Invoices (Registered buyers)
            if party.is_registered and party.gstin:
                items_payload = []
                for idx, itm in enumerate(inv.items.all(), 1):
                    items_payload.append({
                        "num": idx,
                        "itm_det": {
                            "rt": float(itm.gst_rate),
                            "txval": float(itm.taxable_value),
                            "iamt": float(itm.igst_amount),
                            "camt": float(itm.cgst_amount),
                            "samt": float(itm.sgst_amount),
                            "csamt": float(itm.cess_amount)
                        }
                    })
                b2b_list.append({
                    "ctin": party.gstin,
                    "inv": [{
                        "inum": inv.invoice_number,
                        "idt": inv.invoice_date.strftime("%d-%m-%Y"),
                        "val": float(inv.grand_total),
                        "pos": inv.place_of_supply_state_code,
                        "rchrg": "Y" if inv.is_reverse_charge else "N",
                        "inv_typ": "R",
                        "itms": items_payload
                    }]
                })
            else:
                # Unregistered Buyer
                # 2. Table 5: B2C Large (Inter-state & invoice value > 2.5L)
                if inv.is_inter_state and inv.grand_total > Decimal('250000.00'):
                    for itm in inv.items.all():
                        b2cl_list.append({
                            "pos": inv.place_of_supply_state_code,
                            "inv": [{
                                "inum": inv.invoice_number,
                                "idt": inv.invoice_date.strftime("%d-%m-%Y"),
                                "val": float(inv.grand_total),
                                "itms": [{
                                    "num": 1,
                                    "itm_det": {
                                        "rt": float(itm.gst_rate),
                                        "txval": float(itm.taxable_value),
                                        "iamt": float(itm.igst_amount),
                                        "csamt": float(itm.cess_amount)
                                    }
                                }]
                            }]
                        })
                else:
                    # 3. Table 7: B2C Small (Aggregated by POS and Rate)
                    for itm in inv.items.all():
                        key = (inv.place_of_supply_state_code, float(itm.gst_rate))
                        if key not in b2cs_dict:
                            b2cs_dict[key] = {
                                "sply_ty": "INTER" if inv.is_inter_state else "INTRA",
                                "pos": inv.place_of_supply_state_code,
                                "rt": float(itm.gst_rate),
                                "txval": Decimal('0.00'),
                                "iamt": Decimal('0.00'),
                                "camt": Decimal('0.00'),
                                "samt": Decimal('0.00'),
                                "csamt": Decimal('0.00')
                            }
                        b2cs_dict[key]["txval"] += itm.taxable_value
                        b2cs_dict[key]["iamt"] += itm.igst_amount
                        b2cs_dict[key]["camt"] += itm.cgst_amount
                        b2cs_dict[key]["samt"] += itm.sgst_amount

            # 4. Table 12: HSN Summary
            for itm in inv.items.all():
                hkey = (itm.hsn_sac_code, itm.uqc_unit, float(itm.gst_rate))
                if hkey not in hsn_dict:
                    hsn_dict[hkey] = {
                        "hsn_sc": itm.hsn_sac_code,
                        "desc": itm.item_description,
                        "uqc": itm.uqc_unit,
                        "qty": Decimal('0.00'),
                        "val": Decimal('0.00'),
                        "txval": Decimal('0.00'),
                        "iamt": Decimal('0.00'),
                        "camt": Decimal('0.00'),
                        "samt": Decimal('0.00'),
                        "csamt": Decimal('0.00'),
                    }
                hsn_dict[hkey]["qty"] += itm.quantity
                hsn_dict[hkey]["val"] += itm.total_item_value
                hsn_dict[hkey]["txval"] += itm.taxable_value
                hsn_dict[hkey]["iamt"] += itm.igst_amount
                hsn_dict[hkey]["camt"] += itm.cgst_amount
                hsn_dict[hkey]["samt"] += itm.sgst_amount

        # Format B2CS
        b2cs_list = []
        for val in b2cs_dict.values():
            b2cs_list.append({
                "sply_ty": val["sply_ty"],
                "pos": val["pos"],
                "rt": val["rt"],
                "txval": float(val["txval"]),
                "iamt": float(val["iamt"]),
                "camt": float(val["camt"]),
                "samt": float(val["samt"]),
                "csamt": float(val["csamt"])
            })

        # Format HSN
        hsn_list = []
        for val in hsn_dict.values():
            hsn_list.append({
                "num": len(hsn_list) + 1,
                "hsn_sc": val["hsn_sc"],
                "desc": val["desc"],
                "uqc": val["uqc"],
                "qty": float(val["qty"]),
                "val": float(val["val"]),
                "txval": float(val["txval"]),
                "iamt": float(val["iamt"]),
                "camt": float(val["camt"]),
                "samt": float(val["samt"]),
                "csamt": float(val["csamt"])
            })

        # Table 13: Document Summary
        first_inv = sales_invoices.order_by('invoice_number').first()
        last_inv = sales_invoices.order_by('invoice_number').last()
        doc_issue = {
            "doc_det": [{
                "doc_num": 1,
                "doc_typ": "Invoices for outward supply",
                "from": first_inv.invoice_number if first_inv else "None",
                "to": last_inv.invoice_number if last_inv else "None",
                "totnum": sales_invoices.count(),
                "canc": 0,
                "net_issue": sales_invoices.count()
            }]
        }

        return {
            "gstin": business.gstin if business else "27AAACT2727Q1ZW",
            "fp": fp,
            "version": "GSTR1_v2.0",
            "b2b": b2b_list,
            "b2cl": b2cl_list,
            "b2cs": b2cs_list,
            "hsn": {"data": hsn_list},
            "doc_issue": doc_issue,
            "summary": {
                "total_invoices": sales_invoices.count(),
                "total_taxable_value": float(sales_invoices.aggregate(Sum('total_taxable_value'))['total_taxable_value__sum'] or 0),
                "total_cgst": float(sales_invoices.aggregate(Sum('total_cgst'))['total_cgst__sum'] or 0),
                "total_sgst": float(sales_invoices.aggregate(Sum('total_sgst'))['total_sgst__sum'] or 0),
                "total_igst": float(sales_invoices.aggregate(Sum('total_igst'))['total_igst__sum'] or 0),
                "grand_total": float(sales_invoices.aggregate(Sum('grand_total'))['grand_total__sum'] or 0),
            }
        }


class GSTR3BService:
    """
    Computes monthly GSTR-3B tax returns, aggregating Output Liability from Sales,
    Eligible Input Tax Credit (ITC) from Purchases, and executing the statutory
    Sections 49, 49A, 49B set-off cascade.
    """
    @staticmethod
    def calculate_return(year: int, month: int):
        # 1. Output Tax Liability (Sales)
        sales = Invoice.objects.filter(
            invoice_type='SALES',
            invoice_date__year=year,
            invoice_date__month=month,
            status__in=['ISSUED', 'PAID']
        )
        out_txval = sales.aggregate(Sum('total_taxable_value'))['total_taxable_value__sum'] or Decimal('0.00')
        out_cgst = sales.aggregate(Sum('total_cgst'))['total_cgst__sum'] or Decimal('0.00')
        out_sgst = sales.aggregate(Sum('total_sgst'))['total_sgst__sum'] or Decimal('0.00')
        out_igst = sales.aggregate(Sum('total_igst'))['total_igst__sum'] or Decimal('0.00')

        # 2. Eligible Input Tax Credit (Purchases)
        purchases = Invoice.objects.filter(
            invoice_type='PURCHASE',
            invoice_date__year=year,
            invoice_date__month=month,
            status__in=['ISSUED', 'PAID']
        )
        in_txval = purchases.aggregate(Sum('total_taxable_value'))['total_taxable_value__sum'] or Decimal('0.00')
        in_cgst = purchases.aggregate(Sum('total_cgst'))['total_cgst__sum'] or Decimal('0.00')
        in_sgst = purchases.aggregate(Sum('total_sgst'))['total_sgst__sum'] or Decimal('0.00')
        in_igst = purchases.aggregate(Sum('total_igst'))['total_igst__sum'] or Decimal('0.00')

        # 3. Statutory ITC Offset Cascade (Sec 49, 49A, 49B)
        l_igst, l_cgst, l_sgst = out_igst, out_cgst, out_sgst
        c_igst, c_cgst, c_sgst = in_igst, in_cgst, in_sgst

        # Step 1: Exhaust IGST Credit First
        used_igst_igst = min(c_igst, l_igst)
        c_igst -= used_igst_igst
        l_igst -= used_igst_igst

        used_igst_cgst = min(c_igst, l_cgst)
        c_igst -= used_igst_cgst
        l_cgst -= used_igst_cgst

        used_igst_sgst = min(c_igst, l_sgst)
        c_igst -= used_igst_sgst
        l_sgst -= used_igst_sgst

        # Step 2: Utilize CGST Credit
        used_cgst_cgst = min(c_cgst, l_cgst)
        c_cgst -= used_cgst_cgst
        l_cgst -= used_cgst_cgst

        used_cgst_igst = min(c_cgst, l_igst)
        c_cgst -= used_cgst_igst
        l_igst -= used_cgst_igst

        # Step 3: Utilize SGST Credit
        used_sgst_sgst = min(c_sgst, l_sgst)
        c_sgst -= used_sgst_sgst
        l_sgst -= used_sgst_sgst

        used_sgst_igst = min(c_sgst, l_igst)
        c_sgst -= used_sgst_igst
        l_igst -= used_sgst_igst

        total_cash = l_igst + l_cgst + l_sgst

        return {
            "period": f"{month:02d}/{year}",
            "table_3_1_output_liability": {
                "taxable_value": float(out_txval),
                "cgst": float(out_cgst),
                "sgst": float(out_sgst),
                "igst": float(out_igst),
                "total_tax": float(out_cgst + out_sgst + out_igst)
            },
            "table_4_eligible_itc": {
                "taxable_value": float(in_txval),
                "cgst": float(in_cgst),
                "sgst": float(in_sgst),
                "igst": float(in_igst),
                "total_itc": float(in_cgst + in_sgst + in_igst)
            },
            "itc_utilized": {
                "igst_used": float(in_igst - c_igst),
                "cgst_used": float(in_cgst - c_cgst),
                "sgst_used": float(in_sgst - c_sgst),
            },
            "net_cash_payable": {
                "igst": float(round_statutory_rupee(l_igst)),
                "cgst": float(round_statutory_rupee(l_cgst)),
                "sgst": float(round_statutory_rupee(l_sgst)),
                "total_cash_payable": float(round_statutory_rupee(total_cash))
            },
            "itc_carried_forward": {
                "igst": float(c_igst),
                "cgst": float(c_cgst),
                "sgst": float(c_sgst),
                "total_itc_balance": float(c_igst + c_cgst + c_sgst)
            }
        }


class InvoicePDFService:
    """
    Generates a professional GST Tax Invoice PDF complying with Rule 46.
    """
    @staticmethod
    def generate_pdf(invoice: Invoice) -> BytesIO:
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
        elements = []
        styles = getSampleStyleSheet()

        business = BusinessProfile.objects.first()
        party = invoice.party

        # Title
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontSize=16,
            leading=20,
            textColor=colors.HexColor('#0f172a'),
            alignment=1
        )
        elements.append(Paragraph("<b>TAX INVOICE</b>", title_style))
        elements.append(Paragraph("<font size=8 color='#64748b'>(Issued under Rule 46 of CGST Rules 2017)</font>", ParagraphStyle('Sub', alignment=1)))
        elements.append(Spacer(1, 15))

        # Header Information Table
        supplier_info = f"""
        <b>{business.trade_name or business.legal_name if business else 'GST Provider'}</b><br/>
        GSTIN: <b>{business.gstin if business else 'N/A'}</b><br/>
        State: {business.state_name if business else 'N/A'} (Code: {business.state_code if business else 'N/A'})<br/>
        Address: {business.address if business else 'N/A'}<br/>
        Email: {business.email if business else 'N/A'} | Phone: {business.phone if business else 'N/A'}
        """

        invoice_meta = f"""
        Invoice No: <b>{invoice.invoice_number}</b><br/>
        Date of Issue: <b>{invoice.invoice_date.strftime('%d-%m-%Y')}</b><br/>
        Place of Supply: <b>{invoice.place_of_supply_state_name} ({invoice.place_of_supply_state_code})</b><br/>
        Supply Type: <b>{'Inter-State (IGST)' if invoice.is_inter_state else 'Intra-State (CGST + SGST)'}</b><br/>
        Reverse Charge: <b>{'Yes' if invoice.is_reverse_charge else 'No'}</b>
        """

        header_table = Table([
            [Paragraph(supplier_info, styles['Normal']), Paragraph(invoice_meta, styles['Normal'])]
        ], colWidths=[270, 260])
        header_table.setStyle(TableStyle([
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 8),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 10))

        # Recipient Info Table
        buyer_info = f"""
        <b>Billed To:</b><br/>
        Name: <b>{party.legal_name}</b><br/>
        GSTIN / UIN: <b>{party.gstin or 'Unregistered Consumer'}</b><br/>
        State: {party.state_name} (Code: {party.state_code})<br/>
        Billing Address: {party.billing_address}
        """
        buyer_table = Table([[Paragraph(buyer_info, styles['Normal'])]], colWidths=[530])
        buyer_table.setStyle(TableStyle([
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(buyer_table)
        elements.append(Spacer(1, 15))

        # Items Table
        item_headers = ['#', 'Description', 'HSN/SAC', 'Qty', 'Unit Rate', 'Taxable Val', 'GST %', 'Tax Amt', 'Total (₹)']
        item_rows = [item_headers]

        for idx, itm in enumerate(invoice.items.all(), 1):
            total_tax = itm.cgst_amount + itm.sgst_amount + itm.igst_amount
            item_rows.append([
                str(idx),
                Paragraph(itm.item_description, styles['Normal']),
                itm.hsn_sac_code,
                f"{itm.quantity} {itm.uqc_unit}",
                f"₹{itm.unit_price}",
                f"₹{itm.taxable_value}",
                f"{itm.gst_rate}%",
                f"₹{total_tax}",
                f"₹{itm.total_item_value}",
            ])

        items_table = Table(item_rows, colWidths=[20, 140, 50, 45, 55, 60, 40, 55, 65])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('ALIGN', (1,1), (1,-1), 'LEFT'),
            ('ALIGN', (4,1), (-1,-1), 'RIGHT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 12))

        # Tax Totals Summary Table
        summary_rows = [
            ['Total Taxable Value:', f"₹{invoice.total_taxable_value}"],
            ['CGST Amount:', f"₹{invoice.total_cgst}"],
            ['SGST Amount:', f"₹{invoice.total_sgst}"],
            ['IGST Amount:', f"₹{invoice.total_igst}"],
            ['Round-off Adjustment (Sec 170):', f"₹{invoice.round_off_amount}"],
            ['Grand Total Payable:', f"₹{invoice.grand_total}"],
        ]
        summary_table = Table(summary_rows, colWidths=[380, 150])
        summary_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
            ('FONTSIZE', (0,0), (-1,-1), 8.5),
            ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
            ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#e2e8f0')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('TOPPADDING', (0,0), (-1,-1), 3),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 12))

        # Amount in Words & Bank Details
        words_paragraph = f"<b>Amount in Words:</b> {invoice.grand_total_words}"
        elements.append(Paragraph(words_paragraph, styles['Normal']))
        elements.append(Spacer(1, 15))

        if business and business.bank_account_number:
            bank_info = f"""
            <b>Bank Account for NEFT/RTGS:</b><br/>
            Bank Name: {business.bank_name} | A/C No: {business.bank_account_number} | IFSC Code: {business.bank_ifsc}
            """
            elements.append(Paragraph(bank_info, styles['Normal']))
            elements.append(Spacer(1, 15))

        # Footer Signature
        sign_table = Table([
            ['', 'For ' + (business.trade_name if business else 'Authorized Signatory') + '\n\n\n\nAuthorized Signatory']
        ], colWidths=[330, 200])
        sign_table.setStyle(TableStyle([
            ('ALIGN', (1,0), (1,0), 'RIGHT'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
        ]))
        elements.append(sign_table)

        doc.build(elements)
        buffer.seek(0)
        return buffer

