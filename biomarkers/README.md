# UGOKI Bloodwork Feature

Simple bloodwork upload and AI analysis feature for UGOKI.

## Files

```
src/
├── services/
│   └── bloodwork_parser.py     # Text extraction + Claude parsing
├── routes/
│   └── uploads.py              # POST /uploads/bloodwork endpoint
└── modules/
    └── ai_coach/
        └── tools/
            └── biomarkers.py   # AI coach tools for bloodwork analysis
```

## Integration Steps

### 1. Add dependencies

```bash
uv add pdfplumber anthropic
```

### 2. Register the upload route

```python
# src/main.py

from src.routes.uploads import router as uploads_router

app.include_router(uploads_router)
```

### 3. Import the biomarkers tool

```python
# src/modules/ai_coach/agents/coach.py

# Add this import to register the tools
from src.modules.ai_coach.tools import biomarkers  # noqa: F401
```

### 4. Add config

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

## API Usage

### Upload Bloodwork

```bash
curl -X POST http://localhost:8000/uploads/bloodwork \
  -H "Authorization: Bearer <token>" \
  -F "file=@blood_test.pdf" \
  -F "test_date=2024-12-15"
```

**Response:**
```json
{
  "success": true,
  "test_date": "2024-12-15",
  "biomarker_count": 12,
  "biomarkers": [
    {
      "raw_name": "Hb",
      "standardised_name": "haemoglobin",
      "value": 142,
      "value_text": "142",
      "unit": "g/L",
      "reference_low": 130,
      "reference_high": 170,
      "flag": "normal"
    }
  ],
  "message": "Successfully parsed 12 biomarkers."
}
```

### AI Coach Conversation

User: "Analyse my bloodwork"

AI Coach calls `get_latest_biomarkers()` tool, then responds:

> "Looking at your recent blood test from December 15th, most of your 12 markers are within normal range. I noticed two things worth discussing:
>
> **TSH (4.8 mIU/L)** - This is slightly elevated above the reference range of 0.4-4.0. This could indicate your thyroid is working a bit harder than usual. It's worth monitoring, and you might want to discuss with your GP if you're experiencing fatigue or weight changes.
>
> **Vitamin D (28 nmol/L)** - This is below the optimal range of 50-150. This is very common in the UK, especially in winter. Consider a vitamin D supplement (1000-2000 IU daily) and try to get some midday sun when possible.
>
> Everything else looks good - your cholesterol, liver function, and blood counts are all healthy. Would you like me to explain any specific marker in more detail?"

## How It Works

```
User uploads PDF
       │
       ▼
┌─────────────────────────────────┐
│  bloodwork_parser.py            │
│                                 │
│  1. Extract text (pdfplumber)   │
│  2. Parse with Claude Sonnet    │
│  3. Store in METRICS module     │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  METRICS module                 │
│                                 │
│  metric_type: biomarker_xxx     │
│  (enables trends, history)      │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  AI Coach                       │
│                                 │
│  Tools:                         │
│  - get_latest_biomarkers()      │
│  - get_biomarker_trend()        │
│  - get_bloodwork_summary()      │
│                                 │
│  "Analyse my bloodwork" →       │
│  Comprehensive health insights  │
└─────────────────────────────────┘
```

## Cost Estimate

| Component | Per Upload | 500 users/month |
|-----------|------------|-----------------|
| Claude Sonnet (parsing) | ~$0.01 | ~$5 |
| Claude Sonnet (image OCR) | ~$0.02 | ~$10 |
| **Total** | **~$0.01-0.02** | **~$5-15** |

## Supported Formats

- PDF (text-based or scanned)
- JPG/JPEG images
- PNG images

Max file size: 10MB
