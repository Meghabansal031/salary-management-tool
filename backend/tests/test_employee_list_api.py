def get_list(client, **params):
    response = client.get("/api/employees", params=params)
    assert response.status_code == 200, response.text
    return response.json()


def test_default_list_shape(client, sample_employees):
    body = get_list(client)

    assert set(body) == {"items", "total", "page", "page_size"}
    assert body["page"] == 1
    assert body["page_size"] == 25
    assert body["total"] == 12
    assert len(body["items"]) == 12
    assert {"id", "full_name", "email", "salary", "currency"} <= set(body["items"][0])


def test_empty_database_returns_an_empty_page(client):
    body = get_list(client)
    assert body["items"] == []
    assert body["total"] == 0


def test_filters_combine(client, sample_employees):
    body = get_list(client, country="IN", job_title="Software Engineer")
    assert body["total"] == 3


def test_search(client, sample_employees):
    body = get_list(client, q="schmidt")
    assert body["total"] == 1
    assert body["items"][0]["full_name"] == "Anna Schmidt"


def test_sort_and_page_size(client, sample_employees):
    body = get_list(client, sort="salary", order="desc", page_size=3)

    assert len(body["items"]) == 3
    assert body["total"] == 12
    assert body["items"][0]["full_name"] == "Yuki Tanaka"
    assert body["items"][0]["salary"] == 7_000_000


def test_page_beyond_the_end_is_empty(client, sample_employees):
    body = get_list(client, page=9, page_size=5)
    assert body["items"] == []
    assert body["total"] == 12


def test_page_size_above_the_maximum_is_rejected(client):
    response = client.get("/api/employees", params={"page_size": 101})
    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "page_size"


def test_page_zero_is_rejected(client):
    response = client.get("/api/employees", params={"page": 0})
    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "page"


def test_unknown_sort_field_is_rejected(client):
    response = client.get(
        "/api/employees", params={"sort": "email; DROP TABLE employees"}
    )
    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "sort"


def test_unknown_sort_order_is_rejected(client):
    response = client.get("/api/employees", params={"order": "sideways"})
    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "order"
