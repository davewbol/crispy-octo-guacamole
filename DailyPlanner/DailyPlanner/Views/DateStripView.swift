import SwiftUI

struct DateStripView: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    let theme: AppTheme

    private let dayCount = 9

    private var dates: [String] {
        let today = DateHelpers.todayStr()
        var result: [String] = []
        for i in -4...4 {
            result.append(DateHelpers.addDays(today, i))
        }
        return result
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(dates, id: \.self) { dateStr in
                        datePill(for: dateStr)
                            .id(dateStr)
                            .onTapGesture {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    viewModel.navigateTo(dateStr)
                                }
                            }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
            .background(GHPalette.teal800)
            .onAppear {
                proxy.scrollTo(DateHelpers.todayStr(), anchor: .center)
            }
        }
    }

    private func datePill(for dateStr: String) -> some View {
        let isToday = dateStr == DateHelpers.todayStr()
        let isSelected = dateStr == viewModel.currentDate
        let hasTasks = (viewModel.data.days[dateStr]?.tasks.count ?? 0) > 0

        return VStack(spacing: 3) {
            Text(DateHelpers.shortWeekday(dateStr))
                .font(OutfitFont.font(weight: .bold, size: 9.6))
                .tracking(0.6)
                .textCase(.uppercase)
                .foregroundStyle(isToday ? GHPalette.teal800.opacity(0.6) : .white.opacity(0.5))

            Text(dayNumber(dateStr))
                .font(OutfitFont.font(weight: .heavy, size: 16))
                .foregroundStyle(isToday ? GHPalette.teal800 : .white)

            Circle()
                .fill(isToday ? GHPalette.teal800.opacity(0.4) : .white.opacity(0.35))
                .frame(width: 4, height: 4)
                .opacity(hasTasks ? 1 : 0)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .frame(minWidth: 48)
        .background(
            RoundedRectangle(cornerRadius: GHRadius.lg)
                .fill(isToday ? GHPalette.amber400 : (isSelected ? .white.opacity(0.14) : .white.opacity(0.07)))
                .shadow(color: isToday ? GHShadow.amber.color : .clear, radius: isToday ? GHShadow.amber.radius : 0, y: isToday ? GHShadow.amber.y : 0)
        )
    }

    private func dayNumber(_ dateStr: String) -> String {
        let date = DateHelpers.parseDate(dateStr)
        return "\(Calendar.current.component(.day, from: date))"
    }
}
