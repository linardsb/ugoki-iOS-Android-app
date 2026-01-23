# UGOKI Development Workflow

## First-Time Setup (or after native changes)

Build and install the native app on the simulator:

```bash
cd apps/mobile
bun run ios
```

This command:
1. Builds the native iOS app with Xcode
2. Installs it on the simulator
3. Starts Metro bundler

You only need to do this once, or when adding native dependencies.

---

## Daily Development Setup

You don't need Xcode open for daily development. The workflow is simple:

### 1. Start Metro Bundler

```bash
cd apps/mobile
bun run start
```

### 2. Open Simulator (if not already open)

Press `i` in the Metro terminal to open iOS simulator, or:

```bash
# Open simulator manually
open -a Simulator
```

### 3. Edit Code

Edit files in `apps/mobile/` using your preferred editor (Zed, VS Code, etc.). Metro will detect changes and hot-reload the app automatically.

---

## When You Need Xcode

Xcode is only required for:

| Scenario | Action |
|----------|--------|
| Adding native modules | Run `npx expo prebuild --clean` then rebuild |
| Changing `app.json` plugins | Run `npx expo prebuild` then rebuild |
| Building for physical device | Open `.xcworkspace` in Xcode, configure signing |
| Debugging native crashes | Use Xcode's debugger and console |

### Rebuilding After Native Changes

```bash
cd apps/mobile

# Regenerate iOS project
npx expo prebuild --platform ios --clean

# Install pods
cd ios && pod install && cd ..

# Build and run
bun run ios
```

Or open `ios/UGOKI.xcworkspace` in Xcode and press Play (Cmd+R).

---

## Development with Claude Code

Claude Code can edit all project files while Metro hot-reloads changes:

- TypeScript/JavaScript in `apps/mobile/app/` and `apps/mobile/features/`
- Styles, components, hooks, utilities
- No Xcode interaction needed for JS/TS changes

### Typical Claude Code Session

1. Start Metro: `bun run start`
2. Ask Claude to make changes
3. Changes auto-reload in simulator
4. Iterate

---

## Quick Reference

### Start Development Session

```bash
cd apps/mobile
bun run start
# Press 'i' for iOS simulator
```

### Metro Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `i` | Open iOS simulator |
| `a` | Open Android emulator |
| `r` | Reload app |
| `m` | Toggle dev menu |
| `j` | Open debugger |
| `o` | Open in editor |

### Common Commands

```bash
# Start dev server (daily use)
bun run start

# Build and run on iOS (first-time or after native changes)
bun run ios

# Fix package versions
npx expo install --fix

# Clear caches
npx expo start --clear

# Regenerate native projects
npx expo prebuild --clean
```

---

## Troubleshooting

### App Not Loading

1. Check Metro is running
2. Press `r` in Metro to reload
3. Shake device/simulator for dev menu then Reload

### Build Errors After Adding Packages

```bash
npx expo install --fix  # Fix version compatibility
npx expo prebuild --clean  # Regenerate native project
cd ios && pod install  # Reinstall pods
```

### Metro Cache Issues

```bash
npx expo start --clear
```

### Simulator Not Connecting

```bash
# Kill and restart simulator
xcrun simctl shutdown all
open -a Simulator
npx expo start
```

---

## Project Structure

```
apps/mobile/
├── app/                 # Screens (Expo Router)
│   ├── (auth)/         # Auth screens
│   ├── (tabs)/         # Main tab screens
│   └── (modals)/       # Modal screens
├── features/           # Feature modules
│   ├── health/         # Health integration
│   ├── chat/           # AI Coach
│   └── ...
├── shared/             # Shared utilities
├── ios/                # Native iOS project (generated)
└── android/            # Native Android project (generated)
```

Edit files in `app/` and `features/` - these hot-reload instantly.
