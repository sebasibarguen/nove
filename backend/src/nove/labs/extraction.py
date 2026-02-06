# ABOUTME: PDF text extraction and AI-powered biomarker parsing.
# ABOUTME: Handles both digital and scanned PDFs, routes results by confidence.

import json
import uuid

import anthropic
import structlog

from nove.config import settings

logger = structlog.get_logger()

MODEL = "claude-sonnet-4-5-20250929"

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

Respond with a JSON array of objects. If you cannot extract any biomarkers, return an empty array.
Only include biomarkers where you can clearly identify a numeric value.\
"""


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from a PDF file. Uses PyMuPDF for digital PDFs."""
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text_parts = []
        for page in doc:
            text_parts.append(page.get_text())
        doc.close()
        return "\n".join(text_parts)
    except Exception:
        logger.exception("pdf_text_extraction_failed")
        return ""


def is_scanned_pdf(text: str) -> bool:
    """Heuristic: if extracted text is very short, PDF is likely scanned."""
    stripped = text.strip()
    return len(stripped) < 50


def ocr_pdf(pdf_bytes: bytes) -> str:
    """Run OCR on a scanned PDF using ocrmypdf + PyMuPDF."""
    try:
        import tempfile

        import fitz
        import ocrmypdf

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_in:
            tmp_in.write(pdf_bytes)
            tmp_in_path = tmp_in.name

        tmp_out_path = tmp_in_path.replace(".pdf", "_ocr.pdf")
        ocrmypdf.ocr(tmp_in_path, tmp_out_path, language="spa", skip_text=True)

        doc = fitz.open(tmp_out_path)
        text_parts = []
        for page in doc:
            text_parts.append(page.get_text())
        doc.close()
        return "\n".join(text_parts)
    except Exception:
        logger.exception("ocr_failed")
        return ""


async def extract_biomarkers_with_claude(
    text: str,
) -> list[dict]:
    """Use Claude to extract structured biomarker data from lab report text."""
    if not text.strip():
        return []

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    response = await client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": f"{EXTRACTION_PROMPT}\n\n---\n\nLab Report Text:\n{text}",
            }
        ],
    )

    content = response.content[0].text

    # Parse the JSON response
    try:
        # Handle markdown code blocks
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        return json.loads(content.strip())
    except (json.JSONDecodeError, IndexError):
        logger.error("claude_extraction_parse_failed", response=content[:500])
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
    elif overall_confidence >= 0.6:
        return "review_needed"
    else:
        return "review_needed"  # Low confidence also needs review


async def process_pdf(
    pdf_bytes: bytes,
    result_id: uuid.UUID | None = None,
) -> tuple[list[dict], float, str]:
    """Full PDF processing pipeline: extract text, parse biomarkers, validate.

    Returns (biomarkers, confidence, processing_status).
    """
    # Step 1: Extract text
    text = extract_text_from_pdf(pdf_bytes)

    # Step 2: OCR if scanned
    if is_scanned_pdf(text):
        logger.info("scanned_pdf_detected", result_id=str(result_id))
        text = ocr_pdf(pdf_bytes)

    if not text.strip():
        logger.warning("no_text_extracted", result_id=str(result_id))
        return [], 0.0, "failed"

    # Step 3: AI extraction
    biomarkers = await extract_biomarkers_with_claude(text)

    # Step 4: Validate
    validated, confidence = validate_extraction(biomarkers)

    # Step 5: Route by confidence
    status = route_by_confidence(confidence)

    logger.info(
        "pdf_processed",
        result_id=str(result_id),
        biomarker_count=len(validated),
        confidence=confidence,
        status=status,
    )

    return validated, confidence, status
