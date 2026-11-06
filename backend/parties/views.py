from rest_framework import viewsets, filters
from .models import Party
from .serializers import PartySerializer


class PartyViewSet(viewsets.ModelViewSet):
    """
    CRUD for Customers (Buyers) and Vendors (Suppliers).
    Allows filtering by party_type and searching by legal_name or GSTIN.
    """
    queryset = Party.objects.all()
    serializer_class = PartySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['legal_name', 'trade_name', 'gstin', 'pan', 'phone']

    def get_queryset(self):
        qs = super().get_queryset()
        party_type = self.request.query_params.get('party_type')
        if party_type:
            qs = qs.filter(party_type=party_type.upper())
        return qs
