"""Test setup. Tests run against a real PostgreSQL database.

Point TEST_DATABASE_URL at an EMPTY database you don't mind being wiped, e.g.
  TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/growth_test pytest
"""
import os

import pytest

TEST_DB = os.environ.get("TEST_DATABASE_URL")
if not TEST_DB:
    pytest.exit("Set TEST_DATABASE_URL to an empty PostgreSQL database before running tests.", returncode=1)
os.environ["DATABASE_URL"] = TEST_DB
os.environ["SECRET_KEY"] = "test-secret-key-that-is-long-enough-123456"

from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def register(client, email="me@example.com", password="correct-horse-9", name="Tester"):
    res = client.post(
        "/api/auth/register",
        json={"name": name, "email": email, "password": password, "timezone": "Asia/Kolkata"},
    )
    assert res.status_code == 201, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.fixture
def auth(client):
    return register(client)
