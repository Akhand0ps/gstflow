from rest_framework import viewsets, filters
from .models import ProductItem
from .serializers import ProductItemSerializer


class ProductItemViewSet(viewsets.ModelViewSet):
    """
    CRUD for Goods and Services catalog with HSN/SAC codes and tax rates.
    """
    queryset = ProductItem.objects.filter(is_active=True)
    serializer_class = ProductItemSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'hsn_sac_code', 'description']
