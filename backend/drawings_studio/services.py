"""
Service layer for the Drawings Studio module. Thin by design - the only
job here is validating an upload's extension and recording it, plus a
project-scoped delete. See skills/drawings-studio/SKILL.md for scope.
"""

from .models import ACCEPTED_FORMATS, DrawingComment, DrawingModel


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


def create_drawing_comment(
    *, model: DrawingModel, author, body: str, parent: DrawingComment | None = None,
    position: dict | None = None, viewpoint: dict | None = None,
) -> DrawingComment:
    """Root comments (no parent) may carry a position/viewpoint pin; replies never do."""
    import trust_evidence.services as trust_evidence

    comment = DrawingComment.objects.create(
        model=model, author=author, body=body, parent=parent,
        position_x=(position or {}).get("x") if parent is None else None,
        position_y=(position or {}).get("y") if parent is None else None,
        position_z=(position or {}).get("z") if parent is None else None,
        viewpoint=viewpoint if parent is None else None,
    )
    trust_evidence.record_event(
        project=model.project, actor=author, event_type="drawing_comment_added",
        subject_type="drawing_model", subject_id=model.id, payload={"comment_id": comment.id},
    )
    return comment


def set_drawing_comment_resolved(comment: DrawingComment, resolved: bool, actor) -> DrawingComment:
    import trust_evidence.services as trust_evidence

    comment.resolved = resolved
    comment.save(update_fields=["resolved", "updated_at"])
    trust_evidence.record_event(
        project=comment.model.project, actor=actor,
        event_type="drawing_comment_resolved" if resolved else "drawing_comment_reopened",
        subject_type="drawing_model", subject_id=comment.model.id, payload={"comment_id": comment.id},
    )
    return comment
