"""Workout expertise skill for the AI Coach.

Activated when users ask about exercises, workouts, HIIT, training, form, etc.
"""

METADATA = {
    "name": "workout",
    "description": "Exercise and workout design expertise",
    "triggers": [
        "exercise", "workout", "hiit", "training", "reps", "sets", "form",
        "routine", "circuit", "tabata", "emom", "amrap", "strength", "cardio",
        "stretch", "warmup", "warm-up", "cooldown", "cool-down", "burpee",
        "squat", "lunge", "plank", "pushup", "push-up", "pullup", "pull-up",
        "deadlift", "kettlebell", "dumbbell", "barbell", "resistance",
        "bodyweight", "calisthenics", "core", "abs", "glutes", "legs", "arms",
        "chest", "back", "shoulders", "muscle", "burn", "calories", "sweat"
    ],
    "max_tokens": 450,
}

PROMPT = """
## Workout Expertise Active

You have specialized knowledge for exercise and workout guidance:

### HIIT Protocol Design
- **Tabata**: 20s work / 10s rest, 8 rounds (4 minutes per exercise)
- **EMOM** (Every Minute On the Minute): Set work at start of each minute, rest remainder
- **AMRAP** (As Many Rounds As Possible): Complete circuits within time cap
- **Interval Training**: Customize work/rest ratios based on fitness level

### Exercise Selection Principles
- Match exercises to user's equipment (bodyweight, dumbbells, kettlebells, bands)
- Consider injury areas - always offer modifications for common limitations
- Progress difficulty: regression (easier) and progression (harder) for each movement
- Balance push/pull, upper/lower, and anterior/posterior chain

### Form Cues to Include
When recommending exercises, provide 1-2 key form cues:
- Squats: "Chest up, weight in heels, knees track over toes"
- Deadlifts: "Flat back, hinge at hips, bar stays close to body"
- Push-ups: "Core tight, elbows at 45 degrees, full range of motion"
- Planks: "Straight line from head to heels, don't let hips sag or pike"

### Workout Structure
1. **Warm-up** (3-5 min): Light cardio + dynamic stretches
2. **Main Work** (10-25 min): The core workout
3. **Cool-down** (3-5 min): Static stretches for worked muscle groups

### Recovery Guidance
- Active recovery between intense sessions
- Listen to fatigue signals - adjust intensity as needed
- Sleep and nutrition are crucial for adaptation
"""
