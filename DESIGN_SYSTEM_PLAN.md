# UGOKI Design System Redesign Plan

## Overview
Visual refresh of UGOKI mobile app with a robust, modular design system.

**Goal:** New visual design with proper component library architecture to enable easy future design changes.

---

## Current State Analysis

### What Exists (Good Foundation)
| Component | Status |
|-----------|--------|
| **Tamagui Config** | ✅ Color tokens, spacing, border radius, themes |
| **Core Components** | ✅ 11 shared components (Card, Button, Badge, Avatar, etc.) |
| **Light/Dark Themes** | ✅ Fully configured |

### Issues Found (Need Fixing)
| Issue | Impact |
|-------|--------|
| **Hardcoded colors** | 7+ feature files bypass theme system |
| **Mixed styling** | 3 approaches: Tamagui styled, StyleSheet, inline |
| **Component duplication** | 30-40% across features |
| **No typography scale** | Magic numbers like `fontSize={14}` |
| **No shadow tokens** | Hardcoded in StyleSheet |

### Files With Hardcoded Colors
- `features/research/components/ResearchCard.tsx` - 5 hardcoded colors
- `features/social/components/ChallengeCard.tsx` - theme detection + hardcoded
- `features/recipes/components/RecipeCard.tsx` - 
- `features/workouts/components/WorkoutCard.tsx` - difficulty colors
- `features/dashboard/components/ActiveFastCard.tsx` - success/warning
- `features/health/components/HealthSyncCard.tsx` - 
- `shared/components/ui/AppSwitch.tsx` - 

---

## Phase 1: Design Reference Collection (User Action)

### You Need To Do:
1. **Find 2-3 fitness/HIIT app designs** on Figma Community:
   - Search: "fitness app", "HIIT workout", "health tracker"
   - Look for: Modern color palette, bold typography, energetic feel

2. **Export reference screens** as PNG/JPG:
   - Home/Dashboard screen
   - Workout list/detail screen
   - Timer/active workout screen
   - Profile/settings screen
   - Any other key screens

3. **Save to project folder:**
   ```bash
   mkdir -p design-references
   # Save exported PNGs here
   ```

4. **Share with Claude:**
   ```
   Read designs from: design-references/
   ```

### What I'll Extract From Your References:
- Color palette (primary, secondary, accent, semantic)
- Typography scale (headings, body, captions)
- Spacing rhythm (base unit, scale multipliers)
- Border radius system
- Shadow/elevation levels
- Component patterns (cards, buttons, inputs)

---

## Phase 2: Design System Foundation

### 2.1 Update Tamagui Configuration
**File:** `apps/mobile/shared/theme/tamagui.config.ts`

Changes based on your references:
- [ ] New color palette with proper semantic naming
- [ ] Typography scale tokens (`$font-xs` → `$font-2xl`)
- [ ] Shadow/elevation tokens (`$shadow-sm`, `$shadow-md`, `$shadow-lg`)
- [ ] Line height tokens
- [ ] Update light/dark theme mappings

### 2.2 Create Design Tokens File
**New file:** `apps/mobile/shared/theme/tokens.ts`

```typescript
// Centralized token definitions
export const colors = {
  primary: { ... },
  secondary: { ... },
  semantic: { success, warning, error, info },
  neutral: { ... }
}

export const typography = {
  fontFamily: { ... },
  fontSize: { xs, sm, base, lg, xl, '2xl', '3xl' },
  fontWeight: { normal, medium, semibold, bold },
  lineHeight: { tight, normal, relaxed }
}

export const spacing = { ... }

export const shadows = {
  sm: { ... },
  md: { ... },
  lg: { ... }
}
```

---

## Phase 3: Component Library Consolidation

### 3.1 Fix Existing Core Components (11 files)
**Location:** `apps/mobile/shared/components/ui/`

| Component | Fix Required |
|-----------|-------------|
| AppButton.tsx | Update variants with new palette |
| AppSwitch.tsx | Remove hardcoded `#22c55e`, `#e4e4e7` |
| Badge.tsx | Update color variants |
| Card.tsx | Add shadow tokens, update radius |
| Avatar.tsx | Minor - mostly theme-compliant |
| StatCard.tsx | Update trend colors |
| ProgressRing.tsx | Theme-aware colors |
| LoadingSpinner.tsx | OK |
| ScreenHeader.tsx | OK |
| EmptyState.tsx | OK |
| ThemeToggle.tsx | Update icons if needed |

### 3.2 Create New Shared Components
**Location:** `apps/mobile/shared/components/ui/`

| New Component | Replaces | Used In |
|---------------|----------|---------|
| StatusBadge.tsx | Duplicated status badges | ResearchCard, ChallengeCard, WorkoutCard |
| MetricCard.tsx | Metric display pattern | health, metrics, dashboard |
| IconButton.tsx | Circular icon buttons | 10+ inline implementations |
| ProgressBar.tsx | Linear progress | workouts, fasting |
| SectionHeader.tsx | Feature section titles | dashboard, profile |

### 3.3 Fix Feature Components
Convert all hardcoded colors to theme tokens:

```typescript
// BEFORE (bad)
const textColor = isDark ? 'current color' : 'current color';

// AFTER (good)
<Text color="$color">...</Text>
```

---

