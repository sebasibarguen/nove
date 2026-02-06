# ABOUTME: Tests for lab endpoints, portal auth, and extraction logic.
# ABOUTME: Validates ordering flow, result retrieval, biomarker history, and confidence routing.

import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from nove.labs.extraction import route_by_confidence, validate_extraction
from nove.labs.models import LabPanel
from nove.labs.service import generate_order_code

PREFIX = "/api/v1"


def _make_panel() -> LabPanel:
    return LabPanel(
        name="Panel Basico",
        description="Panel de prueba",
        biomarkers={"codes": ["GLU", "HBA1C", "TC"]},
        price_cents=50000,
        active=True,
    )


async def _seed_panel(db: AsyncSession) -> LabPanel:
    panel = _make_panel()
    db.add(panel)
    await db.commit()
    await db.refresh(panel)
    return panel


async def _register_user(client: AsyncClient) -> dict[str, str]:
    resp = await client.post(
        f"{PREFIX}/auth/register",
        json={
            "email": f"lab-{uuid.uuid4().hex[:8]}@example.com",
            "password": "pass1234",
            "full_name": "Lab User",
        },
    )
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# --- Order code generation ---


def test_generate_order_code_format():
    code = generate_order_code("LAB")
    assert code.startswith("LAB-")
    assert len(code) == 10  # "LAB-" + 6 chars


def test_generate_order_code_uniqueness():
    codes = {generate_order_code() for _ in range(100)}
    assert len(codes) == 100


# --- Panels ---


async def test_list_panels(client: AsyncClient, db: AsyncSession):
    await _seed_panel(db)

    headers = await _register_user(client)
    resp = await client.get(f"{PREFIX}/lab/panels", headers=headers)
    assert resp.status_code == 200
    panels = resp.json()
    assert len(panels) >= 1
    assert panels[0]["name"] == "Panel Basico"


# --- Orders ---


async def test_create_order(client: AsyncClient, db: AsyncSession):
    panel = await _seed_panel(db)
    headers = await _register_user(client)

    resp = await client.post(
        f"{PREFIX}/lab/orders",
        json={"panel_id": str(panel.id)},
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["order_code"].startswith("NOV-")
    assert data["status"] == "pending"


async def test_list_orders(client: AsyncClient, db: AsyncSession):
    panel = await _seed_panel(db)
    headers = await _register_user(client)

    await client.post(
        f"{PREFIX}/lab/orders",
        json={"panel_id": str(panel.id)},
        headers=headers,
    )

    resp = await client.get(f"{PREFIX}/lab/orders", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


async def test_create_order_invalid_panel(client: AsyncClient):
    headers = await _register_user(client)

    resp = await client.post(
        f"{PREFIX}/lab/orders",
        json={"panel_id": str(uuid.uuid4())},
        headers=headers,
    )
    assert resp.status_code == 404


# --- Results ---


async def test_list_results_empty(client: AsyncClient):
    headers = await _register_user(client)

    resp = await client.get(f"{PREFIX}/lab/results", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []


async def test_get_result_not_found(client: AsyncClient):
    headers = await _register_user(client)

    resp = await client.get(
        f"{PREFIX}/lab/results/{uuid.uuid4()}",
        headers=headers,
    )
    assert resp.status_code == 404


# --- Extraction validation ---


def test_validate_extraction_valid():
    biomarkers = [
        {
            "biomarker_code": "GLU",
            "biomarker_name": "Glucosa",
            "value": 95.0,
            "unit": "mg/dL",
            "reference_range_low": 70,
            "reference_range_high": 100,
            "confidence": 0.95,
        },
        {
            "biomarker_code": "HBA1C",
            "biomarker_name": "Hemoglobina glicosilada",
            "value": 5.4,
            "unit": "%",
            "reference_range_low": 4.0,
            "reference_range_high": 5.7,
            "confidence": 0.92,
        },
    ]
    validated, confidence = validate_extraction(biomarkers)
    assert len(validated) == 2
    assert confidence >= 0.9


def test_validate_extraction_missing_fields():
    biomarkers = [
        {"biomarker_code": "GLU"},  # missing value and unit
        {
            "biomarker_code": "HBA1C",
            "value": 5.4,
            "unit": "%",
            "confidence": 0.9,
        },
    ]
    validated, confidence = validate_extraction(biomarkers)
    assert len(validated) == 1
    assert validated[0]["biomarker_code"] == "HBA1C"


def test_validate_extraction_empty():
    validated, confidence = validate_extraction([])
    assert validated == []
    assert confidence == 0.0


def test_validate_extraction_implausible_value():
    biomarkers = [
        {
            "biomarker_code": "GLU",
            "value": -10,
            "unit": "mg/dL",
            "confidence": 0.9,
        },
    ]
    validated, confidence = validate_extraction(biomarkers)
    assert len(validated) == 1
    assert validated[0]["confidence"] < 0.9  # penalized


# --- Confidence routing ---


def test_route_high_confidence():
    assert route_by_confidence(0.95) == "verified"


def test_route_medium_confidence():
    assert route_by_confidence(0.75) == "review_needed"


def test_route_low_confidence():
    assert route_by_confidence(0.3) == "review_needed"
