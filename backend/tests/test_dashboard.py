# ABOUTME: Tests for dashboard scoring functions and snapshot endpoint.
# ABOUTME: Validates score computation with known data and endpoint response shape.

import uuid
from datetime import UTC, date, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from nove.dashboard.scoring import (
    compute_nove_age,
    compute_recovery_score,
    compute_sleep_score,
    compute_strain_score,
    score_color,
    strain_color,
)
from nove.garmin.models import GarminConnection, GarminDataPoint
from nove.labs.models import LabBiomarkerValue, LabResult

PREFIX = "/api/v1"


# --- Pure scoring functions ---


class TestRecoveryScore:
    def test_all_inputs_perfect(self):
        score = compute_recovery_score(
            sleep_score=100,
            resting_hr=60,
            baseline_hr=60,
            body_battery_charged=100,
        )
        assert score == 100

    def test_all_inputs_poor(self):
        score = compute_recovery_score(
            sleep_score=0,
            resting_hr=90,
            baseline_hr=60,
            body_battery_charged=0,
        )
        # HR deviation 50% → clamped ratio 0.5 → contributes 15 of 30 weight
        assert score == 15

    def test_mid_range(self):
        score = compute_recovery_score(
            sleep_score=70,
            resting_hr=65,
            baseline_hr=60,
            body_battery_charged=50,
        )
        assert 40 <= score <= 70

    def test_missing_sleep_redistributes(self):
        score = compute_recovery_score(
            sleep_score=None,
            resting_hr=60,
            baseline_hr=60,
            body_battery_charged=100,
        )
        # Only HR and battery contribute, both perfect → 100
        assert score == 100

    def test_missing_hr_redistributes(self):
        score = compute_recovery_score(
            sleep_score=100,
            resting_hr=None,
            baseline_hr=None,
            body_battery_charged=100,
        )
        assert score == 100

    def test_all_missing_returns_none(self):
        score = compute_recovery_score(
            sleep_score=None,
            resting_hr=None,
            baseline_hr=None,
            body_battery_charged=None,
        )
        assert score is None


class TestStrainScore:
    def test_max_strain(self):
        score = compute_strain_score(
            active_minutes=180,
            avg_active_hr=190,
            resting_hr=60,
            max_hr=190,
            body_battery_drained=100,
        )
        assert score == 21.0

    def test_zero_strain(self):
        score = compute_strain_score(
            active_minutes=0,
            avg_active_hr=60,
            resting_hr=60,
            max_hr=190,
            body_battery_drained=0,
        )
        assert score == 0.0

    def test_moderate_strain(self):
        score = compute_strain_score(
            active_minutes=60,
            avg_active_hr=120,
            resting_hr=60,
            max_hr=190,
            body_battery_drained=40,
        )
        assert 5.0 <= score <= 12.0

    def test_missing_hr_redistributes(self):
        score = compute_strain_score(
            active_minutes=180,
            avg_active_hr=None,
            resting_hr=None,
            max_hr=None,
            body_battery_drained=100,
        )
        # Time and battery both maxed
        assert score is not None
        assert score > 10

    def test_all_missing_returns_none(self):
        score = compute_strain_score(
            active_minutes=None,
            avg_active_hr=None,
            resting_hr=None,
            max_hr=None,
            body_battery_drained=None,
        )
        assert score is None


class TestSleepScore:
    def test_garmin_score_passthrough(self):
        score = compute_sleep_score(garmin_sleep_score=85)
        assert score == 85

    def test_computed_perfect(self):
        score = compute_sleep_score(
            garmin_sleep_score=None,
            total_sleep_hours=8.0,
            deep_sleep_hours=1.5,
            rem_sleep_hours=2.0,
            awake_minutes=0,
        )
        assert score == 100

    def test_computed_short_sleep(self):
        score = compute_sleep_score(
            garmin_sleep_score=None,
            total_sleep_hours=5.0,
            deep_sleep_hours=0.5,
            rem_sleep_hours=0.5,
            awake_minutes=30,
        )
        assert 20 <= score <= 50

    def test_all_missing_returns_none(self):
        score = compute_sleep_score(garmin_sleep_score=None)
        assert score is None


class TestNoveAge:
    def test_perfect_health_younger(self):
        age = compute_nove_age(
            chronological_age=35,
            resting_hr=50,
            vo2_max=52,
            sleep_stdev_hours=0.2,
            avg_steps=13000,
            fasting_glucose=80,
            hba1c=4.8,
            ldl=90,
            hdl=65,
            triglycerides=80,
        )
        assert age is not None
        assert age < 35

    def test_poor_health_older(self):
        age = compute_nove_age(
            chronological_age=35,
            resting_hr=85,
            vo2_max=25,
            sleep_stdev_hours=2.0,
            avg_steps=3000,
            fasting_glucose=120,
            hba1c=6.5,
            ldl=180,
            hdl=35,
            triglycerides=250,
        )
        assert age is not None
        assert age > 35

    def test_minimum_inputs(self):
        # Only 2 inputs → should still compute
        age = compute_nove_age(
            chronological_age=30,
            resting_hr=60,
            vo2_max=45,
        )
        assert age is not None

    def test_insufficient_inputs(self):
        # Only 1 input → below minimum of 2
        age = compute_nove_age(
            chronological_age=30,
            resting_hr=60,
        )
        assert age is None

    def test_missing_chrono_age(self):
        age = compute_nove_age(
            chronological_age=None,
            resting_hr=60,
            vo2_max=45,
        )
        assert age is None