## Phase 4: Migration Strategy

### 4.1 Approach: Incremental (Not Big Bang)
1. Update Tamagui config with new tokens
2. Create token aliases for backward compatibility
3. Fix core components one-by-one
4. Fix feature components by priority

### 4.2 Order of Operations
```
1. tokens.ts (foundation)
   ↓
2. tamagui.config.ts (integrate tokens)
   ↓
3. Core UI components (shared/components/ui/)
   ↓
4. High-priority feature components (hardcoded colors)
   ↓
5. Remaining feature components
   ↓
6. Documentation
```

### 4.3 Testing Each Change
- Visual regression: Compare screenshots before/after
- Theme toggle: Verify light/dark both work
- No hardcoded colors: Search for `#` hex values

---

## Phase 5: Documentation

### 5.1 Create Design System Guide
**New file:** `docs/guides/DESIGN_SYSTEM.md`

Contents:
- Color palette with usage guidelines
- Typography scale with examples
- Spacing system explanation
- Component usage examples
- "How to add new components" guide

---

## File Changes Summary

| Category | Files to Modify | New Files |
|----------|----------------|-----------|
| Theme Config | 1 | 1 (tokens.ts) |
| Core Components | 11 | 5 |
| Feature Components | 6+ | 0 |
| Documentation | 0 | 1-2 |

**Estimated files:** ~25 modifications, ~7 new files

---

## Verification Plan

1. **Visual check:** Run app, verify new design on all screens
2. **Theme toggle:** Test light → dark → light transitions
3. **No regressions:** All existing functionality works
4. **Code audit:**
   ```bash
   grep -r "#[0-9a-fA-F]\{6\}" apps/mobile/features/
   # Should return zero matches
   ```

---

## Workflow Benefits

### Current Workflow (Painful)
```
Want to change primary color?
  → Find 7+ files with hardcoded #14b8a6
  → Manually update each file
  → Hope you didn't miss any
  → Test everything
```

### New Workflow (Simple)
```
Want to change primary color?
  → Update tokens.ts: primary: '#newcolor'
  → Entire app updates automatically
  → Done
```

### Future Figma Integration (Optional)
```
Update Figma design
  → Export design tokens as JSON
  → Import to tokens.ts
  → Done
```

---

## How to Share Designs With Claude

### Method 1: Screenshots (Recommended)
```bash
# Save Figma exports to project
mkdir -p design-references
# Export screens as PNG/JPG to this folder

# Then tell Claude:
"Read designs from design-references/"
```

### Method 2: Figma MCP (6 calls/month)
- Better for extracting exact hex values
- Each API call counts toward limit
- Screenshots work fine without using quota

### Combining Multiple Designs
Yes, you can mix and match:
- "Use color palette from App A"
- "Use card styling from App B"
- "Use navigation pattern from App C"

---

## Next Steps Checklist

- [ ] Create `design-references/` folder
- [ ] Find 2-3 fitness app designs on Figma Community
- [ ] Export key screens as PNG/JPG
- [ ] Save to `design-references/`
- [ ] Share path with Claude to begin implementation
- [ ] Claude extracts design tokens
- [ ] Claude updates Tamagui config
- [ ] Claude fixes components incrementally
- [ ] Test and verify

---

## Approved New Color Palette

The following color palette has been approved for the UGOKI design system redesign:

| Role | Hex | Name | Usage |
|------|-----|------|-------|
| **Primary** | #3A5BA0 | Slate Blue | Primary buttons, active states, links, key UI elements |
| **Dark BG** | #1F2041 | Midnight Indigo | Dark theme backgrounds, text on light theme |
| **Accent 1** | #4A9B7F | Sage Green | Success states, health metrics, active badges |
| **Accent 2** | #FFA387 | Peach Coral | CTAs, highlights, achievements, warm accents |
| **Light** | #F5F3EF | Pearl Mist | Light accents, input fields, card backgrounds |
| **Background** | #FAFAF8 | Near White | Light theme background |

### Color Application Guide

**Light Theme:**
- Background: Near White (#FAFAF8)
- Cards/Inputs: Pearl Mist (#F5F3EF)
- Primary actions: Slate Blue (#3A5BA0)
- Text: Midnight Indigo (#1F2041)
- Success/Health: Sage Green (#4A9B7F)
- CTAs/Highlights: Peach Coral (#FFA387)

**Dark Theme:**
- Background: Midnight Indigo (#1F2041)
- Cards: Slightly lighter indigo (e.g., #2A2B4A)
- Primary actions: Slate Blue (#3A5BA0)
- Text: Pearl Mist (#F5F3EF)
- Success/Health: Sage Green (#4A9B7F)
- CTAs/Highlights: Peach Coral (#FFA387)

---

## Reference: Previous Tamagui Colors

For reference, previous UGOKI colors (being replaced):

| Token | Current Value | Usage |
|-------|--------------|-------|
| $primary | #14b8a6 (teal) | Main actions, branding |
| $secondary | #f97316 (orange) | Accents, CTAs |
| $success | #22c55e (green) | Success states |
| $warning | #eab308 (yellow) | Warning states |
| $error | #ef4444 (red) | Error states |
| $background | #fafafa / #121216 | Page background |
| $cardBackground | white / #1c1c1e | Card surfaces |
