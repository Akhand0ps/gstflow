from rest_framework import serializers
from .models import Party
from common.gst_utils import verify_gstin


class PartySerializer(serializers.ModelSerializer):
    class Meta:
        model = Party
        fields = '__all__'

    def validate_gstin(self, value):
        if value:
            v = value.strip().upper()
            if not verify_gstin(v):
                raise serializers.ValidationError("Invalid 15-character GSTIN. Failed Modulo-36 checksum verification.")
            return v
        return value

