from django.db import models


# --- MODULO DE PERSONAL (Simulacion de la BD del ET) ---
class Militar(models.Model):
    # Definimos las 6 compañías tácticas disponibles
    OPCIONES_COMPANIA = [
        ('1ºCIA', '1ª Compañía'),
        ('2ºCIA', '2ª Compañía'),
        ('3ºCIA', '3ª Compañía'),
        ('4ºCIA', '4ª Compañía'),
        ('5ºCIA', '5ª Compañía'),
        ('PLANA', 'Plana Mayor'),
    ]

    dni = models.CharField(max_length=9, unique=True)
    empleo = models.CharField(max_length=50, help_text="Ej: Soldado, Sargento, Teniente...")
    nombre = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=150)
    
    # Aplicamos el selector estricto
    compania = models.CharField(
        max_length=10, 
        choices=OPCIONES_COMPANIA,
        default='1ºCIA'
    )
    
    email = models.EmailField(help_text="Correo para simulaciones de avisos")

    def __str__(self):
        return f"{self.empleo} {self.nombre} {self.apellidos} - {self.compania}"


class RebajeMedico(models.Model):
    militar = models.ForeignKey(Militar, on_delete=models.CASCADE)
    
    baja_total = models.BooleanField(default=False, help_text="Si se marca, representa una baja total.")
    rebaje_deporte = models.BooleanField(default=False)
    rebaje_botas = models.BooleanField(default=False)
    rebaje_instruccion = models.BooleanField(default=False)
    rebaje_orden_cerrado = models.BooleanField(default=False)

    fecha_inicio = models.DateField(auto_now_add=True)
    fecha_revision = models.DateField(help_text="Fecha en la que debe volver al botiquín")
    observaciones = models.TextField(blank=True, null=True)
    
    activo = models.BooleanField(default=True) 

    def __str__(self):
        estado = "EN VIGOR" if self.activo else "ALTA"
        
        if self.baja_total:
            tipo = "BAJA TOTAL"
        else:
            tipos = []
            if self.rebaje_deporte: tipos.append("Deporte")
            if self.rebaje_botas: tipos.append("Botas")
            if self.rebaje_instruccion: tipos.append("Instrucción")
            if self.rebaje_orden_cerrado: tipos.append("Orden Cerrado")
            tipo = "Rebaje: " + ", ".join(tipos) if tipos else "Sin especificar"
            
        return f"{self.militar.nombre} - {tipo} [{estado}]"


# --- MODULO DE INVENTARIO SANITARIO ---
class ArticuloSanitario(models.Model):
    codigo_barras = models.CharField(max_length=100, unique=True)
    nombre = models.CharField(max_length=150)
    requiere_caducidad = models.BooleanField(default=True) 

    def __str__(self):
        return self.nombre


class Lote(models.Model):
    articulo = models.ForeignKey(ArticuloSanitario, on_delete=models.CASCADE)
    fecha_caducidad = models.DateField(blank=True, null=True, help_text="Dejar en blanco si no caduca (ej: vendas)")
    cantidad = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.articulo.nombre} - Cad: {self.fecha_caducidad} (Stock: {self.cantidad})"