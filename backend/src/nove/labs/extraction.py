# ABOUTME: PDF text extraction via Mistral OCR and biomarker structuring via Gemini.
# ABOUTME: Handles OCR, structured extraction, validation, and confidence-based routing.

import asyncio
import base64
import json
import uuid

import structlog
from pydantic import BaseModel

from nove.config import settings

logger = structlog.get_logger()

GEMINI_MODEL = "gemini-2.5-flash"

EXTRACTION_PROMPT = """\
You are a medical lab result extraction system. Extract all biomarker values from \
the following lab report text.

For each biomarker found, provide:
- biomarker_code: A standardized short code \
(e.g., GLU, HBA1C, TSH, TC, HDL, LDL, TG, CRE, BUN, AST, ALT, \
CBC_WBC, CBC_RBC, CBC_HGB, CBC_PLT, VIT_D, VIT_B12, FE, FERR)
- biomarker_name: Full name in Spanish
- value: Numeric value (convert to standard units if needed)
- unit: Unit of measurement
- reference_range_low: Lower bound of reference range (null if not provided)
- reference_range_high: Upper bound of reference range (null if not provided)
- confidence: Your confidence in this extraction from 0.0 to 1.0

Only include biomarkers where you can clearly identify a numeric value.\
"""


class ExtractedBiomarker(BaseModel):
    biomarker_code: str
    biomarker_name: str
    value: float
    unit: str
    reference_range_low: float | None
    reference_range_high: float | None
    confidence: float


class ExtractionResult(BaseModel):
    biomarkers: list[ExtractedBiomarker]


def _ocr_pdf_sync(pdf_bytes: bytes) -> str:
    """Send PDF bytes to Mistral OCR, return extracted markdown text. Sync."""
    from mistralai import Mistral

    client = Mistral(api_key=settings.mistral_api_key)
    b64 = base64.b64encode(pdf_bytes).decode("utf-8")

    response = client.ocr.process(
        model="mistral-ocr-latest",
        document={
            "type": "document_url",
            "document_url": f"data:application/pdf;base64,{b64}",
        },
    )

    return "\n\n".join(page.markdown for page in response.pages)


async def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF via Mistral OCR. Runs sync SDK in executor."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _ocr_pdf_sync, pdf_bytes)


async def extract_biomarkers(text: str) -> list[dict]:
    """Use Gemini to extract structured biomarker data from lab report text."""
    if not text.strip():
        return []

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)

    response = await client.aio.models.generate_content(
        model=GEMINI_MODEL,
        contents=f"{EXTRACTION_PROMPT}\n\n---\n\nLab Report Text:\n{text}",
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ExtractionResult,
            temperature=0.1,
        ),
    )

    try:
        result = response.parsed
        if result is not None:
            return [bm.model_dump() for bm in result.biomarkers]
    except Exception:
        logger.exception("gemini_structured_parse_failed")

    # Fallback: try parsing raw JSON
    try:
        raw = json.loads(response.text)
        if isinstance(raw, dict) and "biomarkers" in raw:
            return raw["biomarkers"]
        if isinstance(raw, list):
            return raw
    except (json.JSONDecodeError, TypeError):
        logger.error("gemini_extraction_parse_failed", response=str(response.text)[:500])

    return []


def validate_extraction(
    biomarkers: list[dict],
    expected_panel_biomarkers: list[str] | None = None,
) -> tuple[list[dict], float]:
    """Validate extracted biomarkers and compute overall confidence.

    Returns (validated_biomarkers, overall_confidence).
    """
    if not biomarkers:
        return [], 0.0

    validated = []
    for bm in biomarkers:
        # Check required fields
        if not all(k in bm for k in ("biomarker_code", "value", "unit")):
            continue

        # Check value is numeric
        try:
            float(bm["value"])
        except (ValueError, TypeError):
            continue

        # Flag physiologically implausible values
        confidence = bm.get("confidence", 0.5)
        value = float(bm["value"])

        # Basic plausibility checks
        if value < 0:
            confidence *= 0.5
        if value > 100000:
            confidence *= 0.3

        bm["confidence"] = confidence
        validated.append(bm)

    if not validated:
        return [], 0.0

    # Overall confidence is the minimum individual confidence
    overall = min(bm.get("confidence", 0.5) for bm in validated)

    # Penalize if we're missing expected biomarkers
    if expected_panel_biomarkers:
        found_codes = {bm["biomarker_code"] for bm in validated}
        expected = set(expected_panel_biomarkers)
        missing_ratio = len(expected - found_codes) / len(expected) if expected else 0
        overall *= 1 - (missing_ratio * 0.3)

    return validated, overall


def route_by_confidence(overall_confidence: float) -> str:
    """Determine processing status based on confidence score."""
    if overall_confidence >= 0.9:
        return "verified"
    else:
        return "review_needed"


async def process_pdf(
    pdf_bytes: bytes,
    result_id: uuid.UUID | None = None,
) -> tuple[list[dict], float, str]:
    """Full PDF processing pipeline: Mistral OCR -> Gemini structuring -> validate.

    Returns (biomarkers, confidence, processing_status).
    """
    # Step 1: OCR via Mistral
    text = await extract_text_from_pdf(pdf_bytes)

    if not text.strip():
        logger.warning("no_text_extracted", result_id=str(result_id))
        return [], 0.0, "failed"

    logger.info("ocr_complete", result_id=str(result_id), text_length=len(text))

    # Step 2: Structured extraction via Gemini
    biomarkers = await extract_biomarkers(text)

    # Step 3: Validate
    validated, confidence = validate_extraction(biomarkers)

    # Step 4: Route by confidence
    status = route_by_confidence(confidence)

    logger.info(
        "pdf_processed",
        result_id=str(result_id),
        biomarker_count=len(validated),
        confidence=confidence,
        status=status,
    )

    return validated, confidence, status