class TestColorFunctions:
    def test_score_color_green(self):
        assert score_color(80) == "green"

    def test_score_color_yellow(self):
        assert score_color(55) == "yellow"

    def test_score_color_red(self):
        assert score_color(30) == "red"

    def test_strain_color_light(self):
        assert strain_color(5) == "light"

    def test_strain_color_medium(self):
        assert strain_color(10) == "medium"

    def test_strain_color_deep(self):
        assert strain_color(18) == "deep"


# --- Snapshot endpoint ---


async def _register_user(client: AsyncClient) -> tuple[dict[str, str], str]:
    resp = await client.post(
        f"{PREFIX}/auth/register",
        json={
            "email": f"dash-{uuid.uuid4().hex[:8]}@example.com",
            "password": "pass1234",
            "full_name": "Dashboard User",
        },
    )
    data = resp.json()
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    me_resp = await client.get(f"{PREFIX}/users/me", headers=headers)
    user_id = me_resp.json()["id"]
    return headers, user_id


async def test_snapshot_requires_auth(client: AsyncClient):
    resp = await client.get(f"{PREFIX}/dashboard/snapshot")
    assert resp.status_code in (401, 403)


async def test_snapshot_empty_state(client: AsyncClient):
    headers, _ = await _register_user(client)
    resp = await client.get(f"{PREFIX}/dashboard/snapshot", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "scores" in data
    assert "nove_age" in data
    assert "garmin" in data
    assert "pillars" in data
    assert data["garmin"]["connected"] is False


async def test_snapshot_with_garmin_data(client: AsyncClient, db: AsyncSession):
    headers, user_id = await _register_user(client)

    # Seed Garmin connection
    conn = GarminConnection(
        user_id=user_id,
        garmin_user_id=f"garmin-{uuid.uuid4().hex[:8]}",
        access_token="test-token",
        refresh_token="test-refresh",
        token_expires_at=datetime.now(UTC) + timedelta(days=30),
        last_sync_at=datetime.now(UTC),
    )
    db.add(conn)

    today = date.today()
    # Seed activity data
    for i in range(7):
        d = today - timedelta(days=i)
        db.add(
            GarminDataPoint(
                user_id=user_id,
                data_type="activity",
                date=d,
                data={
                    "steps": 8000 + i * 100,
                    "activeTimeInSeconds": 3600,
                    "restingHeartRateInBeatsPerMinute": 62,
                    "averageHeartRateInBeatsPerMinute": 75,
                    "bodyBatteryChargedValue": 60,
                    "bodyBatteryDrainedValue": 40,
                    "caloriesTotal": 2200,
                    "distanceInMeters": 6000,
                },
            )
        )

    # Seed sleep data
    for i in range(7):
        d = today - timedelta(days=i)
        db.add(
            GarminDataPoint(
                user_id=user_id,
                data_type="sleep",
                date=d,
                data={
                    "overallSleepScore": 78,
                    "durationInSeconds": 27000,
                    "deepSleepDurationInSeconds": 5400,
                    "remSleepInSeconds": 6300,
                    "awakeDurationInSeconds": 1200,
                },
            )
        )

    # Seed stress data
    for i in range(7):
        d = today - timedelta(days=i)
        db.add(
            GarminDataPoint(
                user_id=user_id,
                data_type="stress",
                date=d,
                data={
                    "averageStressLevel": 35,
                    "bodyBatteryMostRecentValue": 70,
                },
            )
        )

    await db.commit()

    resp = await client.get(f"{PREFIX}/dashboard/snapshot", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["garmin"]["connected"] is True
    assert data["scores"]["recovery"]["value"] is not None
    assert data["scores"]["strain"]["value"] is not None
    assert data["scores"]["sleep"]["value"] is not None
    assert data["pillars"]["cardio"] is not None
    assert data["pillars"]["sleep"] is not None
    assert data["pillars"]["activity"] is not None
    assert data["pillars"]["stress"] is not None


async def test_snapshot_with_biomarkers(client: AsyncClient, db: AsyncSession):
    headers, user_id = await _register_user(client)

    # Create a minimal lab result
    result = LabResult(
        user_id=user_id,
        processing_status="verified",
    )
    db.add(result)
    await db.flush()

    biomarkers = [
        ("glucose", "Glucosa en ayunas", 92.0, "mg/dL", 70.0, 100.0),
        ("hba1c", "Hemoglobina glicosilada", 5.2, "%", 4.0, 5.6),
        ("ldl", "LDL Colesterol", 110.0, "mg/dL", 0.0, 130.0),
        ("hdl", "HDL Colesterol", 55.0, "mg/dL", 40.0, 60.0),
        ("triglycerides", "Trigliceridos", 120.0, "mg/dL", 0.0, 150.0),
    ]
    for code, name, val, unit, low, high in biomarkers:
        db.add(
            LabBiomarkerValue(
                result_id=result.id,
                user_id=user_id,
                biomarker_code=code,
                biomarker_name=name,
                value=val,
                unit=unit,
                reference_range_low=low,
                reference_range_high=high,
                status="normal",
                date=date.today(),
            )
        )
    await db.commit()

    resp = await client.get(f"{PREFIX}/dashboard/snapshot", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["pillars"]["metabolic"] is not None
    metabolic = data["pillars"]["metabolic"]
    assert len(metabolic["biomarkers"]) == 5
