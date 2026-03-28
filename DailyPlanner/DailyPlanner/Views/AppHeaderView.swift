import SwiftUI

struct AppHeaderView: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    let theme: AppTheme

    private var day: DayData { viewModel.currentDay }
    private var total: Int { day.tasks.filter { $0.isActionable }.count }
    private var done: Int { day.tasks.filter { $0.isCompleted }.count }
    private var remaining: Int { max(0, total - done) }
    private var pct: Int { total > 0 ? Int(Double(done) / Double(total) * 100) : 0 }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 { return "Good morning" }
        if hour < 17 { return "Good afternoon" }
        return "Good evening"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Logo row
            HStack {
                HStack(spacing: 8) {
                    Text("\u{1F989}")
                        .font(.system(size: 15))
                        .frame(width: 30, height: 30)
                        .background(GHPalette.amber400)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .shadow(color: GHShadow.amber.color, radius: GHShadow.amber.radius, y: GHShadow.amber.y)

                    Text("My Day Planner")
                        .font(OutfitFont.font(weight: .bold, size: 15))
                        .foregroundStyle(.white)
                }

                Spacer()

                HStack(spacing: 8) {
                    headerButton("\u{1F514}")
                    headerButton("\u{2699}")
                }
            }
            .padding(.bottom, 14)

            // Greeting
            Text("\(greeting) \u{2600}\u{FE0F}")
                .font(OutfitFont.font(weight: .regular, size: 11.5))
                .foregroundStyle(.white.opacity(0.45))
                .padding(.bottom, 3)

            // Dynamic title
            HStack(spacing: 0) {
                Text("\(remaining) tasks left ")
                    .font(OutfitFont.font(weight: .black, size: 24))
                    .foregroundStyle(.white)
                Text("today.")
                    .font(OutfitFont.font(weight: .black, size: 24))
                    .foregroundStyle(GHPalette.amber400)
            }
            .tracking(-0.6)
            .lineLimit(1)

            // Subtitle
            if total > 0 {
                Text("You've done \(done) of \(total) \u{2014} keep it going!")
                    .font(OutfitFont.font(weight: .regular, size: 12.5))
                    .foregroundStyle(.white.opacity(0.4))
                    .padding(.top, 4)
                    .padding(.bottom, 14)
            } else {
                Text("No tasks yet \u{2014} add your first one!")
                    .font(OutfitFont.font(weight: .regular, size: 12.5))
                    .foregroundStyle(.white.opacity(0.4))
                    .padding(.top, 4)
                    .padding(.bottom, 14)
            }

            // Progress bar
            HStack(spacing: 10) {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: GHRadius.full)
                            .fill(.white.opacity(0.12))
                            .frame(height: 5)
                        RoundedRectangle(cornerRadius: GHRadius.full)
                            .fill(GHPalette.amber400)
                            .frame(width: geo.size.width * CGFloat(pct) / 100, height: 5)
                            .animation(.easeOut(duration: 0.5), value: pct)
                    }
                }
                .frame(height: 5)

                Text("\(pct)%")
                    .font(OutfitFont.font(weight: .bold, size: 11.5))
                    .foregroundStyle(GHPalette.amber400)
            }
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 18)
        .background(
            ZStack {
                GHPalette.teal800
                // Radial amber gradient accent
                RadialGradient(
                    colors: [GHPalette.amber400.opacity(0.12), .clear],
                    center: .topTrailing,
                    startRadius: 0,
                    endRadius: 160
                )
                .offset(x: 60, y: -60)
            }
        )
    }

    private func headerButton(_ emoji: String) -> some View {
        Text(emoji)
            .font(.system(size: 15))
            .frame(width: 34, height: 34)
            .background(.white.opacity(0.1))
            .clipShape(Circle())
    }
}
