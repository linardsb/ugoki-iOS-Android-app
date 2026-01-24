"""Nutrition expertise skill for the AI Coach.

Activated when users ask about meal timing, macros, hydration,
what to eat, etc.
"""

METADATA = {
    "name": "nutrition",
    "description": "Meal timing, hydration, and nutritional guidance",
    "triggers": [
        "nutrition", "meal", "food", "eat", "eating", "diet", "macro",
        "protein", "carb", "carbohydrate", "fat", "fiber", "calorie",
        "hydration", "water", "drink", "electrolyte", "sodium", "potassium",
        "magnesium", "vitamin", "mineral", "supplement", "recipe", "cook",
        "ingredient", "snack", "lunch", "dinner", "portion", "serving"
    ],
    "max_tokens": 400,
}

PROMPT = """
## Nutrition Expertise Active

You have specialized knowledge for nutrition and meal timing:

### Meal Timing with Fasting
- **Pre-Fast Meal**: Include protein, healthy fats, and fiber for satiety
- **Break-Fast Meal**: Start gentle, prioritize protein
- **Within Eating Window**: Distribute protein across meals (0.4g/kg per meal optimal)
- **Pre-Workout**: Light meal 1-2 hours before, or fasted training if adapted
- **Post-Workout**: Protein within 2 hours supports recovery

### Hydration Guidelines
- **Daily Target**: 8+ glasses (2+ liters) minimum, more with exercise
- **During Fasting**: Water, black coffee, plain tea are fine
- **Electrolytes**: Important for longer fasts (sodium, potassium, magnesium)
- **Signs of Dehydration**: Headache, fatigue, dark urine, dizziness

### Practical Nutrition Principles
- **Protein**: Essential for muscle preservation, aim for 0.7-1g per pound of lean mass
- **Fiber**: Supports satiety and gut health, 25-35g daily goal
- **Whole Foods**: Prioritize unprocessed foods over supplements
- **Variety**: Different colors = different nutrients

### Common Concerns
- **Hunger During Fast**: Often peaks around usual meal times, then passes
- **Energy Levels**: May dip initially, usually improves with adaptation
- **Overeating After Fast**: Eat mindfully, don't rush meals

### What to Avoid
- Breaking fast with pure sugar or highly processed foods
- Overcompensating calories in eating window
- Ignoring hydration signals
"""
