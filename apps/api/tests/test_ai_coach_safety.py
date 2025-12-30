"""Tests for AI Coach safety filtering."""

import pytest
from src.modules.ai_coach.safety import (
    check_message_safety,
    SafetyAction,
    filter_ai_response,
    get_safety_disclaimer,
)


class TestCheckMessageSafety:
    """Tests for the check_message_safety function."""

    # === BLOCKED: Medical Conditions ===

    def test_blocks_diabetes_mention(self):
        result = check_message_safety("I have diabetes, can I fast?")
        assert result.action == SafetyAction.BLOCK
        assert result.category == "medical_condition"
        assert "diabetes" in result.detected_keywords
        assert result.redirect_message is not None
        assert "healthcare" in result.redirect_message.lower()

    def test_blocks_heart_disease(self):
        result = check_message_safety("Is fasting safe with heart disease?")
        assert result.action == SafetyAction.BLOCK
        assert result.category == "medical_condition"

    def test_blocks_cancer_mention(self):
        result = check_message_safety("I'm undergoing chemotherapy, should I exercise?")
        assert result.action == SafetyAction.BLOCK
        assert result.category == "medical_condition"

    def test_blocks_eating_disorder(self):
        result = check_message_safety("I have a history of anorexia")
        assert result.action == SafetyAction.BLOCK
        assert result.category == "medical_condition"

    def test_blocks_pregnancy(self):
        result = check_message_safety("I'm pregnant, can I do HIIT?")
        assert result.action == SafetyAction.BLOCK
        assert result.category == "medical_condition"

    def test_blocks_breastfeeding(self):
        result = check_message_safety("I'm breastfeeding my baby")
        assert result.action == SafetyAction.BLOCK
        assert result.category == "medical_condition"

    # === BLOCKED: Emergency Keywords ===

    def test_blocks_emergency_chest_pain(self):
        result = check_message_safety("I'm having chest pain during workout")
        assert result.action == SafetyAction.BLOCK
        assert result.category == "emergency"
        assert "emergency" in result.redirect_message.lower() or "911" in result.redirect_message

    def test_blocks_difficulty_breathing(self):
        result = check_message_safety("I can't breathe properly")
        assert result.action == SafetyAction.BLOCK
        assert result.category == "emergency"

    def test_blocks_suicidal_thoughts(self):
        result = check_message_safety("I want to end my life")
        assert result.action == SafetyAction.BLOCK
        # Can be "emergency" or "medical_condition" depending on keyword order
        assert result.category in ["emergency", "medical_condition"]

    # === BLOCKED: Allergies ===

    def test_blocks_food_allergy(self):
        result = check_message_safety("I have a peanut allergy")
        assert result.action == SafetyAction.BLOCK
        assert result.category == "allergy"
        assert "allergy" in result.detected_keywords or "peanut allergy" in result.detected_keywords

    def test_blocks_celiac(self):
        result = check_message_safety("I have celiac disease")
        assert result.action == SafetyAction.BLOCK
        assert result.category == "allergy"

    def test_blocks_anaphylaxis(self):
        result = check_message_safety("I carry an epipen for anaphylaxis")
        assert result.action == SafetyAction.BLOCK
        assert result.category == "allergy"

    # === BLOCKED: Medications ===

    def test_blocks_medication_question(self):
        result = check_message_safety("Will fasting affect my medication?")
        assert result.action == SafetyAction.BLOCK
        assert result.category == "medication"

    def test_blocks_insulin(self):
        result = check_message_safety("I take insulin injections")
        assert result.action == SafetyAction.BLOCK
        assert result.category in ["medication", "medical_condition"]

    def test_blocks_drug_interaction(self):
        result = check_message_safety("Are there any drug interactions with fasting?")
        assert result.action == SafetyAction.BLOCK
        assert result.category == "medication"

    # === REDIRECT: Health Concerns ===

    def test_redirects_inflammation(self):
        result = check_message_safety("Does fasting help with inflammation?")
        assert result.action == SafetyAction.REDIRECT
        assert result.category == "health_concern"
        assert "inflammation" in result.detected_keywords

    def test_redirects_thyroid(self):
        result = check_message_safety("I have thyroid issues")
        assert result.action == SafetyAction.REDIRECT
        assert result.category == "health_concern"

    def test_redirects_depression(self):
        result = check_message_safety("I've been feeling depressed lately")
        assert result.action == SafetyAction.REDIRECT
        assert result.category == "health_concern"

    def test_redirects_blood_pressure(self):
        result = check_message_safety("Will this help my blood pressure?")
        assert result.action == SafetyAction.REDIRECT
        assert result.category == "health_concern"

    # === ALLOW: Safe Topics ===

    def test_allows_fasting_schedule(self):
        result = check_message_safety("What's the best fasting schedule for beginners?")
        assert result.action == SafetyAction.ALLOW
        assert result.detected_keywords == []

    def test_allows_workout_question(self):
        result = check_message_safety("Suggest a quick HIIT workout")
        assert result.action == SafetyAction.ALLOW

    def test_allows_motivation_request(self):
        result = check_message_safety("I need some motivation today")
        assert result.action == SafetyAction.ALLOW

    def test_allows_weight_question(self):
        result = check_message_safety("How do I track my weight goal?")
        assert result.action == SafetyAction.ALLOW

    def test_allows_hydration_question(self):
        result = check_message_safety("How much water should I drink during fasting?")
        assert result.action == SafetyAction.ALLOW

    def test_allows_progress_check(self):
        result = check_message_safety("Check my progress and streaks")
        assert result.action == SafetyAction.ALLOW

    def test_allows_greeting(self):
        result = check_message_safety("Hello! How are you?")
        assert result.action == SafetyAction.ALLOW

    # === Edge Cases ===

    def test_case_insensitive(self):
        result = check_message_safety("I HAVE DIABETES")
        assert result.action == SafetyAction.BLOCK

    def test_partial_word_not_matched(self):
        # "fast" should not match "breakfast"
        result = check_message_safety("What should I eat for breakfast?")
        # Should be allowed since "fast" is too short for partial matching
        assert result.action == SafetyAction.ALLOW

    def test_empty_message(self):
        result = check_message_safety("")
        assert result.action == SafetyAction.ALLOW

    def test_whitespace_handling(self):
        result = check_message_safety("   I   have   diabetes   ")
        assert result.action == SafetyAction.BLOCK


