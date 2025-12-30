"""Safety filtering for AI Coach to avoid medical advice liability."""

import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class SafetyAction(str, Enum):
    """Actions to take based on safety check."""
    ALLOW = "allow"           # Safe to proceed
    REDIRECT = "redirect"     # Redirect to professional, but respond helpfully
    BLOCK = "block"           # Do not send to AI, return safety message immediately


@dataclass
class SafetyResult:
    """Result of a safety check on user message."""
    action: SafetyAction
    detected_keywords: list[str]
    category: Optional[str] = None
    redirect_message: Optional[str] = None


# Medical conditions that require immediate redirect (BLOCK - don't send to AI)
BLOCKED_MEDICAL_CONDITIONS = [
    # Serious medical conditions
    "diabetes", "diabetic", "insulin", "blood sugar", "glucose level",
    "heart disease", "cardiovascular", "heart attack", "heart condition",
    "cardiac", "arrhythmia", "pacemaker",
    "cancer", "tumor", "chemotherapy", "radiation therapy", "oncology",
    "kidney disease", "kidney failure", "dialysis", "renal",
    "liver disease", "liver failure", "hepatitis", "cirrhosis",
    "eating disorder", "anorexia", "bulimia", "binge eating", "purging",
    "seizure", "epilepsy", "epileptic",
    "stroke", "blood clot", "embolism", "thrombosis",

    # Pregnancy/nursing
    "pregnant", "pregnancy", "expecting a baby", "trimester",
    "breastfeeding", "nursing mother", "lactating",

    # Mental health emergencies
    "suicidal", "suicide", "self-harm", "cutting myself",
    "want to die", "end my life",

    # Emergency symptoms
    "chest pain", "difficulty breathing", "can't breathe",
    "severe pain", "unbearable pain", "emergency",
    "fainting", "blacking out", "passed out", "unconscious",
    "blood in stool", "blood in urine", "vomiting blood",
]

# Allergy-related terms (BLOCK - potential anaphylaxis risk)
BLOCKED_ALLERGY_TERMS = [
    "allergy", "allergic", "allergies", "allergic reaction",
    "anaphylaxis", "anaphylactic", "epipen", "epinephrine",
    "food allergy", "nut allergy", "peanut allergy", "tree nut",
    "shellfish allergy", "seafood allergy", "fish allergy",
    "dairy allergy", "milk allergy", "lactose intolerant",
    "egg allergy", "soy allergy", "wheat allergy",
    "gluten allergy", "celiac", "coeliac",
    "hives", "swelling", "throat closing", "tongue swelling",
]

# Medication-related terms (BLOCK - drug interaction risk)
BLOCKED_MEDICATION_TERMS = [
    "medication", "medicine", "prescription", "prescribed",
    "drug interaction", "side effect", "adverse effect",
    "taking pills", "on medication", "my meds",
    "insulin injection", "blood thinner", "warfarin", "coumadin",
    "metformin", "ozempic", "wegovy", "mounjaro",
    "antidepressant", "ssri", "anxiety medication",
    "blood pressure medication", "beta blocker",
    "thyroid medication", "levothyroxine", "synthroid",
]

# Health topics that need gentle redirect (REDIRECT - respond but suggest professional)
REDIRECT_HEALTH_TOPICS = [
    # General health concerns
    "inflammation", "chronic inflammation", "autoimmune",
    "thyroid", "hypothyroid", "hyperthyroid", "hashimoto",
    "hormone", "hormonal imbalance", "endocrine",
    "blood pressure", "hypertension", "hypotension",
    "cholesterol", "triglycerides", "lipid",

    # Mental health (non-emergency)
    "depression", "depressed", "anxiety", "anxious",
    "panic attack", "mental health", "therapy",
    "insomnia", "sleep disorder",

    # Age/condition concerns
    "elderly", "senior", "over 70", "under 18", "teenager",
    "underweight", "bmi under", "very thin",

    # Symptoms
    "dizziness", "dizzy", "lightheaded", "nausea",
    "headache", "migraine", "chronic pain",
    "fatigue", "exhausted all the time", "no energy",
    "irregular heartbeat", "palpitations",
]

# Safe topics we CAN discuss freely
SAFE_TOPICS = [
    "fasting schedule", "fasting protocol", "16:8", "18:6", "20:4",
    "intermittent fasting", "eating window",
    "workout", "exercise", "hiit", "strength training",
    "motivation", "habit", "consistency", "streak",
    "hydration", "water", "electrolytes",
    "sleep", "rest", "recovery",
    "weight goal", "weight loss", "weight gain",
    "calories", "macros", "protein",
    "progress", "level", "xp", "achievement",
]


def _normalize_text(text: str) -> str:
    """Normalize text for keyword matching."""
    # Lowercase and remove extra whitespace
    text = text.lower().strip()
    text = re.sub(r'\s+', ' ', text)
    return text


