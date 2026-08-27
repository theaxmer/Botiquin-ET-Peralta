from django.contrib import admin
from .models import Militar, RebajeMedico, ArticuloSanitario, Lote

admin.site.register(Militar)
admin.site.register(RebajeMedico)
admin.site.register(ArticuloSanitario)
admin.site.register(Lote)