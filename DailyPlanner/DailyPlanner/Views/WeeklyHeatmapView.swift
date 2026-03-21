import SwiftUI

struct WeeklyHeatmapView: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    let theme: AppTheme

    var body: some View {
        let weekDates = viewModel.weekDates()
        let today = DateHelpers.todayStr()
        let dayLabels = ["M", "T", "W", "T", "F", "S", "S"]

        HStack(spacing: 6) {
            ForEach(Array(weekDates.enumerated()), id: \.offset) { idx, dateStr in
                let pct = viewModel.completionPercent(for: dateStr)
                let isToday = dateStr == today
                let isCurrent = dateStr == viewModel.currentDate

                VStack(spacing: 2) {
                    Text(dayLabels[idx])
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(theme.textFaint)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(theme.heatmapColor(for: pct))
                        .frame(width: 24, height: 24)
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(isToday ? theme.textPrimary : (isCurrent ? theme.textMuted : .clear), lineWidth: isToday ? 2 : 1)
                        )
                        .onTapGesture {
                            viewModel.navigateTo(dateStr)
                        }
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 8)
    }
}
