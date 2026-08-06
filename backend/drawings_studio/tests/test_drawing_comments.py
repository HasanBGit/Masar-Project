import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from drawings_studio.models import DrawingComment
from drawings_studio.services import create_drawing_comment, create_drawing_model, set_drawing_comment_resolved
from trust_evidence.services import get_audit_events


def _gltf_file(name="tower.gltf"):
    return SimpleUploadedFile(name, b"{}", content_type="model/gltf+json")


@pytest.fixture
def drawing_model(project, project_manager_user):
    return create_drawing_model(project=project, uploaded_by=project_manager_user, name="Tower shell", file=_gltf_file())


@pytest.mark.django_db
def test_create_root_comment_stores_position_and_viewpoint_and_records_audit_event(drawing_model, consultant_user):
    comment = create_drawing_comment(
        model=drawing_model, author=consultant_user, body="Move this column 2m east.",
        position={"x": 1.5, "y": 2.0, "z": -3.25},
        viewpoint={"position": {"x": 10, "y": 10, "z": 10}, "target": {"x": 0, "y": 0, "z": 0}},
    )
    assert comment.position_x == 1.5
    assert comment.position_y == 2.0
    assert comment.position_z == -3.25
    assert comment.viewpoint["target"]["x"] == 0
    assert comment.resolved is False

    events = get_audit_events(drawing_model.project, event_type="drawing_comment_added")
    assert len(events) == 1
    assert events[0].payload["comment_id"] == comment.id


@pytest.mark.django_db
def test_reply_never_carries_position_even_if_passed(drawing_model, consultant_user, designer_user):
    root = create_drawing_comment(model=drawing_model, author=consultant_user, body="Please review.", position={"x": 1, "y": 1, "z": 1})
    reply = create_drawing_comment(model=drawing_model, author=designer_user, body="Done.", parent=root, position={"x": 9, "y": 9, "z": 9})
    assert reply.position_x is None
    assert reply.parent_id == root.id


@pytest.mark.django_db
def test_set_resolved_toggles_and_records_audit_event(drawing_model, consultant_user):
    comment = create_drawing_comment(model=drawing_model, author=consultant_user, body="Fix this.", position={"x": 0, "y": 0, "z": 0})
    set_drawing_comment_resolved(comment, True, actor=consultant_user)
    comment.refresh_from_db()
    assert comment.resolved is True
    assert len(get_audit_events(drawing_model.project, event_type="drawing_comment_resolved")) == 1


@pytest.mark.django_db
def test_list_endpoint_requires_project_membership(drawing_model, consultant_user, django_user_model):
    create_drawing_comment(model=drawing_model, author=consultant_user, body="Comment", position={"x": 0, "y": 0, "z": 0})

    client = APIClient()
    client.force_authenticate(consultant_user)
    res = client.get("/api/v1/drawings-studio/comments/", {"model": drawing_model.id})
    assert res.status_code == 200
    assert res.data["count"] == 1

    outsider = django_user_model.objects.create(email="outsider2@test.local", username="outsider2@test.local")
    client.force_authenticate(outsider)
    res = client.get("/api/v1/drawings-studio/comments/", {"model": drawing_model.id})
    assert res.status_code == 404


@pytest.mark.django_db
def test_create_endpoint_creates_root_comment(drawing_model, designer_user):
    client = APIClient()
    client.force_authenticate(designer_user)
    res = client.post(
        "/api/v1/drawings-studio/comments/",
        {
            "model": drawing_model.id, "body": "What's the clearance here?",
            "position_x": 3, "position_y": 4, "position_z": 5,
            "viewpoint": {"position": {"x": 1, "y": 2, "z": 3}, "target": {"x": 0, "y": 0, "z": 0}},
        },
        format="json",
    )
    assert res.status_code == 201
    assert res.data["position_x"] == 3
    assert res.data["author"] == designer_user.id


@pytest.mark.django_db
def test_create_endpoint_rejects_reply_from_a_different_model(project, project_manager_user, consultant_user):
    model_a = create_drawing_model(project=project, uploaded_by=project_manager_user, name="A", file=_gltf_file("a.gltf"))
    model_b = create_drawing_model(project=project, uploaded_by=project_manager_user, name="B", file=_gltf_file("b.gltf"))
    root = create_drawing_comment(model=model_a, author=consultant_user, body="Root", position={"x": 0, "y": 0, "z": 0})

    client = APIClient()
    client.force_authenticate(consultant_user)
    res = client.post(
        "/api/v1/drawings-studio/comments/",
        {"model": model_b.id, "body": "Cross-model reply", "parent": root.id},
        format="json",
    )
    assert res.status_code == 400


@pytest.mark.django_db
def test_patch_resolved_endpoint(drawing_model, consultant_user):
    comment = create_drawing_comment(model=drawing_model, author=consultant_user, body="Fix this.", position={"x": 0, "y": 0, "z": 0})

    client = APIClient()
    client.force_authenticate(consultant_user)
    res = client.patch(f"/api/v1/drawings-studio/comments/{comment.id}/", {"resolved": True}, format="json")
    assert res.status_code == 200
    assert res.data["resolved"] is True


@pytest.mark.django_db
def test_only_author_can_edit_comment_body(drawing_model, consultant_user, designer_user):
    comment = create_drawing_comment(model=drawing_model, author=consultant_user, body="Original.", position={"x": 0, "y": 0, "z": 0})

    client = APIClient()
    client.force_authenticate(designer_user)
    res = client.patch(f"/api/v1/drawings-studio/comments/{comment.id}/", {"body": "Edited by someone else."}, format="json")
    assert res.status_code == 403

    client.force_authenticate(consultant_user)
    res = client.patch(f"/api/v1/drawings-studio/comments/{comment.id}/", {"body": "Edited by the author."}, format="json")
    assert res.status_code == 200
    assert res.data["body"] == "Edited by the author."


@pytest.mark.django_db
def test_destroy_endpoint_gates_to_author_or_owner_admin(drawing_model, consultant_user, designer_user, owner_user):
    comment = create_drawing_comment(model=drawing_model, author=designer_user, body="Mine.", position={"x": 0, "y": 0, "z": 0})

    client = APIClient()
    client.force_authenticate(consultant_user)
    res = client.delete(f"/api/v1/drawings-studio/comments/{comment.id}/")
    assert res.status_code == 403

    client.force_authenticate(owner_user)
    res = client.delete(f"/api/v1/drawings-studio/comments/{comment.id}/")
    assert res.status_code == 204
    assert not DrawingComment.objects.filter(id=comment.id).exists()
