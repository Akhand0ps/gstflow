"""
URL configuration for GST Flow project.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from authentication.views import BusinessProfileViewSet, VerifyGSTINView, StateCodesListView
from parties.views import PartyViewSet
from catalog.views import ProductItemViewSet
from transactions.views import InvoiceViewSet
from compliance.views import (
    DashboardSummaryView,
    GSTR1ReportView,
    GSTR3BReportView,
    GSTR2BReconcilerView
)

router = DefaultRouter()
router.register(r'parties', PartyViewSet, basename='party')
router.register(r'catalog', ProductItemViewSet, basename='catalog')
router.register(r'invoices', InvoiceViewSet, basename='invoice')

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Core Domain Router
    path('api/', include(router.urls)),

    # Business Profile & GSTIN verification
    path('api/business/profile/', BusinessProfileViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update'}), name='business-profile'),
    path('api/gstin/verify/', VerifyGSTINView.as_view(), name='gstin-verify'),
    path('api/states/', StateCodesListView.as_view(), name='states-list'),

    # Statutory Compliance & Returns
    path('api/compliance/dashboard/', DashboardSummaryView.as_view(), name='compliance-dashboard'),
    path('api/compliance/gstr1/', GSTR1ReportView.as_view(), name='compliance-gstr1'),
    path('api/compliance/gstr3b/', GSTR3BReportView.as_view(), name='compliance-gstr3b'),
    path('api/compliance/reconcile-2b/', GSTR2BReconcilerView.as_view(), name='compliance-reconcile-2b'),

    # Interactive API Documentation (OpenAPI 3 / Swagger)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
