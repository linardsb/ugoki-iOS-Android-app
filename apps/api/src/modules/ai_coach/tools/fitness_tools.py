"""Fitness-related tools for the AI Coach agent."""

from datetime import datetime, UTC
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.time_keeper.service import TimeKeeperService
from src.modules.time_keeper.models import WindowType, WindowState
from src.modules.progression.service import ProgressionService
from src.modules.progression.models import StreakType
from src.modules.content.service import ContentService
from src.modules.metrics.service import MetricsService


@dataclass
class FitnessTools:
    """Collection of fitness tools for the agent."""
    db: AsyncSession
    identity_id: str

    async def get_active_fast(self) -> dict | None:
        """Get the user's currently active fast, if any."""
        service = TimeKeeperService(self.db)
        window = await service.get_active_window(self.identity_id, WindowType.FAST)
        if not window:
            return None
        
        elapsed = (datetime.now(UTC) - window.started_at).total_seconds() / 3600
        target = window.target_duration_minutes / 60 if window.target_duration_minutes else 16
        
        return {
            "is_active": True,
            "started_at": window.started_at.isoformat(),
            "elapsed_hours": round(elapsed, 1),
            "target_hours": target,
            "progress_percent": round((elapsed / target) * 100, 1) if target else 0,
            "remaining_hours": round(max(0, target - elapsed), 1),
        }

    async def get_streaks(self) -> dict:
        """Get all user streaks."""
        service = ProgressionService(self.db)
        streaks = await service.get_all_streaks(self.identity_id)
        return {
            s.streak_type.value: {
                "current": s.current_count,
                "longest": s.longest_count,
                "last_activity": s.last_activity_date.isoformat() if s.last_activity_date else None,
            }
            for s in streaks
        }

    async def get_level_info(self) -> dict:
        """Get user's level and XP information."""
        service = ProgressionService(self.db)
        level = await service.get_level(self.identity_id)
        return {
            "level": level.current_level,
            "title": level.title,
            "current_xp": level.current_xp,
            "xp_for_next_level": level.xp_for_next_level,
            "progress_percent": level.xp_progress_percent,
            "total_xp_earned": level.total_xp_earned,
        }

    async def get_workout_stats(self) -> dict:
        """Get user's workout statistics."""
        service = ContentService(self.db)
        return await service.get_workout_stats(self.identity_id)

    async def get_recommended_workouts(self, limit: int = 3) -> list[dict]:
        """Get workout recommendations."""
        service = ContentService(self.db)
        recommendations = await service.get_recommendations(self.identity_id, limit)
        return [
            {
                "name": r.workout.name,
                "type": r.workout.workout_type.value,
                "duration_minutes": r.workout.duration_minutes,
                "difficulty": r.workout.difficulty.value,
                "reason": r.reason,
            }
            for r in recommendations
        ]

    async def get_weight_trend(self, days: int = 30) -> dict | None:
        """Get weight trend information."""
        service = MetricsService(self.db)
        trend = await service.get_trend(
            self.identity_id,
            "weight_kg",
            period_days=days,
        )
        if not trend:
            return None

        return {
            "start_value": trend.start_value,
            "end_value": trend.end_value,
            "change": trend.change_absolute,
            "change_percent": trend.change_percent,
            "trend_direction": trend.direction.value,
            "data_points": trend.data_points,
        }

    async def get_today_summary(self) -> dict:
        """Get a summary of today's activities."""
        fast = await self.get_active_fast()
        streaks = await self.get_streaks()
        level = await self.get_level_info()
        workout_stats = await self.get_workout_stats()

        return {
            "active_fast": fast,
            "streaks": streaks,
            "level": level,
            "workouts_this_week": workout_stats.get("current_week_workouts", 0),
            "total_workouts": workout_stats.get("total_workouts", 0),
        }

    # =========================================================================
    # Biomarker Tools
    # =========================================================================

    async def get_latest_biomarkers(self) -> dict:
        """Get user's most recent bloodwork results."""
        service = MetricsService(self.db)
        all_metrics = await service.get_by_type_prefix(
            identity_id=self.identity_id,
            prefix="biomarker_"
        )

        if not all_metrics:
            return {
                "has_data": False,
                "message": "No bloodwork data found. Upload your blood test results to get personalised insights."
            }

        # Group by biomarker, get latest value for each
        latest_by_marker: dict = {}
        for metric in all_metrics:
            marker_name = metric.metric_type.replace("biomarker_", "")

            if marker_name not in latest_by_marker:
                latest_by_marker[marker_name] = metric
            elif metric.timestamp > latest_by_marker[marker_name].timestamp:
                latest_by_marker[marker_name] = metric

        # Format results
        biomarkers = []
        for marker_name, metric in latest_by_marker.items():
            biomarkers.append({
                "name": marker_name,
                "value": metric.value,
                "unit": metric.unit,
                "reference_low": metric.reference_low,
                "reference_high": metric.reference_high,
                "flag": metric.flag.value if metric.flag else None,
                "test_date": metric.timestamp.date().isoformat(),
            })

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

    async def get_biomarker_trend(self, biomarker_name: str, days: int = 365) -> dict:
        """Get historical trend for a specific biomarker."""
        service = MetricsService(self.db)
        metric_type = f"biomarker_{biomarker_name.lower()}"

        trend = await service.get_trend(
            identity_id=self.identity_id,
            metric_type=metric_type,
            period_days=days,
        )

        if not trend:
            return {
                "has_data": False,
                "biomarker": biomarker_name,
                "message": f"No historical data found for {biomarker_name}"
            }

        return {
            "has_data": True,
            "biomarker": biomarker_name,
            "trend": {
                "direction": trend.direction.value,
                "change": trend.change_absolute,
                "change_percent": trend.change_percent,
                "start_value": trend.start_value,
                "end_value": trend.end_value,
                "reading_count": trend.data_points
            }
        }

    async def get_bloodwork_summary(self) -> dict:
        """Get a high-level summary of user's bloodwork status."""
        biomarkers = await self.get_latest_biomarkers()

        if not biomarkers.get("has_data"):
            return biomarkers

        # Group by category (simple categorization based on marker name)
        categories: dict = {}
        category_map = {
            "haemoglobin": "Blood Count",
            "white blood cell": "Blood Count",
            "platelets": "Blood Count",
            "red blood cell": "Blood Count",
            "cholesterol": "Lipids",
            "triglycerides": "Lipids",
            "ldl": "Lipids",
            "hdl": "Lipids",
            "glucose": "Metabolic",
            "haemoglobin a1c": "Metabolic",
            "insulin": "Metabolic",
            "vitamin": "Vitamins",
            "ferritin": "Iron",
            "iron": "Iron",
            "tsh": "Thyroid",
            "thyroid": "Thyroid",
            "creatinine": "Kidney",
            "egfr": "Kidney",
            "alt": "Liver",
            "ast": "Liver",
            "bilirubin": "Liver",
            "crp": "Inflammation",
        }

        for marker in biomarkers["biomarkers"]:
            # Determine category
            cat = "Other"
            for key, cat_name in category_map.items():
                if key in marker["name"].lower():
                    cat = cat_name
                    break

            if cat not in categories:
                categories[cat] = {"markers": [], "has_issues": False}

            categories[cat]["markers"].append(marker["name"])
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

    # =========================================================================
    # Health Device Integration Tools (Apple HealthKit / Android Health Connect)
    # =========================================================================

    async def get_health_context(self) -> dict:
        """Get user's recent health data from connected devices for AI context."""
        service = MetricsService(self.db)

        health_metrics = {}
        metric_configs = [
            ("health_resting_hr", "Resting Heart Rate", "bpm"),
            ("health_hrv", "Heart Rate Variability", "ms"),
            ("sleep_hours", "Sleep Duration", "hours"),
            ("steps", "Steps Today", "steps"),
        ]

        for metric_type, label, unit in metric_configs:
            latest = await service.get_latest(self.identity_id, metric_type)
            if latest:
                health_metrics[metric_type] = {
                    "label": label,
                    "value": latest.value,
                    "unit": unit,
                    "recorded_at": latest.timestamp.isoformat(),
                }

        if not health_metrics:
            return {
                "has_data": False,
                "message": "No health device connected. Connect Apple Health or Google Health Connect for personalized insights."
            }

        return {
            "has_data": True,
            "metrics": health_metrics,
            "insights": self._generate_health_insights(health_metrics),
        }

    def _generate_health_insights(self, metrics: dict) -> list[str]:
        """Generate actionable insights from health data."""
        insights = []

        # HRV-based recovery insight
        if hrv := metrics.get("health_hrv"):
            if hrv["value"] < 30:
                insights.append("HRV is low - consider a lighter workout or active recovery today")
            elif hrv["value"] > 60:
                insights.append("HRV is excellent - great day for an intense HIIT session")

        # Sleep-based insight
        if sleep := metrics.get("sleep_hours"):
            if sleep["value"] < 6:
                insights.append(f"Only {sleep['value']:.1f}h sleep - consider extending your fasting window to support recovery")
            elif sleep["value"] >= 7.5:
                insights.append("Well-rested - optimal conditions for fasting and exercise")

        # Resting HR trend insight
        if rhr := metrics.get("health_resting_hr"):
            if rhr["value"] > 75:
                insights.append("Elevated resting HR may indicate stress or incomplete recovery")

        return insights

    async def get_recovery_status(self) -> dict:
        """Assess user's recovery readiness based on health data."""
        service = MetricsService(self.db)

        # Get current health metrics
        health_context = await self.get_health_context()
        if not health_context.get("has_data"):
            return {
                "has_data": False,
                "message": "No health data available to assess recovery"
            }

        current_metrics = health_context["metrics"]
        score = 50  # baseline

        # HRV contribution
        if hrv_data := current_metrics.get("health_hrv"):
            hrv_trend = await service.get_trend(
                self.identity_id, "health_hrv", period_days=7
            )
            if hrv_trend:
                if hrv_trend.direction.value == "up":
                    score += 20
                elif hrv_trend.direction.value == "down":
                    score -= 15

        # Sleep contribution
        if sleep_data := current_metrics.get("sleep_hours"):
            sleep_value = sleep_data["value"]
            if sleep_value >= 7.5:
                score += 20
            elif sleep_value < 6:
                score -= 20

        # Resting HR contribution
        if rhr_data := current_metrics.get("health_resting_hr"):
            if rhr_data["value"] <= 60:
                score += 10
            elif rhr_data["value"] > 75:
                score -= 10

        # Clamp score
        score = max(0, min(100, score))

        return {
            "has_data": True,
            "recovery_score": score,
            "status": self._get_recovery_status_label(score),
            "recommendation": self._get_recovery_recommendation(score),
        }

    def _get_recovery_status_label(self, score: int) -> str:
        """Get recovery status label from score."""
        if score >= 80:
            return "excellent"
        elif score >= 60:
            return "good"
        elif score >= 40:
            return "moderate"
        else:
            return "needs_rest"

    def _get_recovery_recommendation(self, score: int) -> str:
        """Get workout recommendation based on recovery score."""
        if score >= 80:
            return "Fully recovered - great day for high-intensity training"
        elif score >= 60:
            return "Good recovery - moderate intensity recommended"
        elif score >= 40:
            return "Partial recovery - consider lighter activity or longer fast"
        else:
            return "Rest recommended - focus on sleep and gentle movement"

    async def get_health_summary(self) -> dict:
        """Get combined health summary including device data and bloodwork."""
        health_context = await self.get_health_context()
        recovery = await self.get_recovery_status()
        bloodwork = await self.get_bloodwork_summary()

        return {
            "device_health": health_context,
            "recovery": recovery if recovery.get("has_data") else None,
            "bloodwork": bloodwork if bloodwork.get("has_data") else None,
        }
