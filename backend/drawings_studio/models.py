from django.conf import settings
from django.db import models

from core.models import Project, TimeStampedModel

# Mesh formats the frontend viewer (three.js loaders, ported from
# OpenConstructionERP's meshImport/loaders.ts) can parse client-side.
# Keep in sync with frontend/src/features/drawings-studio/viewer/formats.ts.
ACCEPTED_FORMATS = ("obj", "3ds", "dae", "fbx", "lwo", "stl", "ply", "gltf", "glb", "usd", "usdz")


class DrawingModel(TimeStampedModel):
    """
    A single uploaded 3D model file. Deliberately just a stored file plus
    metadata - there is no per-element store, no BOQ-linking, no quantity
    extraction (see skills/drawings-studio/SKILL.md "Owns vs. does not
    own"). Parsing and rendering happen entirely client-side in the viewer.
    """

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="drawing_models")
    name = models.CharField(max_length=200)
    file = models.FileField(upload_to="drawing_models/%Y/%m/")
    format = models.CharField(max_length=10, choices=[(f, f) for f in ACCEPTED_FORMATS])
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["project"])]

    def __str__(self):
        return self.name
