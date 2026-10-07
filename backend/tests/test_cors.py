from app.core.config import settings
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)
ALLOWED = "http://localhost:3000"
NOT_ALLOWED = "https://evil.example"


def test_the_local_frontend_is_allowed_by_default():
    assert ALLOWED in settings.cors_origins


def test_a_request_from_the_frontend_gets_the_cors_header():
    response = client.get("/api/health", headers={"Origin": ALLOWED})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED


def test_preflight_from_the_frontend_is_accepted():
    # Browsers send this OPTIONS request before a POST with a JSON body.
    response = client.options(
        "/api/employees",
        headers={
            "Origin": ALLOWED,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ALLOWED
    assert "POST" in response.headers["access-control-allow-methods"]


def test_other_origins_get_no_cors_header():
    response = client.get("/api/health", headers={"Origin": NOT_ALLOWED})
    assert "access-control-allow-origin" not in response.headers


def test_preflight_from_another_origin_is_refused():
    response = client.options(
        "/api/employees",
        headers={"Origin": NOT_ALLOWED, "Access-Control-Request-Method": "POST"},
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
