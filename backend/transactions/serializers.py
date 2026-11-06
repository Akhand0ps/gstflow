from decimal import Decimal
from rest_framework import serializers
from .models import Invoice, InvoiceItem
from parties.serializers import PartySerializer


class InvoiceItemSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)

    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'product', 'item_description', 'hsn_sac_code', 'uqc_unit',
            'quantity', 'unit_price', 'discount_amount', 'taxable_value',
            'gst_rate', 'cgst_rate', 'cgst_amount', 'sgst_rate', 'sgst_amount',
            'igst_rate', 'igst_amount', 'cess_amount', 'total_item_value'
        ]
        read_only_fields = [
            'taxable_value', 'cgst_rate', 'cgst_amount', 'sgst_rate', 'sgst_amount',
            'igst_rate', 'igst_amount', 'total_item_value'
        ]


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)
    party_details = PartySerializer(source='party', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_type', 'invoice_number', 'invoice_date',
            'party', 'party_details', 'place_of_supply_state_code', 'place_of_supply_state_name',
            'is_inter_state', 'is_reverse_charge',
            'total_taxable_value', 'total_cgst', 'total_sgst', 'total_igst', 'total_cess',
            'round_off_amount', 'grand_total', 'grand_total_words',
            'status', 'idempotency_key', 'notes', 'items',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'place_of_supply_state_name', 'is_inter_state',
            'total_taxable_value', 'total_cgst', 'total_sgst', 'total_igst', 'total_cess',
            'round_off_amount', 'grand_total', 'grand_total_words'
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        invoice = Invoice.objects.create(**validated_data)
        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)
        invoice.recalculate_totals()
        invoice.save()
        return invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                InvoiceItem.objects.create(invoice=instance, **item_data)
            instance.recalculate_totals()
            instance.save()

        return instance

