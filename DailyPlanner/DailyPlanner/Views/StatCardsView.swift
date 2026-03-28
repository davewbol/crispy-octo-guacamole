import SwiftUI

struct StatCardsView: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    let theme: AppTheme

    private var day: DayData { viewModel.currentDay }
    private var done: Int { day.tasks.filter { $0.isCompleted }.count }
    private var left: Int { max(0, day.tasks.filter { $0.isActionable }.count - done) }
    private var streak: Int { viewModel.calculateStreak() }

    var body: some View {
        HStack(spacing: 10) {
            statCard(value: "\(done)", label: "Done", color: theme.textPrimary)
            statCard(value: "\u{1F525}\(streak)", label: "Streak", color: GHPalette.amber500)
            statCard(value: "\(left)", label: "Left", color: GHPalette.sage400)
        }
    }

    private func statCard(value: String, label: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(OutfitFont.font(weight: .black, size: 22))
                .foregroundStyle(color)
                .tracking(-0.6)
                .lineLimit(1)

            Text(label)
                .font(OutfitFont.font(weight: .semibold, size: 10))
                .foregroundStyle(GHPalette.n400)
                .textCase(.uppercase)
                .tracking(0.6)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .padding(.horizontal, 10)
        .background(theme.bgCard)
        .clipShape(RoundedRectangle(cornerRadius: GHRadius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: GHRadius.lg)
                .stroke(theme.borderPrimary, lineWidth: 1.5)
        )
        .shadow(color: GHShadow.sm.color, radius: GHShadow.sm.radius, y: GHShadow.sm.y)
    }
}
