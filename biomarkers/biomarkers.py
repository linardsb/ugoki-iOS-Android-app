"""
Biomarkers Tool for AI Coach

Provides the AI coach with access to user's bloodwork data.
Enables comprehensive bloodwork analysis and health insights.
"""

from pydantic_ai import RunContext
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from src.modules.ai_coach.agents.coach import coach_agent, CoachDependencies


# ─────────────────────────────────────────────────────────────────────────────
# BIOMARKER REFERENCE DATA
# ─────────────────────────────────────────────────────────────────────────────

BIOMARKER_INFO = {
    "haemoglobin": {
        "display_name": "Haemoglobin",
        "category": "Full Blood Count",
        "description": "Oxygen-carrying protein in red blood cells",
        "low_meaning": "May indicate anaemia, blood loss, or nutritional deficiency",
        "high_meaning": "May indicate dehydration, lung disease, or polycythaemia"
    },
    "white blood cell count": {
        "display_name": "White Blood Cells (WBC)",
        "category": "Full Blood Count",
        "description": "Immune system cells that fight infection",
        "low_meaning": "May indicate bone marrow problems or immune deficiency",
        "high_meaning": "May indicate infection, inflammation, or immune response"
    },
    "platelets": {
        "display_name": "Platelets",
        "category": "Full Blood Count",
        "description": "Blood cells that help with clotting",
        "low_meaning": "May increase bleeding risk",
        "high_meaning": "May increase clotting risk"
    },
    "thyroid stimulating hormone": {
        "display_name": "TSH",
        "category": "Thyroid",
        "description": "Hormone that regulates thyroid function",
        "low_meaning": "May indicate overactive thyroid (hyperthyroidism)",
        "high_meaning": "May indicate underactive thyroid (hypothyroidism)"
    },
    "haemoglobin a1c": {
        "display_name": "HbA1c",
        "category": "Diabetes",
        "description": "Average blood sugar over past 2-3 months",
        "low_meaning": "Generally not a concern unless diabetic on medication",
        "high_meaning": "May indicate prediabetes or diabetes"
    },
    "vitamin d": {
        "display_name": "Vitamin D",
        "category": "Vitamins",
        "description": "Essential for bone health and immune function",
        "low_meaning": "Common in UK; may affect bones, mood, and immunity",
        "high_meaning": "Rare; usually from excessive supplementation"
    },
    "vitamin b12": {
        "display_name": "Vitamin B12",
        "category": "Vitamins",
        "description": "Essential for nerve function and red blood cell production",
        "low_meaning": "May cause fatigue, nerve problems, anaemia",
        "high_meaning": "Usually not harmful; often from supplements"
    },
    "ferritin": {
        "display_name": "Ferritin",
        "category": "Iron Studies",
        "description": "Iron storage protein",
        "low_meaning": "May indicate iron deficiency",
        "high_meaning": "May indicate iron overload or inflammation"
    },
    "total cholesterol": {
        "display_name": "Total Cholesterol",
        "category": "Lipids",
        "description": "Overall cholesterol level",
        "low_meaning": "Generally beneficial",
        "high_meaning": "May increase cardiovascular risk"
    },
    "low density lipoprotein cholesterol": {
        "display_name": "LDL Cholesterol",
        "category": "Lipids",
        "description": "'Bad' cholesterol that can build up in arteries",
        "low_meaning": "Generally beneficial",
        "high_meaning": "Increases cardiovascular risk"
    },
    "high density lipoprotein cholesterol": {
        "display_name": "HDL Cholesterol",
        "category": "Lipids",
        "description": "'Good' cholesterol that removes other cholesterol",
        "low_meaning": "May increase cardiovascular risk",
        "high_meaning": "Generally protective"
    },
    "triglycerides": {
        "display_name": "Triglycerides",
        "category": "Lipids",
        "description": "Type of fat in the blood",
        "low_meaning": "Generally not a concern",
        "high_meaning": "May increase cardiovascular risk"
    },
    "estimated glomerular filtration rate": {
        "display_name": "eGFR",
        "category": "Kidney",
        "description": "Measure of kidney function",
        "low_meaning": "May indicate reduced kidney function",
        "high_meaning": "Generally indicates good kidney function"
    },
    "alanine aminotransferase": {
        "display_name": "ALT",
        "category": "Liver",
        "description": "Liver enzyme",
        "low_meaning": "Generally not significant",
        "high_meaning": "May indicate liver inflammation or damage"
    },
    "c-reactive protein": {
        "display_name": "CRP",
        "category": "Inflammation",
        "description": "Marker of inflammation in the body",
        "low_meaning": "Indicates low inflammation",
        "high_meaning": "May indicate infection, inflammation, or chronic disease"
    }
}


# ─────────────────────────────────────────────────────────────────────────────
# TOOLS
# ─────────────────────────────────────────────────────────────────────────────

