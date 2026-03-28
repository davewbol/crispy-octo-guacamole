import SwiftUI

struct HootTipView: View {
    let theme: AppTheme

    private let tips = [
        "Start with your hardest task first \u{2014} everything else feels easier after that.",
        "Break big goals into daily tasks \u{2014} small wins compound into big results.",
        "Review your day each evening \u{2014} reflection builds better habits.",
        "Time-box your tasks \u{2014} Parkinson's law says work expands to fill the time available.",
        "Celebrate small wins \u{2014} momentum matters more than perfection."
    ]

    private var tip: String {
        let day = Calendar.current.component(.day, from: Date())
        return tips[day % tips.count]
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\u{1F989}")
                .font(.system(size: 22))

            VStack(alignment: .leading, spacing: 3) {
                Text("Hoot tip")
                    .font(OutfitFont.font(weight: .bold, size: 13))
                    .foregroundStyle(GHPalette.amber400)

                Text(tip)
                    .font(OutfitFont.font(weight: .regular, size: 12.5))
                    .foregroundStyle(.white.opacity(0.6))
                    .lineSpacing(4)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            ZStack {
                GHPalette.teal800
                // Decorative circle
                Circle()
                    .fill(GHPalette.amber400.opacity(0.1))
                    .frame(width: 100, height: 100)
                    .offset(x: 60, y: 40)
            }
        )
        .clipShape(RoundedRectangle(cornerRadius: GHRadius.xl))
    }
}
