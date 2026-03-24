import SwiftUI

struct TaskSummaryView: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    let theme: AppTheme

    var body: some View {
        let day = viewModel.currentDay
        let streak = viewModel.calculateStreak()

        VStack(spacing: 4) {
            if day.totalCount > 0 {
                Text("\(day.completedCount) of \(day.totalCount) task\(day.totalCount == 1 ? "" : "s") completed")
                    .font(.system(size: 14))
                    .foregroundStyle(theme.textMuted)
            }

            if streak > 0 {
                HStack(spacing: 4) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(theme.flameColor)
                    Text("\(streak)")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(theme.textPrimary)
                    Text("day\(streak == 1 ? "" : "s") streak")
                        .font(.system(size: 14))
                        .foregroundStyle(theme.textMuted)
                }
            }
        }
        .padding(.vertical, 4)
    }
}
