import SwiftUI

struct TodayScreen: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    @State private var currentTheme: AppTheme = .classic
    @Binding var isShowingAddSheet: Bool

    private var day: DayData { viewModel.currentDay }

    private var priorityGroups: [(String, [PlannerTask])] {
        let sorted = day.sortedTasks
        var result: [(String, [PlannerTask])] = []
        for p in ["A", "B", "C"] {
            let tasks = sorted.filter { $0.priority == p }
            if !tasks.isEmpty {
                result.append((p, tasks))
            }
        }
        return result
    }

    var body: some View {
        ZStack {
            currentTheme.bgPage.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                AppHeaderView(theme: currentTheme)

                // Date strip
                DateStripView(theme: currentTheme)

                // Scrollable content
                ScrollView {
                    VStack(spacing: 16) {
                        // Stat cards
                        StatCardsView(theme: currentTheme)
                            .padding(.horizontal, 16)

                        // Task groups by priority
                        ForEach(priorityGroups, id: \.0) { priority, tasks in
                            TaskGroupView(
                                priority: priority,
                                tasks: tasks,
                                theme: currentTheme,
                                onAddTap: { isShowingAddSheet = true }
                            )
                            .padding(.horizontal, 16)
                        }

                        // Empty state
                        if day.tasks.isEmpty {
                            VStack(spacing: 12) {
                                Text("\u{1F4CB}")
                                    .font(.system(size: 40))
                                Text("No tasks yet")
                                    .font(OutfitFont.font(weight: .bold, size: 16))
                                    .foregroundStyle(currentTheme.textPrimary)
                                Text("Tap the + button to add your first task")
                                    .font(OutfitFont.font(weight: .regular, size: 13))
                                    .foregroundStyle(GHPalette.n400)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 32)
                        }

                        // Daily notes
                        DailyNotesView(theme: currentTheme)
                            .padding(.horizontal, 16)

                        // Streak card
                        StreakCardView(theme: currentTheme)
                            .padding(.horizontal, 16)

                        // Hoot tip
                        HootTipView(theme: currentTheme)
                            .padding(.horizontal, 16)

                        // Bottom spacing for tab bar + FAB
                        Spacer().frame(height: 100)
                    }
                    .padding(.top, 16)
                }
            }

            // Confetti overlay
            ConfettiView(isActive: $viewModel.showConfetti)
        }
        .gesture(
            DragGesture(minimumDistance: 50, coordinateSpace: .local)
                .onEnded { value in
                    if value.translation.width > 80 {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            viewModel.goToPreviousDay()
                        }
                    } else if value.translation.width < -80 {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            viewModel.goToNextDay()
                        }
                    }
                }
        )
        .onAppear {
            currentTheme = AppTheme(rawValue: viewModel.data.settings.theme) ?? .classic
            viewModel.checkRollover()
        }
    }
}
