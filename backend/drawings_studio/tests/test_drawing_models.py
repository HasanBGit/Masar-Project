import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from drawings_studio.models import DrawingModel
from drawings_studio.services import create_drawing_model, delete_drawing_model
from trust_evidence.services import get_audit_events


def _gltf_file(name="tower.gltf"):
    return SimpleUploadedFile(name, b"{}", content_type="model/gltf+json")


@pytest.mark.django_db
def test_create_drawing_model_derives_format_and_records_audit_event(project, project_manager_user):
    model = create_drawing_model(project=project, uploaded_by=project_manager_user, name="Tower shell", file=_gltf_file())
    assert model.format == "gltf"
    assert model.project == project

    events = get_audit_events(project, event_type="drawing_model_uploaded")
    assert len(events) == 1
    assert events[0].payload["name"] == "Tower shell"


@pytest.mark.django_db
def test_create_drawing_model_rejects_unsupported_extension(project, project_manager_user):
    with pytest.raises(ValueError):
        create_drawing_model(project=project, uploaded_by=project_manager_user, name="Bad file", file=_gltf_file("plan.rvt"))


@pytest.mark.django_db
def test_delete_drawing_model_removes_row_and_records_audit_event(project, project_manager_user):
    model = create_drawing_model(project=project, uploaded_by=project_manager_user, name="Tower shell", file=_gltf_file())
    delete_drawing_model(model, deleted_by=project_manager_user)

    assert not DrawingModel.objects.filter(id=model.id).exists()
    events = get_audit_events(project, event_type="drawing_model_deleted")
    assert len(events) == 1


@pytest.mark.django_db
def test_list_endpoint_requires_project_membership(project, project_manager_user, django_user_model):
    create_drawing_model(project=project, uploaded_by=project_manager_user, name="Tower shell", file=_gltf_file())

    client = APIClient()
    client.force_authenticate(project_manager_user)
    res = client.get("/api/v1/drawings-studio/models/", {"project": project.id})
    assert res.status_code == 200
    assert res.data["count"] == 1

    outsider = django_user_model.objects.create(email="outsider@test.local", username="outsider@test.local")
    client.force_authenticate(outsider)
    res = client.get("/api/v1/drawings-studio/models/", {"project": project.id})
    assert res.status_code == 404


@pytest.mark.django_db
def test_upload_endpoint_accepts_valid_file_and_rejects_unsupported(project, project_manager_user):
    client = APIClient()
    client.force_authenticate(project_manager_user)

    res = client.post(
        "/api/v1/drawings-studio/models/",
        {"project": project.id, "name": "Tower shell", "file": _gltf_file()},
        format="multipart",
    )
    assert res.status_code == 201
    assert res.data["format"] == "gltf"

    res = client.post(
        "/api/v1/drawings-studio/models/",
        {"project": project.id, "name": "Bad file", "file": _gltf_file("plan.rvt")},
        format="multipart",
    )
    assert res.status_code == 400


@pytest.mark.django_db
def test_destroy_endpoint_deletes_model(project, project_manager_user):
    model = create_drawing_model(project=project, uploaded_by=project_manager_user, name="Tower shell", file=_gltf_file())

    client = APIClient()
    client.force_authenticate(project_manager_user)
    res = client.delete(f"/api/v1/drawings-studio/models/{model.id}/")
    assert res.status_code == 204
    assert not DrawingModel.objects.filter(id=model.id).exists()
