from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MilitarViewSet, RebajeMedicoViewSet, ArticuloSanitarioViewSet, LoteViewSet

# El router crea automáticamente las URLs para CRUD (Crear, Leer, Actualizar, Borrar)
router = DefaultRouter()
router.register(r'militares', MilitarViewSet)
router.register(r'rebajes', RebajeMedicoViewSet)
router.register(r'articulos', ArticuloSanitarioViewSet)
router.register(r'lotes', LoteViewSet)

urlpatterns = [
    path('', include(router.urls)),
]