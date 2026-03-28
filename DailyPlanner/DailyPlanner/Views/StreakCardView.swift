import SwiftUI

struct StreakCardView: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    let theme: AppTheme

    private var streak: Int { viewModel.calculateStreak() }
    private var bestStreak: Int {
        let saved = UserDefaults.standard.integer(forKey: "bestStreak")
        return max(saved, streak)
    }

    var body: some View {
        HStack(spacing: 14) {
            Text("\u{1F525}")
                .font(.system(size: 32))

            VStack(alignment: .leading, spacing: 2) {
                Text("\(streak)-day streak")
                    .font(OutfitFont.font(weight: .black, size: 24))
                    .foregroundStyle(theme.textPrimary)
                    .tracking(-0.6)
                    .lineLimit(1)

                Text("Planning every day")
                    .font(OutfitFont.font(weight: .semibold, size: 12.5))
                    .foregroundStyle(GHPalette.amber600)

                Text("Best: \(bestStreak) days \u{00B7} Keep going!")
                    .font(OutfitFont.font(weight: .regular, size: 11))
                    .foregroundStyle(GHPalette.n500)
            }

            Spacer()

            // Mini bar chart for last 7 days
            HStack(alignment: .bottom, spacing: 4) {
                ForEach(0..<7, id: \.self) { i in
                    let dateStr = DateHelpers.addDays(DateHelpers.todayStr(), i - 6)
                    let pct = viewModel.completionPercent(for: dateStr)
                    let isToday = i == 6
                    let isDone = pct >= 100

                    RoundedRectangle(cornerRadius: 3)
                        .fill(isDone ? GHPalette.teal400 : (isToday ? GHPalette.amber400 : GHPalette.amber300))
                        .frame(width: 8, height: barHeight(pct: pct))
                }
            }
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [GHPalette.amber50, GHPalette.amber100],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: GHRadius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: GHRadius.xl)
                .stroke(GHPalette.amber200, lineWidth: 1.5)
        )
    }

    private func barHeight(pct: Int) -> CGFloat {
        if pct < 0 { return 8 }
        let clamped = min(100, max(0, pct))
        return CGFloat(8 + Int(Double(clamped) / 100.0 * 24))
    }
}
