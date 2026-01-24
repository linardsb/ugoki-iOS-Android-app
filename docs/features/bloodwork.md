# Feature: Bloodwork Analysis

Upload and analyze blood test results with AI parsing and trend tracking.

---

## Overview

Users can upload blood test results (PDF or image) which are parsed by Claude Sonnet to extract biomarkers. Results are stored in the metrics system for trend tracking and AI Coach integration. Users can view their complete bloodwork history and track individual biomarkers over time.

---

## Status

| Component | Status |
|-----------|--------|
| Backend | Complete |
| Mobile | Complete |
| Tests | Partial |

---

## User Stories

- As a user, I want to upload my blood test results so that the AI can analyze them
- As a user, I want to see my biomarkers extracted from the PDF so that I understand my results
- As a user, I want to track biomarker trends over time so that I see improvement
- As a user, I want the AI Coach to know my biomarkers so that it gives personalized advice

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/uploads/bloodwork` | Upload PDF/image | Yes |
| GET | `/api/v1/uploads/bloodwork/supported-formats` | Get supported types | No |
| GET | `/api/v1/metrics/biomarkers/grouped` | All tests by date | Yes |
| GET | `/api/v1/metrics/history?metric_type=biomarker_X` | Single biomarker history | Yes |
| GET | `/api/v1/metrics/trend?metric_type=biomarker_X` | Trend analysis | Yes |
| PUT | `/api/v1/metrics/{id}` | Update biomarker | Yes |
| DELETE | `/api/v1/metrics/{id}` | Delete biomarker | Yes |
| POST | `/api/v1/metrics` | Add biomarker manually | Yes |

---

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `apps/api/src/services/bloodwork_parser.py` | PDF/image parsing with Claude |
| `apps/api/src/routes/uploads.py` | Upload endpoint |
| `apps/api/src/modules/metrics/service.py` | Biomarker storage/queries |
| `apps/api/src/modules/ai_coach/tools/fitness_tools.py` | Biomarker tools |

### Mobile

| File | Purpose |
|------|---------|
| `apps/mobile/features/bloodwork/hooks/useBloodwork.ts` | React Query hooks |
| `apps/mobile/features/bloodwork/components/BloodworkResults.tsx` | Results display |
| `apps/mobile/app/(modals)/bloodwork/index.tsx` | Upload + History tabs |
| `apps/mobile/app/(modals)/bloodwork/[date].tsx` | Test details by date |
| `apps/mobile/app/(modals)/bloodwork/trend/[biomarker].tsx` | Trend chart |

---

## Processing Flow

```
Upload (PDF/Image)
        │
        ▼