def _find_keywords(text: str, keyword_list: list[str]) -> list[str]:
    """Find all matching keywords in text."""
    normalized = _normalize_text(text)
    found = []

    for keyword in keyword_list:
        # Use word boundary matching for short keywords to avoid false positives
        if len(keyword) <= 4:
            pattern = rf'\b{re.escape(keyword)}\b'
            if re.search(pattern, normalized):
                found.append(keyword)
        else:
            if keyword in normalized:
                found.append(keyword)

    return found


def check_message_safety(message: str) -> SafetyResult:
    """
    Check if a user message contains health-sensitive content.

    Returns SafetyResult with:
    - action: ALLOW, REDIRECT, or BLOCK
    - detected_keywords: list of matched keywords
    - category: category of concern
    - redirect_message: message to return if blocked/redirected
    """
    normalized = _normalize_text(message)

    # Check BLOCKED categories first (most serious)

    # 1. Check for medication terms
    med_keywords = _find_keywords(message, BLOCKED_MEDICATION_TERMS)
    if med_keywords:
        return SafetyResult(
            action=SafetyAction.BLOCK,
            detected_keywords=med_keywords,
            category="medication",
            redirect_message=(
                "I'm not able to provide advice about medications or drug interactions. "
                "This is really important to discuss with your doctor or pharmacist, "
                "as they can review your specific medications and health history.\n\n"
                "Is there something else I can help you with, like fasting schedules or workout ideas?"
            ),
        )

    # 2. Check for allergy terms
    allergy_keywords = _find_keywords(message, BLOCKED_ALLERGY_TERMS)
    if allergy_keywords:
        return SafetyResult(
            action=SafetyAction.BLOCK,
            detected_keywords=allergy_keywords,
            category="allergy",
            redirect_message=(
                "Food allergies are a serious health matter that I'm not qualified to advise on. "
                "Please consult with an allergist or your doctor about managing allergies safely.\n\n"
                "If you're having an allergic reaction right now, please seek medical help immediately.\n\n"
                "I'm happy to help with general fasting tips or workout suggestions instead!"
            ),
        )

    # 3. Check for serious medical conditions
    medical_keywords = _find_keywords(message, BLOCKED_MEDICAL_CONDITIONS)
    if medical_keywords:
        # Check for emergency keywords
        emergency_terms = ["chest pain", "can't breathe", "difficulty breathing",
                         "suicidal", "suicide", "self-harm", "emergency",
                         "severe pain", "passed out", "blood in"]
        is_emergency = any(term in normalized for term in emergency_terms)

        if is_emergency:
            return SafetyResult(
                action=SafetyAction.BLOCK,
                detected_keywords=medical_keywords,
                category="emergency",
                redirect_message=(
                    "This sounds like it could be a medical emergency. "
                    "Please contact emergency services (911 in the US) or go to your nearest emergency room immediately.\n\n"
                    "Your health and safety are the top priority."
                ),
            )

        return SafetyResult(
            action=SafetyAction.BLOCK,
            detected_keywords=medical_keywords,
            category="medical_condition",
            redirect_message=(
                "I appreciate you sharing that with me, but I'm not qualified to give advice "
                "about medical conditions. For questions about how fasting or exercise might affect "
                "your specific health situation, please consult with your healthcare provider.\n\n"
                "They can give you personalized guidance that's safe for your needs.\n\n"
                "In the meantime, I'm here to help with general wellness tips, motivation, "
                "or answer questions about using the app!"
            ),
        )

    # Check REDIRECT categories (less serious but still needs professional input)
    redirect_keywords = _find_keywords(message, REDIRECT_HEALTH_TOPICS)
    if redirect_keywords:
        return SafetyResult(
            action=SafetyAction.REDIRECT,
            detected_keywords=redirect_keywords,
            category="health_concern",
            redirect_message=None,  # AI can respond but will add disclaimer
        )

    # No concerns found - safe to proceed
    return SafetyResult(
        action=SafetyAction.ALLOW,
        detected_keywords=[],
        category=None,
        redirect_message=None,
    )


def get_safety_disclaimer() -> str:
    """Get the standard health disclaimer to append to redirected responses."""
    return (
        "\n\n---\n"
        "*Remember: I'm an AI wellness coach, not a medical professional. "
        "For health concerns, please consult with a qualified healthcare provider.*"
    )


def filter_ai_response(response: str) -> tuple[str, bool]:
    """
    Scan AI response for medical advice and add disclaimer if needed.

    Returns:
    - (filtered_response, was_modified)
    """
    # Keywords that suggest medical advice in the response
    medical_advice_indicators = [
        "you should take", "try taking", "dosage", "mg per day",
        "stop taking", "start taking", "increase your",
        "treatment for", "cure for", "remedy for",
        "diagnose", "diagnosis", "condition is",
        "you have", "you might have", "symptoms of",
    ]

    response_lower = response.lower()
    contains_medical = any(indicator in response_lower for indicator in medical_advice_indicators)

    if contains_medical:
        return response + get_safety_disclaimer(), True

    return response, False
