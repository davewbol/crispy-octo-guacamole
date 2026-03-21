# DailyPlanner iOS App

A SwiftUI iOS companion app for the Daily Planner web app, built with the Franklin Covey task prioritization system.

## Requirements

- **Xcode 15+** (download from the Mac App Store)
- **iOS 17.0+** deployment target
- macOS Sonoma or later recommended

## Getting Started

### 1. Open the project

```
open DailyPlanner.xcodeproj
```

### 2. Select a simulator

In Xcode's toolbar, click the device selector and choose an iPhone simulator (e.g., "iPhone 15").

### 3. Build and run

Press `Cmd + R` or click the Play button. The app will build and launch in the simulator.

## Adding Firebase (for cloud sync)

The app works offline by default. To enable cloud sync with the web app:

### 1. Register the iOS app in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/) → your project (`daily-planner-17bef`)
2. Click **Add app** → **iOS**
3. Bundle ID: `com.dailyplanner.app`
4. Download `GoogleService-Info.plist`
5. Drag it into the `DailyPlanner/` folder in Xcode

### 2. Add Firebase SDK via Swift Package Manager

1. In Xcode: **File → Add Package Dependencies**
2. Enter: `https://github.com/firebase/firebase-ios-sdk`
3. Select products: `FirebaseAuth`, `FirebaseFirestore`
4. Add another package: `https://github.com/google/GoogleSignIn-iOS`
5. Select products: `GoogleSignIn`, `GoogleSignInSwift`

### 3. Configure URL schemes

1. Select the project in the navigator → **DailyPlanner** target → **Info** tab
2. Under **URL Types**, add a new one
3. Set the **URL Scheme** to the `REVERSED_CLIENT_ID` from `GoogleService-Info.plist`

### 4. Uncomment Firebase code

Search for `// TODO: Uncomment when Firebase SDK is added` in these files and uncomment the Firebase/Google Sign-In code:

- `DailyPlannerApp.swift`
- `AuthViewModel.swift`
- `FirebaseSyncService.swift`

## Project Structure

```
DailyPlanner/
├── DailyPlannerApp.swift         — App entry point
├── Models/                       — Data structures (matches Firestore schema)
│   ├── PlannerTask.swift
│   ├── DayData.swift
│   └── AppSettings.swift
├── ViewModels/                   — Business logic
│   ├── PlannerViewModel.swift    — Core: task CRUD, navigation, streak, heatmap
│   └── AuthViewModel.swift       — Google Sign-In (stub until Firebase added)
├── Services/                     — Data persistence
│   ├── LocalStorageService.swift — JSON file storage
│   └── FirebaseSyncService.swift — Firestore sync (stub until Firebase added)
├── Views/                        — SwiftUI views
│   ├── ContentView.swift         — Root view
│   ├── MainPlannerView.swift     — Primary layout with swipe navigation
│   ├── DateHeaderView.swift      — Date navigation + badge
│   ├── WeeklyHeatmapView.swift   — 7-day completion heatmap
│   ├── TaskSummaryView.swift     — Completion count + streak
│   ├── TaskListView.swift        — Scrollable task list
│   ├── TaskRowView.swift         — Individual task with all actions
│   ├── AddTaskView.swift         — New task input
│   ├── DailyNotesView.swift      — Per-day notes
│   ├── ForwardTaskSheet.swift    — Date picker for forwarding
│   ├── SettingsView.swift        — Theme, rollover, account
│   └── ConfettiView.swift        — Celebration animation
├── Theme/
│   └── AppTheme.swift            — 3 themes (classic, light, dark)
└── Utilities/
    └── DateHelpers.swift         — Date formatting
```

## Features

- **Task Management**: Add, edit, delete, and reorder tasks with A/B/C priorities
- **Status Cycling**: Tap to cycle: Open → Completed → Cancelled → Open
- **Task Forwarding**: Forward tasks to future dates
- **Auto-Rollover**: Automatically forwards incomplete past tasks to today
- **Daily Notes**: Per-day notes section
- **3 Themes**: Classic (sepia), Light, and Dark
- **Weekly Heatmap**: Visual completion overview for the current week
- **Streak Tracker**: Counts consecutive days of 100% completion
- **Confetti**: Celebration when all tasks are completed
- **Swipe Navigation**: Swipe left/right to change days
- **Haptic Feedback**: Tactile feedback on task interactions
- **Offline-First**: Works without internet, syncs when signed in