┌───────────────┐
│Extract Text   │
│(pdfplumber or │
│Claude Vision) │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│Claude Sonnet  │
│Parse Biomarks │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│Standardize    │
│Names/Units    │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│Store in       │
│METRICS table  │
└───────────────┘
```

---

## Data Models

### Biomarker (stored as Metric)

```typescript
interface Metric {
  id: string;
  metric_type: string; // "biomarker_{name}"
  value: number;
  unit: string;
  timestamp: string;
  source: "calculated"; // From AI parsing
  metadata: {
    reference_low?: number;
    reference_high?: number;
    flag?: "low" | "normal" | "high" | "abnormal";
    test_date?: string;
  };
}
```

### Biomarker Test Group

```typescript
interface BiomarkerTestGroup {
  test_date: string; // ISO date
  biomarker_count: number;
  normal_count: number;
  abnormal_count: number;
  biomarkers: Metric[];
}
```

### Trend Data

```typescript
interface TrendData {
  metric_type: string;
  direction: "up" | "down" | "stable";
  percent_change: number;
  data_points: Array<{
    value: number;
    timestamp: string;
  }>;
}
```

---

## API Response Examples

### Upload Bloodwork Response

```json
{
  "id": "uuid-1",
  "test_date": "2026-01-24",
  "filename": "lab_results_jan_2026.pdf",
  "uploaded_at": "2026-01-24T14:30:00Z",
  "status": "parsed",
  "biomarker_count": 8,
  "biomarkers": [
    {
      "id": "uuid-biomarker-1",
      "metric_type": "biomarker_haemoglobin",
      "value": 14.2,
      "unit": "g/dL",
      "reference_low": 12.0,
      "reference_high": 17.5,
      "flag": "normal",
      "timestamp": "2026-01-24T00:00:00Z"
    },
    {
      "id": "uuid-biomarker-2",
      "metric_type": "biomarker_cholesterol_total",
      "value": 185,
      "unit": "mg/dL",
      "reference_high": 200,
      "flag": "normal",
      "timestamp": "2026-01-24T00:00:00Z"
    },
    {
      "id": "uuid-biomarker-3",
      "metric_type": "biomarker_hba1c",
      "value": 5.2,
      "unit": "%",
      "reference_high": 5.7,
      "flag": "normal",
      "timestamp": "2026-01-24T00:00:00Z"
    }
  ]
}
```

### Bloodwork History Response

```json
{
  "tests": [
    {
      "test_date": "2026-01-24",
      "biomarker_count": 8,
      "normal_count": 7,
      "abnormal_count": 1,
      "biomarkers": [
        {
          "metric_type": "biomarker_haemoglobin",
          "value": 14.2,
          "unit": "g/dL",
          "flag": "normal"
        },
        {
          "metric_type": "biomarker_cholesterol_ldl",
          "value": 145,
          "unit": "mg/dL",
          "flag": "high"
        }
      ]
    },
    {
      "test_date": "2025-10-15",
      "biomarker_count": 8,
      "normal_count": 8,
      "abnormal_count": 0,
      "biomarkers": [
        {
          "metric_type": "biomarker_haemoglobin",
          "value": 13.8,
          "unit": "g/dL",
          "flag": "normal"
        }
      ]
    }
  ],
  "total_tests": 2
}
```

### Biomarker Trend Response

```json
{
  "metric_type": "biomarker_haemoglobin",
  "unit": "g/dL",
  "direction": "up",
  "percent_change": 2.9,
  "data_points": [
    {
      "value": 13.8,
      "timestamp": "2025-10-15T00:00:00Z",
      "test_date": "2025-10-15"
    },
    {
      "value": 14.0,
      "timestamp": "2025-12-20T00:00:00Z",
      "test_date": "2025-12-20"
    },
    {
      "value": 14.2,
      "timestamp": "2026-01-24T00:00:00Z",
      "test_date": "2026-01-24"
    }
  ],
  "reference_low": 12.0,
  "reference_high": 17.5,
  "status": "improving"
}
```

---

## Biomarker Standardization

Common biomarker name mappings:

| Input Variations | Standardized Name |
|------------------|-------------------|
| Hb, Haemoglobin, Hemoglobin | haemoglobin |
| Chol, Total Cholesterol | cholesterol_total |
| LDL, LDL-C | cholesterol_ldl |
| HDL, HDL-C | cholesterol_hdl |
| HbA1c, Glycated Hemoglobin | hba1c |
| TSH, Thyroid Stimulating | tsh |

Stored with `biomarker_` prefix: `biomarker_haemoglobin`

---

## AI Coach Integration

The AI Coach has tools to access biomarkers:

```python
@coach_agent.tool
async def get_latest_biomarkers(ctx):
    """Get all biomarkers from most recent test."""
    return await ctx.deps.metrics.get_by_prefix(
        ctx.deps.identity_id,
        prefix="biomarker_"
    )

@coach_agent.tool
async def get_biomarker_trend(ctx, biomarker_name: str):
    """Get trend for specific biomarker."""
    return await ctx.deps.metrics.get_trend(
        ctx.deps.identity_id,
        f"biomarker_{biomarker_name}"
    )
```

---

## Supported Formats

| Format | Extension | Method |
|--------|-----------|--------|
| PDF | .pdf | pdfplumber text extraction |
| JPEG | .jpg, .jpeg | Claude Vision |
| PNG | .png | Claude Vision |

Max file size: 10MB

---

## Cost Considerations

| Operation | Cost |
|-----------|------|
| Claude Sonnet parsing | ~$0.01-0.02 per upload |
| Typical user: 4 tests/year | ~$0.08/user/year |

---

## Known Issues

None currently tracked.

---

## Future Enhancements

- [ ] OCR improvement for handwritten results
- [ ] Integration with lab portals (Quest, LabCorp)
- [ ] Abnormal value alerts
- [ ] Biomarker education content
- [ ] Export report as PDF

---

## References

- **PRD Section:** [PRD.md#bloodwork-analysis](../product/PRD.md#35-bloodwork-analysis)
- **Decision:** [DECISIONS.md#DEC-022](../product/DECISIONS.md#dec-022-biomarkers-in-metrics-table)
