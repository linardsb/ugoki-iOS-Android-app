"""
Bloodwork Parser Service

Extracts text from PDF/images and parses biomarkers using Claude.
Stores results in the METRICS module.
"""

import io
import json
import base64
from datetime import datetime, date
from typing import Optional

import anthropic
import pdfplumber
from pydantic import BaseModel

from src.core.config import settings
from src.modules.metrics.interface import MetricsInterface
from src.modules.metrics.models import MetricSource, BiomarkerFlag


# ─────────────────────────────────────────────────────────────────────────────
# TYPES
# ─────────────────────────────────────────────────────────────────────────────

class ParsedBiomarker(BaseModel):
    """Single biomarker from parsed bloodwork."""
    raw_name: str
    standardised_name: str
    value: Optional[float] = None
    value_text: str
    unit: Optional[str] = None
    reference_low: Optional[float] = None
    reference_high: Optional[float] = None
    flag: Optional[str] = None  # low, normal, high, abnormal


class ParsedBloodwork(BaseModel):
    """Complete parsed bloodwork result."""
    test_date: Optional[str] = None
    lab_name: Optional[str] = None
    biomarkers: list[ParsedBiomarker]
    parsing_notes: Optional[str] = None


class BloodworkResult(BaseModel):
    """Result returned to the client."""
    success: bool
    test_date: Optional[date] = None
    biomarker_count: int
    biomarkers: list[ParsedBiomarker]
    message: str


# ─────────────────────────────────────────────────────────────────────────────
# PARSING PROMPT
# ─────────────────────────────────────────────────────────────────────────────

PARSING_PROMPT = """You are a medical document parser specialising in blood test results.

Extract ALL blood test results from the document below. Be thorough—capture every biomarker listed.

## Output format

Return valid JSON only. No markdown, no explanation, no preamble.

{{
  "test_date": "YYYY-MM-DD or null if unclear",
  "lab_name": "string or null",
  "biomarkers": [
    {{
      "raw_name": "exact name as written in document",
      "standardised_name": "your best normalised name (lowercase, no abbreviations)",
      "value": number or null if not parseable,
      "value_text": "original value as string (e.g. '>90', 'negative')",
      "unit": "string or null",
      "reference_low": number or null,
      "reference_high": number or null,
      "flag": "low | normal | high | abnormal | null"
    }}
  ],
  "parsing_notes": "any issues or ambiguities encountered"
}}

## Rules

1. Extract every test result, even if reference ranges are missing
2. For values like ">90" or "<0.5", set value to the number and preserve original in value_text
3. Interpret flags from symbols: H/HIGH = high, L/LOW = low, * or A = abnormal
4. If a test appears multiple times (e.g. repeat samples), include all instances
5. Dates in UK format: 28/12/2024 = 2024-12-28
6. Common abbreviations to expand:
   - Hb, HGB → haemoglobin
   - WBC, WCC → white blood cell count
   - RBC → red blood cell count
   - PLT → platelets
   - MCV → mean corpuscular volume
   - MCH → mean corpuscular haemoglobin
   - eGFR → estimated glomerular filtration rate
   - ALT → alanine aminotransferase
   - AST → aspartate aminotransferase
   - TSH → thyroid stimulating hormone
   - HbA1c → haemoglobin a1c
   - LDL → low density lipoprotein cholesterol
   - HDL → high density lipoprotein cholesterol
   - CRP → c-reactive protein
   - Ferritin → ferritin
   - B12 → vitamin b12
   - Folate → folate
   - Na → sodium
   - K → potassium
   - Creat → creatinine
   - Urea → urea
   - Bili → bilirubin
   - ALP → alkaline phosphatase
   - GGT → gamma-glutamyl transferase
   - Chol → total cholesterol
   - Trig → triglycerides

## Document text

\"\"\"
{extracted_text}
\"\"\""""


# ─────────────────────────────────────────────────────────────────────────────
# SERVICE
# ─────────────────────────────────────────────────────────────────────────────

