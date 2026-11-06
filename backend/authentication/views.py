from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import BusinessProfile
from .serializers import BusinessProfileSerializer
from common.gst_utils import verify_gstin, get_state_name_from_gstin, STATE_CODES


class BusinessProfileViewSet(viewsets.ModelViewSet):
    """Manages the registered taxpayer business profile."""
    queryset = BusinessProfile.objects.all()
    serializer_class = BusinessProfileSerializer

    def get_object(self):
        profile = BusinessProfile.objects.first()
        if not profile:
            profile = BusinessProfile.objects.create(
                legal_name="Apex Tech Solutions Private Limited",
                trade_name="Apex GST Systems",
                gstin="27AAACT2727Q1ZW",
                state_code="27",
                state_name="Maharashtra",
                pan="AAACT2727Q",
                email="billing@apextech.example",
                phone="+91 98200 12345",
                address="Level 5, Platina Tech Park, Bandra Kurla Complex, Mumbai",
                pincode="400051",
                bank_name="HDFC Bank",
                bank_account_number="50200012345678",
                bank_ifsc="HDFC0000060"
            )
        return profile


class VerifyGSTINView(APIView):
    """
    Statutory 15-character GSTIN validator using the Modulo-36 algorithm.
    """
    def post(self, request):
        gstin = request.data.get('gstin', '').strip().upper()
        if not gstin:
            return Response({'valid': False, 'message': 'GSTIN is required.'}, status=status.HTTP_400_BAD_REQUEST)

        is_valid = verify_gstin(gstin)
        state_code = gstin[:2] if len(gstin) >= 2 else ""
        state_name = STATE_CODES.get(state_code, "Unknown State")
        pan = gstin[2:12] if len(gstin) >= 12 else ""

        return Response({
            'valid': is_valid,
            'gstin': gstin,
            'state_code': state_code,
            'state_name': state_name,
            'pan': pan,
            'message': 'Valid GSTIN format and Modulo-36 checksum verified.' if is_valid else 'Invalid GSTIN structure or failed checksum.'
        })


class StateCodesListView(APIView):
    """Returns statutory 2-digit state codes map."""
    def get(self, request):
        return Response([
            {"code": code, "name": name}
            for code, name in sorted(STATE_CODES.items())
        ])