class TestFilterAIResponse:
    """Tests for the filter_ai_response function."""

    def test_adds_disclaimer_for_medical_advice(self):
        response = "You should take vitamin D supplements daily."
        filtered, was_modified = filter_ai_response(response)
        assert was_modified is True
        assert "medical professional" in filtered.lower() or "healthcare" in filtered.lower()

    def test_adds_disclaimer_for_dosage(self):
        response = "Try 500mg per day of magnesium."
        filtered, was_modified = filter_ai_response(response)
        assert was_modified is True

    def test_no_modification_for_safe_response(self):
        response = "Great job on completing your fast! Keep up the momentum."
        filtered, was_modified = filter_ai_response(response)
        assert was_modified is False
        assert filtered == response

    def test_no_modification_for_workout_advice(self):
        response = "I recommend trying the Quick HIIT Blast workout next."
        filtered, was_modified = filter_ai_response(response)
        assert was_modified is False


class TestGetSafetyDisclaimer:
    """Tests for the get_safety_disclaimer function."""

    def test_disclaimer_contains_key_elements(self):
        disclaimer = get_safety_disclaimer()
        assert "AI" in disclaimer
        assert "healthcare" in disclaimer.lower() or "medical" in disclaimer.lower()
        assert len(disclaimer) > 50  # Should be a meaningful disclaimer


class TestIntegration:
    """Integration tests for safety filtering."""

    def test_complex_message_with_multiple_keywords(self):
        # Message with both medical condition and medication
        result = check_message_safety(
            "I have diabetes and take insulin, can I do intermittent fasting?"
        )
        assert result.action == SafetyAction.BLOCK
        # Should detect multiple keywords
        assert len(result.detected_keywords) >= 2

    def test_safe_message_mentioning_healthy_topic(self):
        # Should not trigger on common words used in healthy context
        result = check_message_safety(
            "I want to improve my energy levels through exercise and better sleep"
        )
        assert result.action == SafetyAction.ALLOW

    def test_nutrition_question_without_medical_context(self):
        result = check_message_safety(
            "What should I eat during my eating window for best results?"
        )
        assert result.action == SafetyAction.ALLOW
