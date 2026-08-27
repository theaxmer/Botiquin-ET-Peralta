from rest_framework import serializers
from .models import Militar, RebajeMedico, ArticuloSanitario, Lote

class MilitarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Militar
        fields = '__all__'

class RebajeMedicoSerializer(serializers.ModelSerializer):
    # Esto nos traerá los datos del militar asociado en lugar de solo su ID
    militar_detalle = MilitarSerializer(source='militar', read_only=True)

    class Meta:
        model = RebajeMedico
        fields = '__all__'

class ArticuloSanitarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArticuloSanitario
        fields = '__all__'

class LoteSerializer(serializers.ModelSerializer):
    articulo_detalle = ArticuloSanitarioSerializer(source='articulo', read_only=True)

    class Meta:
        model = Lote
        fields = '__all__'