@coach_agent.tool
async def get_latest_biomarkers(ctx: RunContext[CoachDependencies]) -> dict:
    """
    Get user's most recent bloodwork results.
    
    Returns all biomarkers from the latest upload with values,
    reference ranges, and flags indicating if out of range.
    
    Use this when:
    - User asks about their bloodwork
    - User wants health insights based on blood tests
    - User asks about specific markers (cholesterol, iron, etc.)
    """
    # Get all metrics with biomarker_ prefix
    all_metrics = await ctx.deps.metrics.get_metrics_by_prefix(
        identity_id=ctx.deps.identity_id,
        prefix="biomarker_"
    )
    
    if not all_metrics:
        return {
            "has_data": False,
            "message": "No bloodwork data found. Upload your blood test results to get personalised insights."
        }
    
    # Group by biomarker, get latest value for each
    latest_by_marker = {}
    for metric in all_metrics:
        marker_name = metric.metric_type.replace("biomarker_", "")
        
        if marker_name not in latest_by_marker:
            latest_by_marker[marker_name] = metric
        elif metric.timestamp > latest_by_marker[marker_name].timestamp:
            latest_by_marker[marker_name] = metric
    
    # Format results with context
    biomarkers = []
    for marker_name, metric in latest_by_marker.items():
        info = BIOMARKER_INFO.get(marker_name, {})
        biomarkers.append({
            "name": marker_name,
            "display_name": info.get("display_name", marker_name.title()),
            "category": info.get("category", "Other"),
            "value": metric.value,
            "unit": getattr(metric, "unit", None),
            "reference_low": getattr(metric, "reference_low", None),
            "reference_high": getattr(metric, "reference_high", None),
            "flag": getattr(metric, "flag", None),
            "test_date": metric.timestamp.date().isoformat(),
            "description": info.get("description"),
            "interpretation": _get_interpretation(marker_name, getattr(metric, "flag", None))
        })
    
    # Sort by category
    biomarkers.sort(key=lambda x: (x["category"], x["name"]))
    
    # Count flags
    out_of_range = [b for b in biomarkers if b["flag"] in ("low", "high", "abnormal")]
    
    return {
        "has_data": True,
        "total_markers": len(biomarkers),
        "out_of_range_count": len(out_of_range),
        "latest_test_date": max(b["test_date"] for b in biomarkers),
        "biomarkers": biomarkers,
        "out_of_range_markers": out_of_range
    }


@coach_agent.tool
async def get_biomarker_trend(
    ctx: RunContext[CoachDependencies],
    biomarker_name: str,
    days: int = 365
) -> dict:
    """
    Get historical trend for a specific biomarker.
    
    Args:
        biomarker_name: Name of biomarker (e.g., "haemoglobin", "cholesterol")
        days: Number of days to look back (default 365)
    
    Use this when:
    - User asks how a marker has changed over time
    - User wants to see if a value is improving
    - User mentions previous blood tests
    """
    metric_type = f"biomarker_{biomarker_name.lower()}"
    
    history = await ctx.deps.metrics.get_history(
        identity_id=ctx.deps.identity_id,
        metric_type=metric_type,
        time_range={
            "start": datetime.utcnow() - timedelta(days=days),
            "end": datetime.utcnow()
        },
        granularity="raw"
    )
    
    if not history:
        return {
            "has_data": False,
            "biomarker": biomarker_name,
            "message": f"No historical data found for {biomarker_name}"
        }
    
    # Sort by date
    history.sort(key=lambda x: x.timestamp)
    
    # Calculate trend
    if len(history) >= 2:
        first_value = history[0].value
        last_value = history[-1].value
        change = last_value - first_value
        change_percent = (change / first_value * 100) if first_value != 0 else 0
        
        if change_percent > 5:
            trend_direction = "increasing"
        elif change_percent < -5:
            trend_direction = "decreasing"
        else:
            trend_direction = "stable"
    else:
        trend_direction = "insufficient_data"
        change = 0
        change_percent = 0
    
    info = BIOMARKER_INFO.get(biomarker_name.lower(), {})
    
    return {
        "has_data": True,
        "biomarker": biomarker_name,
        "display_name": info.get("display_name", biomarker_name.title()),
        "category": info.get("category", "Other"),
        "readings": [
            {
                "date": m.timestamp.date().isoformat(),
                "value": m.value,
                "unit": getattr(m, "unit", None)
            }
            for m in history
        ],
        "trend": {
            "direction": trend_direction,
            "change": round(change, 2),
            "change_percent": round(change_percent, 1),
            "first_reading": history[0].value,
            "latest_reading": history[-1].value,
            "reading_count": len(history)
        }
    }


@coach_agent.tool
async def get_bloodwork_summary(ctx: RunContext[CoachDependencies]) -> dict:
    """
    Get a high-level summary of user's bloodwork status.
    
    Returns categories with status indicators.
    
    Use this when:
    - User asks for an overview of their health
    - Starting a conversation about bloodwork
    - User asks "how are my blood tests looking"
    """
    biomarkers = await get_latest_biomarkers(ctx)
    
    if not biomarkers.get("has_data"):
        return biomarkers
    
    # Group by category
    categories = {}
    for marker in biomarkers["biomarkers"]:
        cat = marker["category"]
        if cat not in categories:
            categories[cat] = {"markers": [], "has_issues": False}
        
        categories[cat]["markers"].append(marker["display_name"])
        if marker["flag"] in ("low", "high", "abnormal"):
            categories[cat]["has_issues"] = True
    
    # Build summary
    summary = {
        "has_data": True,
        "latest_test_date": biomarkers["latest_test_date"],
        "total_markers": biomarkers["total_markers"],
        "categories": [],
        "action_needed": []
    }
    
    for cat_name, cat_data in categories.items():
        status = "needs_attention" if cat_data["has_issues"] else "normal"
        summary["categories"].append({
            "name": cat_name,
            "status": status,
            "marker_count": len(cat_data["markers"])
        })
        
        if cat_data["has_issues"]:
            summary["action_needed"].append(cat_name)
    
    summary["overall_status"] = "needs_attention" if summary["action_needed"] else "normal"
    
    return summary


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _get_interpretation(marker_name: str, flag: Optional[str]) -> Optional[str]:
    """Get interpretation text for a biomarker flag."""
    if not flag or flag == "normal":
        return None
    
    info = BIOMARKER_INFO.get(marker_name.lower(), {})
    
    if flag == "low":
        return info.get("low_meaning")
    elif flag in ("high", "abnormal"):
        return info.get("high_meaning")
    
    return None
