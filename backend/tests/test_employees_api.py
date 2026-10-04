def create(client, payload, **overrides):
    response = client.post("/api/employees", json=payload(**overrides))
    assert response.status_code == 201, response.text
    return response.json()


# ---------- create ----------


def test_create_returns_201_with_the_saved_employee(client, payload):
    body = create(client, payload)

    assert body["id"] >= 1
    assert body["full_name"] == "Megha Bansal"
    assert body["salary"] == 2_400_000
    assert body["hire_date"] == "2021-06-01"
    assert "created_at" in body and "updated_at" in body


def test_create_normalizes_the_email(client, payload):
    body = create(client, payload, email="  Megha.Bansal@ACME.com ")
    assert body["email"] == "megha.bansal@acme.com"


def test_create_with_invalid_data_returns_422_listing_the_fields(client, payload):
    response = client.post("/api/employees", json=payload(salary=-5, email="nope"))

    assert response.status_code == 422
    body = response.json()
    assert body["detail"] == "Validation failed"
    assert {error["field"] for error in body["errors"]} == {"salary", "email"}


def test_validation_messages_have_no_pydantic_prefix(client, payload):
    response = client.post("/api/employees", json=payload(country="DE", currency="USD"))

    assert response.status_code == 422
    assert response.json()["errors"] == [
        {"field": "currency", "message": "Currency for DE must be EUR"}
    ]


def test_create_duplicate_email_returns_409(client, payload):
    create(client, payload)
    response = client.post("/api/employees", json=payload(full_name="Someone Else"))

    assert response.status_code == 409
    assert response.json() == {"detail": "An employee with this email already exists"}


def test_duplicate_email_differing_only_in_case_returns_409(client, payload):
    create(client, payload)
    response = client.post(
        "/api/employees", json=payload(email="MEGHA.BANSAL@ACME.COM")
    )
    assert response.status_code == 409


# ---------- read ----------


def test_get_returns_the_employee(client, payload):
    created = create(client, payload)

    response = client.get(f"/api/employees/{created['id']}")

    assert response.status_code == 200
    assert response.json() == created


def test_get_missing_returns_404(client):
    response = client.get("/api/employees/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Employee 999 not found"}


def test_get_with_non_numeric_id_returns_422(client):
    response = client.get("/api/employees/abc")

    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "employee_id"


# ---------- update ----------


def test_put_updates_the_employee(client, payload):
    created = create(client, payload)

    response = client.put(
        f"/api/employees/{created['id']}",
        json=payload(salary=3_000_000, job_title="Lead"),
    )

    assert response.status_code == 200
    assert response.json()["salary"] == 3_000_000
    assert client.get(f"/api/employees/{created['id']}").json()["job_title"] == "Lead"


def test_put_missing_returns_404(client, payload):
    response = client.put("/api/employees/999", json=payload())
    assert response.status_code == 404


def test_put_invalid_data_returns_422(client, payload):
    created = create(client, payload)
    response = client.put(f"/api/employees/{created['id']}", json=payload(salary=0))

    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "salary"


def test_put_to_another_employees_email_returns_409(client, payload):
    create(client, payload)
    second = create(client, payload, email="second@acme.com")

    response = client.put(f"/api/employees/{second['id']}", json=payload())

    assert response.status_code == 409


# ---------- delete ----------


def test_delete_returns_204_and_the_employee_is_gone(client, payload):
    created = create(client, payload)

    response = client.delete(f"/api/employees/{created['id']}")

    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/api/employees/{created['id']}").status_code == 404


def test_delete_missing_returns_404(client):
    assert client.delete("/api/employees/999").status_code == 404