class BloodworkParserService:
    """
    Parses bloodwork PDFs/images and stores results in METRICS.

    Usage:
        parser = BloodworkParserService(metrics_service)
        result = await parser.parse_and_store(
            identity_id="user_123",
            file_bytes=pdf_bytes,
            file_type="pdf"
        )
    """

    def __init__(self, metrics_service: MetricsInterface):
        """
        Args:
            metrics_service: The METRICS module interface for storing biomarkers
        """
        self.metrics = metrics_service
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-sonnet-4-20250514"

    async def parse_and_store(
        self,
        identity_id: str,
        file_bytes: bytes,
        file_type: str,
        test_date: Optional[date] = None
    ) -> BloodworkResult:
        """
        Parse bloodwork file and store results in METRICS.

        Args:
            identity_id: User's identity reference
            file_bytes: Raw file content
            file_type: "pdf", "jpg", or "png"
            test_date: Override test date (otherwise extracted from document)

        Returns:
            BloodworkResult with parsed biomarkers
        """
        try:
            # 1. Extract text
            extracted_text = await self._extract_text(file_bytes, file_type)

            if not extracted_text or len(extracted_text.strip()) < 50:
                return BloodworkResult(
                    success=False,
                    test_date=None,
                    biomarker_count=0,
                    biomarkers=[],
                    message="Could not extract text from document. Try a clearer image or text-based PDF."
                )

            # 2. Parse with Claude
            parsed = await self._parse_with_llm(extracted_text)

            if not parsed.biomarkers:
                return BloodworkResult(
                    success=False,
                    test_date=None,
                    biomarker_count=0,
                    biomarkers=[],
                    message="No biomarkers found in document. Make sure this is a blood test result."
                )

            # 3. Determine test date
            final_date = test_date
            if not final_date and parsed.test_date:
                try:
                    final_date = date.fromisoformat(parsed.test_date)
                except ValueError:
                    final_date = date.today()
            elif not final_date:
                final_date = date.today()

            # 4. Store each biomarker in METRICS
            stored_count = 0
            for biomarker in parsed.biomarkers:
                if biomarker.value is not None:
                    # Convert flag string to enum
                    flag_enum = None
                    if biomarker.flag:
                        try:
                            flag_enum = BiomarkerFlag(biomarker.flag.lower())
                        except ValueError:
                            pass

                    await self.metrics.record_metric(
                        identity_id=identity_id,
                        metric_type=f"biomarker_{biomarker.standardised_name}",
                        value=biomarker.value,
                        timestamp=datetime.combine(final_date, datetime.min.time()),
                        source=MetricSource.DEVICE_SYNC,
                        unit=biomarker.unit,
                        reference_low=biomarker.reference_low,
                        reference_high=biomarker.reference_high,
                        flag=flag_enum,
                    )
                    stored_count += 1

            return BloodworkResult(
                success=True,
                test_date=final_date,
                biomarker_count=stored_count,
                biomarkers=parsed.biomarkers,
                message=f"Successfully parsed {stored_count} biomarkers."
            )

        except Exception as e:
            return BloodworkResult(
                success=False,
                test_date=None,
                biomarker_count=0,
                biomarkers=[],
                message=f"Error processing document: {str(e)}"
            )

    async def _extract_text(self, file_bytes: bytes, file_type: str) -> str:
        """Extract text from PDF or image."""
        if file_type == "pdf":
            return self._extract_from_pdf(file_bytes)
        else:
            # For images, use Claude's vision capability directly
            return await self._extract_from_image(file_bytes, file_type)

    def _extract_from_pdf(self, file_bytes: bytes) -> str:
        """Extract text from PDF using pdfplumber."""
        text_parts = []

        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                # Extract regular text
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)

                # Extract tables (common in lab results)
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        if row:
                            row_text = " | ".join(str(cell) for cell in row if cell)
                            if row_text.strip():
                                text_parts.append(row_text)

        return "\n".join(text_parts)

    async def _extract_from_image(self, image_bytes: bytes, file_type: str) -> str:
        """Extract text from image using Claude's vision."""
        media_type = f"image/{file_type}"
        if file_type == "jpg":
            media_type = "image/jpeg"

        base64_image = base64.standard_b64encode(image_bytes).decode("utf-8")

        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": base64_image
                            }
                        },
                        {
                            "type": "text",
                            "text": "Extract all text from this blood test result image. Preserve the structure, especially test names, values, units, and reference ranges. Output only the extracted text, no commentary."
                        }
                    ]
                }
            ]
        )

        return response.content[0].text

    async def _parse_with_llm(self, extracted_text: str) -> ParsedBloodwork:
        """Send extracted text to Claude for structured parsing."""
        prompt = PARSING_PROMPT.format(extracted_text=extracted_text)

        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        response_text = response.content[0].text

        # Parse JSON response
        try:
            # Try direct parse
            parsed_data = json.loads(response_text)
        except json.JSONDecodeError:
            # Try extracting from markdown code block
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0].strip()
                parsed_data = json.loads(json_str)
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0].strip()
                parsed_data = json.loads(json_str)
            else:
                raise ValueError("Could not parse LLM response as JSON")

        return ParsedBloodwork(**parsed_data)
