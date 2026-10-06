import pytest


def get_json(client, path, **params):
    response = client.get(path, params=params)
    assert response.status_code == 200, response.text
    return response.json()


def by_group(body):
    return {item["group"]: item for item in body["items"]}


# ---------- /api/insights/summary ----------


def test_summary_defaults_to_countries_in_local_currency(client, sample_employees):
    body = get_json(client, "/api/insights/summary")

    assert body["group_by"] == "country"
    assert body["basis"] == "local"
    india = by_group(body)["IN"]
    assert india["currency"] == "INR"
    assert india["count"] == 3
    assert india["p25"] == 2_200_000
    assert india["median"] == 2_400_000
    assert india["p75"] == 2_600_000


def test_summary_in_usd_across_countries(client, sample_employees):
    body = get_json(client, "/api/insights/summary", group_by="job_title", basis="usd")

    engineers = by_group(body)["Software Engineer"]
    assert engineers["currency"] == "USD"
    assert engineers["count"] == 6
    assert engineers["median"] == pytest.approx(54_600)
    assert engineers["average"] == pytest.approx(61_400)


def test_summary_local_currency_inside_one_country(client, sample_employees):
    body = get_json(client, "/api/insights/summary", group_by="job_title", country="IN")

    engineers = by_group(body)["Software Engineer"]
    assert engineers["currency"] == "INR"
    assert engineers["median"] == 2_400_000


def test_summary_local_currency_across_countries_is_a_400(client, sample_employees):
    response = client.get("/api/insights/summary", params={"group_by": "job_title"})

    assert response.status_code == 400
    assert "single country" in response.json()["detail"]


def test_summary_applies_filters(client, sample_employees):
    body = get_json(client, "/api/insights/summary", q="schmidt")
    assert [(item["group"], item["count"]) for item in body["items"]] == [("DE", 1)]


@pytest.mark.parametrize(
    "params, field",
    [({"group_by": "salary"}, "group_by"), ({"basis": "euro"}, "basis")],
)
def test_summary_rejects_unknown_options(client, params, field):
    response = client.get("/api/insights/summary", params=params)
    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == field


# ---------- /api/insights/distribution ----------


def test_distribution_hand_checked_bins(client, sample_employees):
    # India: 2.0M, 2.4M, 2.8M in 4 equal bins of 200,000 each -> counts 1, 0, 1, 1
    body = get_json(client, "/api/insights/distribution", country="IN", bins=4)

    assert body["total"] == 3
    assert body["currency"] == "INR"
    assert body["min"] == 2_000_000
    assert body["max"] == 2_800_000
    assert [b["count"] for b in body["bins"]] == [1, 0, 1, 1]
    assert body["bins"][0]["start"] == 2_000_000
    assert body["bins"][0]["end"] == 2_200_000
    assert body["bins"][-1]["end"] == 2_800_000


def test_distribution_counts_add_up_to_the_total(client, sample_employees):
    body = get_json(client, "/api/insights/distribution", basis="usd")

    assert len(body["bins"]) == 20
    assert sum(b["count"] for b in body["bins"]) == body["total"] == 12
    assert body["currency"] == "USD"


def test_distribution_when_everyone_earns_the_same_is_one_bin(client, sample_employees):
    body = get_json(client, "/api/insights/distribution", country="FR")

    assert body["total"] == 1
    assert [b["count"] for b in body["bins"]] == [1]


def test_distribution_of_nobody_is_empty(client, sample_employees):
    body = get_json(client, "/api/insights/distribution", country="BR")

    assert body["total"] == 0
    assert body["bins"] == []
    assert body["min"] is None


def test_distribution_local_currency_needs_a_country(client, sample_employees):
    response = client.get("/api/insights/distribution")
    assert response.status_code == 400


@pytest.mark.parametrize("bins", [1, 51])
def test_distribution_rejects_bin_counts_out_of_range(client, bins):
    response = client.get(
        "/api/insights/distribution", params={"bins": bins, "basis": "usd"}
    )
    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "bins"


# ---------- /api/insights/headcount ----------


def test_headcount_is_sorted_biggest_country_first(client, sample_employees):
    body = get_json(client, "/api/insights/headcount")

    assert body["total"] == 12
    assert [item["country"] for item in body["items"]] == [
        "IN",
        "US",
        "DE",
        "GB",
        "FR",
        "JP",
    ]
    assert [item["headcount"] for item in body["items"]] == [3, 3, 2, 2, 1, 1]


def test_headcount_includes_names_shares_and_average_usd(client, sample_employees):
    items = {
        item["country"]: item
        for item in get_json(client, "/api/insights/headcount")["items"]
    }

    assert items["US"]["country_name"] == "United States"
    assert items["US"]["share_percent"] == 25.0
    assert items["US"]["average_salary_usd"] == pytest.approx(136_666.67)
    assert items["JP"]["average_salary_usd"] == pytest.approx(7_000_000 * 0.0067)


def test_headcount_respects_filters(client, sample_employees):
    body = get_json(client, "/api/insights/headcount", department="Engineering")
    assert body["total"] == 6


def test_headcount_of_an_empty_database(client):
    assert get_json(client, "/api/insights/headcount") == {"total": 0, "items": []}


# ---------- /api/meta/filters ----------


def test_meta_filters_lists_the_dropdown_options(client, sample_employees):
    body = get_json(client, "/api/meta/filters")

    assert len(body["countries"]) == 12
    assert {"code": "GB", "name": "United Kingdom", "currency": "GBP"} in body[
        "countries"
    ]
    assert body["departments"] == ["Analytics", "Engineering", "People", "Product"]
    assert body["job_titles"] == [
        "Data Analyst",
        "HR Specialist",
        "Product Manager",
        "Software Engineer",
    ]
    assert body["currencies"] == sorted(body["currencies"])
    assert len(body["currencies"]) == 10


# ---------- peer_stats on the employee list ----------


def test_list_includes_peer_stats_for_country_and_job_title(client, sample_employees):
    body = get_json(
        client, "/api/employees", country="IN", job_title="Software Engineer"
    )

    assert body["peer_stats"] == {
        "country": "IN",
        "job_title": "Software Engineer",
        "currency": "INR",
        "count": 3,
        "p25": 2_200_000,
        "median": 2_400_000,
        "p75": 2_600_000,
    }


@pytest.mark.parametrize(
    "params",
    [
        {},
        {"country": "IN"},
        {"job_title": "Software Engineer"},
        {"country": "BR", "job_title": "Data Analyst"},  # nobody in that group
    ],
)
def test_peer_stats_is_empty_unless_both_filters_match_somebody(
    client, sample_employees, params
):
    assert get_json(client, "/api/employees", **params)["peer_stats"] is None


def test_peer_stats_ignore_search_and_paging(client, sample_employees):
    body = get_json(
        client,
        "/api/employees",
        country="in",
        job_title="Software Engineer",
        q="priya",
        page_size=1,
    )

    assert body["total"] == 1  # the list is narrowed by the search...
    assert body["peer_stats"]["count"] == 3  # ...but the peer group is not
