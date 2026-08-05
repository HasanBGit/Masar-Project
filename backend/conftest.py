import pytest

from accounts.models import ProjectMembership, Role, User
from core.models import Project


@pytest.fixture
def project(db):
    return Project.objects.create(name="Test Tower", slug="test-tower")


def _make_user(email):
    user = User.objects.create(email=email, username=email)
    user.set_password("testpass123")
    user.save()
    return user


@pytest.fixture
def owner_user(db, project):
    user = _make_user("owner@test.local")
    ProjectMembership.objects.create(user=user, project=project, role=Role.OWNER)
    return user


@pytest.fixture
def investor_user(db, project):
    user = _make_user("investor@test.local")
    ProjectMembership.objects.create(user=user, project=project, role=Role.INVESTOR)
    return user


@pytest.fixture
def consultant_user(db, project):
    user = _make_user("consultant@test.local")
    ProjectMembership.objects.create(user=user, project=project, role=Role.CONSULTANT)
    return user


@pytest.fixture
def contractor_user(db, project):
    user = _make_user("contractor@test.local")
    ProjectMembership.objects.create(user=user, project=project, role=Role.CONTRACTOR)
    return user
