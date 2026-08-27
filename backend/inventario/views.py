from rest_framework import viewsets
from django.core.mail import send_mail
from django.conf import settings
from .models import Militar, RebajeMedico, ArticuloSanitario, Lote
from .serializers import MilitarSerializer, RebajeMedicoSerializer, ArticuloSanitarioSerializer, LoteSerializer

class MilitarViewSet(viewsets.ModelViewSet):
    queryset = Militar.objects.all()
    serializer_class = MilitarSerializer

class RebajeMedicoViewSet(viewsets.ModelViewSet):
    queryset = RebajeMedico.objects.all()
    serializer_class = RebajeMedicoSerializer

    # AHORA SÍ ESTÁ DENTRO DE LA CLASE
    def perform_create(self, serializer):
        # 1. Guardamos el rebaje
        rebaje = serializer.save()
        militar = rebaje.militar

        # 2. Preparamos el mensaje
        asunto = f"NOVEDAD MÉDICA {militar.empleo} {militar.apellidos} ({militar.compania})"
        estado_baja = "BAJA TOTAL" if rebaje.baja_total else "Rebaje Parcial"
        
        mensaje = f"""
        INFORME DE BOTIQUIN
        --------------------------------------------------
        Se ha registrado una nueva asistencia médica:
        
        - Datos: {militar.empleo} {militar.nombre} {militar.apellidos}
        - Unidad: {militar.compania}
        - Estado: {estado_baja}
        - Diagnóstico/Observaciones: {rebaje.observaciones}
        - Fecha de Revisión: {rebaje.fecha_revision}
        
        Este es un mensaje automático del Sistema de Botiquín Digital.
        """

        # 3. Enrutamiento táctico: Elegimos el destinatario según la CIA
        diccionario_correos = {
            '1ºCIA': 'CIA1.PROYECTO.PERALTA@outlook.es',
            '2ºCIA': 'CIA2.PROYECTO.PERALTA@outlook.es',
            '3ºCIA': 'CIA3.PROYECTO.PERALTA@outlook.es',
            '4ºCIA': 'CIA4.PROYECTO.PERALTA@outlook.es',
            '5ºCIA': 'CIA5.PROYECTO.PERALTA@outlook.es',
            'PLANA': 'PLANA.PROYECTO.PERALTA@outlook.es'
        }

        correo_plana = 'PLANA.PROYECTO.PERALTA@outlook.es'
        
        destinatarios = [correo_plana] 

        correo_cia = diccionario_correos.get(militar.compania)
        
        
        if correo_cia and correo_cia != correo_plana:
            destinatarios.append(correo_cia)
        try:
            send_mail(
                subject=asunto,
                message=mensaje,
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=destinatarios,
                fail_silently=False, 
            )
            print(f"Correo enviado con éxito a {militar.compania} ({correo_destino})", flush=True)
        except Exception as e:
            print(f"Error al enviar el correo: {e}", flush=True)

class ArticuloSanitarioViewSet(viewsets.ModelViewSet):
    queryset = ArticuloSanitario.objects.all()
    serializer_class = ArticuloSanitarioSerializer

class LoteViewSet(viewsets.ModelViewSet):
    queryset = Lote.objects.all()
    serializer_class = LoteSerializer