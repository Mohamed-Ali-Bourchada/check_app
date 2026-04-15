# 💊 Treatment Tracker

A minimalist, Apple-inspired daily medicine tracker built with **React Native + Expo**. Designed for personal use — no login, no server, no complexity. Just tap your doses and go.

---

## ✨ Features

- **Apple-style UI** — SF Pro typography, glassmorphism header, `#F2F2F7` background, 22px rounded cards
- **Treatment plan** — Hardcoded medicine schedule with `startDate`, `endDate`, doses per day, and category (eyes / nose / oral)
- **Circle dose tracker** — Tap circles to mark each dose taken. Spring animations with haptic-feel scale effect
- **Days remaining** — Each card shows how many days are left in the treatment course, color-coded (green → orange → red)
- **Auto-completed section** — When `today > endDate`, the card automatically moves to a greyed-out "Completed" section
- **Daily auto-reset** — Doses reset every midnight automatically (stored per day key `YYYY-MM-DD`)
- **Persistent storage** — Uses `AsyncStorage` to save dose state across app restarts
- **Progress ring** — Header shows overall % of today's doses completed
- **Pull-to-refresh** — Swipe down to reload today's state
- **Dark mode aware** — Splash screen supports light/dark background

---

## 💉 Treatment Plan

| Medicine | Category | Doses/Day | Start | End |
|---|---|---|---|---|
| Levophta | 👁️ Eyes | 2 | Apr 15, 2026 | Apr 29, 2026 |
| Naabak | 👁️ Eyes | 2 | Apr 15, 2026 | Jun 13, 2026 |
| Physiol | 💧 Nose | 6 | Apr 15, 2026 | — (ongoing) |
| Thealose | 👁️ Eyes | 2 | Apr 15, 2026 | — (ongoing) |

> To add or modify medicines, edit the `treatmentPlan` array in `app/(tabs)/index.tsx`.

---

## 🗂️ Project Structure

```
checkApp/
├── app/
│   ├── _layout.tsx          # Root layout (SafeAreaProvider)
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab layout (single tab, no tab bar)
│   │   └── index.tsx        # Main tracker screen (all logic here)
│   └── modal.tsx
├── assets/
│   └── images/
│       ├── icon.png                      # App icon (iOS + Play Store)
│       ├── splash-icon.png               # Splash screen logo
│       ├── android-icon-foreground.png   # Adaptive icon foreground
│       ├── android-icon-background.png   # Adaptive icon background
│       └── android-icon-monochrome.png   # Themed icon (Android 13+)
├── app.json                 # Expo config (icon paths, splash, package name)
└── eas.json                 # EAS Build profiles
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Android device / emulator **or** [Expo Go](https://expo.dev/go)

### Install & Run

```bash
# Install dependencies
npm install

# Start dev server
npx expo start
```

Then:
- Press **`a`** → open on Android emulator
- Press **`w`** → open in browser
- **Scan QR code** with Expo Go on your Android phone

---

## 📦 Build APK (Android)

```bash
# Preview APK (installable on any Android device)
eas build -p android --profile preview

# Production build (for Play Store)
eas build -p android --profile production
```

The APK download link will appear in your [Expo dashboard](https://expo.dev) after the build completes (usually 5–15 min on the free tier).

---

## 🗄️ Storage Schema

Doses are stored in `AsyncStorage` with daily keys:

```
Key:   "doses_2026-04-15"
Value: { "levophta": 2, "naabak": 1, "physiol": 4, "thealose": 0 }
```

Each new day gets a fresh key → circles auto-reset at midnight. Previous days' data is preserved.

---

## 🎨 Design Tokens

| Token | Value |
|---|---|
| Background | `#F2F2F7` |
| Card | `#FFFFFF` |
| Primary blue | `#007AFF` |
| Success green | `#34C759` |
| Warning orange | `#FF9500` |
| Danger red | `#FF3B30` |
| Text primary | `#1C1C1E` |
| Text secondary | `#8E8E93` |
| Border subtle | `#E5E5EA` |
| Font | `-apple-system` / `sans-serif` |

---

## 📦 Key Dependencies

| Package | Purpose |
|---|---|
| `expo-router` | File-based navigation |
| `expo-blur` | Glassmorphism header |
| `expo-splash-screen` | Native splash screen |
| `@react-native-async-storage/async-storage` | Local persistence |
| `react-native-safe-area-context` | Safe area insets |

---

## 🔧 Customization

### Change medicine list
Edit `treatmentPlan` in `app/(tabs)/index.tsx`:
```ts
const treatmentPlan: TreatmentItem[] = [
  {
    id: 'my-medicine',
    name: 'My Medicine',
    dosesPerDay: 3,
    startDate: '2026-04-15',
    endDate: '2026-05-15',   // omit for ongoing
    category: 'oral',        // 'eyes' | 'nose' | 'oral'
  },
];
```

### Change splash screen / icon
Replace files in `assets/images/` and rebuild:
```
splash-icon.png              → 1024×1024px, transparent bg
icon.png                     → 1024×1024px, no transparency
android-icon-foreground.png  → 1024×1024px, white icon on transparent
android-icon-background.png  → 1024×1024px, solid color
```

---

## 📄 License

Personal use. Not intended for clinical or medical decision-making.
