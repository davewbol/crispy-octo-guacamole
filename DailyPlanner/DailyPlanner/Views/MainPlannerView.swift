import SwiftUI

struct MainPlannerView: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var currentTheme: AppTheme = .classic
    @State private var showSettings = false

    var body: some View {
        ZStack {
            currentTheme.bgPage.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    // Date navigation header
                    DateHeaderView(theme: currentTheme)

                    // Weekly heatmap
                    WeeklyHeatmapView(theme: currentTheme)

                    Divider()
                        .background(currentTheme.borderSecondary)

                    // Task summary + streak
                    TaskSummaryView(theme: currentTheme)

                    // Add task form
                    AddTaskView(theme: currentTheme)

                    // Task list
                    TaskListView(theme: currentTheme)
                        .padding(.horizontal, 12)

                    // Daily notes
                    DailyNotesView(theme: currentTheme)
                }
            }

            // Confetti overlay
            ConfettiView(isActive: $viewModel.showConfetti)
        }
        .preferredColorScheme(currentTheme.colorScheme)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showSettings = true
                } label: {
                    Image(systemName: "gearshape")
                        .foregroundStyle(currentTheme.textSecondary)
                }
            }
        }
        .sheet(isPresented: $showSettings) {
            SettingsView(theme: currentTheme) { newTheme in
                currentTheme = newTheme
            }
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
