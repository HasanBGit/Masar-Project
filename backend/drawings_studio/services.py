"""
Service layer for the Drawings Studio module. Thin by design - the only
job here is validating an upload's extension and recording it, plus a
project-scoped delete. See skills/drawings-studio/SKILL.md for scope.
"""

from .models import ACCEPTED_FORMATS, DrawingModel


def _format_from_filename(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ACCEPTED_FORMATS:
        raise ValueError(
            f"Unsupported model format '.{ext}'. Accepted formats: {', '.join(ACCEPTED_FORMATS)}."
        )
    return ext


def create_drawing_model(*, project, uploaded_by, name: str, file) -> DrawingModel:
    import trust_evidence.services as trust_evidence

    fmt = _format_from_filename(file.name)
    model = DrawingModel.objects.create(project=project, name=name, file=file, format=fmt, uploaded_by=uploaded_by)
    trust_evidence.record_event(
        project=project, actor=uploaded_by, event_type="drawing_model_uploaded",
        subject_type="drawing_model", subject_id=model.id, payload={"name": name, "format": fmt},
    )
    return model


def delete_drawing_model(model: DrawingModel, deleted_by) -> None:
    import trust_evidence.services as trust_evidence

    project, model_id, name = model.project, model.id, model.name
    model.file.delete(save=False)
    model.delete()
    trust_evidence.record_event(
        project=project, actor=deleted_by, event_type="drawing_model_deleted",
        subject_type="drawing_model", subject_id=model_id, payload={"name": name},
    )
