from datetime import date
from django.http import HttpResponse
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Invoice
from .serializers import InvoiceSerializer
from compliance.services import InvoicePDFService


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    CRUD for GST Tax Invoices (Sales) and Purchase Bills.
    Includes custom endpoints for PDF generation and Rule 46 sequential numbering.
    """
    queryset = Invoice.objects.all().select_related('party').prefetch_related('items')
    serializer_class = InvoiceSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['invoice_number', 'party__legal_name', 'party__gstin']

    def get_queryset(self):
        qs = super().get_queryset()
        inv_type = self.request.query_params.get('invoice_type')
        if inv_type:
            qs = qs.filter(invoice_type=inv_type.upper())
        inv_status = self.request.query_params.get('status')
        if inv_status:
            qs = qs.filter(status=inv_status.upper())
        return qs

    @action(detail=False, methods=['get'])
    def next_number(self, request):
        """
        Calculates next consecutive invoice number for current financial year under Rule 46.
        Financial year in India runs April 1 to March 31.
        """
        inv_type = request.query_params.get('invoice_type', 'SALES').upper()
        prefix = "INV" if inv_type == 'SALES' else "PUR"
        
        today = date.today()
        # Compute financial year string (e.g., 2026-27)
        if today.month >= 4:
            fy = f"{today.year}-{str(today.year + 1)[-2:]}"
        else:
            fy = f"{today.year - 1}-{str(today.year)[-2:]}"

        base_prefix = f"{prefix}/{fy}/"
        existing_numbers = Invoice.objects.filter(
            invoice_type=inv_type,
            invoice_number__startswith=base_prefix
        ).values_list('invoice_number', flat=True)

        max_seq = 0
        for num in existing_numbers:
            try:
                seq = int(num.split('/')[-1])
                if seq > max_seq:
                    max_seq = seq
            except (ValueError, IndexError):
                pass

        next_serial = f"{base_prefix}{max_seq + 1:04d}"
        return Response({'next_invoice_number': next_serial, 'financial_year': fy})

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Marks invoice as paid."""
        invoice = self.get_object()
        invoice.status = 'PAID'
        invoice.save()
        return Response(self.get_serializer(invoice).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Marks invoice as cancelled under Rule 46.
        Maintains consecutive serial audit trail without deleting database record.
        """
        invoice = self.get_object()
        invoice.status = 'CANCELLED'
        invoice.save()
        return Response(self.get_serializer(invoice).data)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generates and downloads the official Rule 46 GST Tax Invoice PDF."""
        invoice = self.get_object()
        pdf_buffer = InvoicePDFService.generate_pdf(invoice)
        filename = f"Tax_Invoice_{invoice.invoice_number.replace('/', '_')}.pdf"
        
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['post'])
    def recalculate(self, request, pk=None):
        """Explicitly recomputes tax splits, rounding, and totals."""
        invoice = self.get_object()
        invoice.recalculate_totals()
        invoice.save()
        return Response(self.get_serializer(invoice).data)
