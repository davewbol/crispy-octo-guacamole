import SwiftUI

struct CalendarScreen: View {
    @EnvironmentObject var viewModel: PlannerViewModel

    @State private var displayedMonth = Date()
    private let weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    private var monthTitle: String {
        let f = DateFormatter()
        f.dateFormat = "MMMM yyyy"
        return f.string(from: displayedMonth)
    }

    private var calendarDays: [CalendarDay] {
        let cal = Calendar.current
        guard let range = cal.range(of: .day, in: .month, for: displayedMonth),
              let firstOfMonth = cal.date(from: cal.dateComponents([.year, .month], from: displayedMonth))
        else { return [] }

        // Weekday of first day (1=Sun in Calendar, convert to Mon-based: Mon=0)
        let firstWeekday = cal.component(.weekday, from: firstOfMonth)
        let offset = (firstWeekday + 5) % 7 // Mon-based offset

        var days: [CalendarDay] = []

        // Previous month padding
        for i in (0..<offset).reversed() {
            if let date = cal.date(byAdding: .day, value: -(i + 1), to: firstOfMonth) {
                let dateStr = DateHelpers.toDateStr(date)
                let hasTasks = (viewModel.data.days[dateStr]?.tasks.count ?? 0) > 0
                days.append(CalendarDay(date: date, dateStr: dateStr, isCurrentMonth: false, hasTasks: hasTasks))
            }
        }

        // Current month
        for day in range {
            if let date = cal.date(byAdding: .day, value: day - 1, to: firstOfMonth) {
                let dateStr = DateHelpers.toDateStr(date)
                let hasTasks = (viewModel.data.days[dateStr]?.tasks.count ?? 0) > 0
                days.append(CalendarDay(date: date, dateStr: dateStr, isCurrentMonth: true, hasTasks: hasTasks))
            }
        }

        // Next month padding to fill grid
        let remainder = days.count % 7
        if remainder > 0 {
            let lastDate = days.last?.date ?? Date()
            for i in 1...(7 - remainder) {
                if let date = cal.date(byAdding: .day, value: i, to: lastDate) {
                    let dateStr = DateHelpers.toDateStr(date)
                    let hasTasks = (viewModel.data.days[dateStr]?.tasks.count ?? 0) > 0
                    days.append(CalendarDay(date: date, dateStr: dateStr, isCurrentMonth: false, hasTasks: hasTasks))
                }
            }
        }

        return days
    }

    private var selectedDayTasks: [PlannerTask] {
        viewModel.currentDay.sortedTasks
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 0) {
                HStack {
                    Text("Calendar")
                        .font(OutfitFont.font(weight: .black, size: 22))
                        .foregroundStyle(.white)
                        .tracking(-0.5)

                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 12)

                // Month navigation
                HStack {
                    Button {
                        changeMonth(by: -1)
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white.opacity(0.7))
                            .frame(width: 34, height: 34)
                            .background(.white.opacity(0.1))
                            .clipShape(Circle())
                    }

                    Spacer()

                    Text(monthTitle)
                        .font(OutfitFont.font(weight: .bold, size: 16))
                        .foregroundStyle(.white)

                    Spacer()

                    Button {
                        changeMonth(by: 1)
                    } label: {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white.opacity(0.7))
                            .frame(width: 34, height: 34)
                            .background(.white.opacity(0.1))
                            .clipShape(Circle())
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 16)
            }
            .background(GHPalette.teal800)

            ScrollView {
                VStack(spacing: 16) {
                    // Calendar grid
                    calendarGrid
                        .padding(.horizontal, 16)

                    // Selected day tasks
                    if !selectedDayTasks.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Tasks for \(DateHelpers.formatDisplay(viewModel.currentDate))")
                                .font(OutfitFont.font(weight: .bold, size: 13))
                                .foregroundStyle(GHPalette.n400)
                                .textCase(.uppercase)
                                .tracking(0.6)
                                .padding(.horizontal, 4)

                            VStack(spacing: 0) {
                                ForEach(Array(selectedDayTasks.enumerated()), id: \.element.id) { index, task in
                                    eventRow(task: task)
                                    if index < selectedDayTasks.count - 1 {
                                        Divider().background(GHPalette.n100)
                                    }
                                }
                            }
                            .background(Color.white)
                            .clipShape(RoundedRectangle(cornerRadius: GHRadius.xl))
                            .overlay(
                                RoundedRectangle(cornerRadius: GHRadius.xl)
                                    .stroke(GHPalette.n200, lineWidth: 1.5)
                            )
                            .shadow(color: GHShadow.sm.color, radius: GHShadow.sm.radius, y: GHShadow.sm.y)
                        }
                        .padding(.horizontal, 16)
                    } else {
                        VStack(spacing: 8) {
                            Text("No tasks for this day")
                                .font(OutfitFont.font(weight: .medium, size: 14))
                                .foregroundStyle(GHPalette.n400)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 24)
                    }

                    Spacer().frame(height: 80)
                }
                .padding(.top, 16)
            }
            .background(GHPalette.n50)
        }
    }

    // MARK: - Calendar Grid

    private var calendarGrid: some View {
        VStack(spacing: 0) {
            // Weekday headers
            HStack(spacing: 0) {
                ForEach(weekdays, id: \.self) { day in
                    Text(day)
                        .font(OutfitFont.font(weight: .bold, size: 10))
                        .foregroundStyle(GHPalette.n400)
                        .textCase(.uppercase)
                        .tracking(0.5)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.vertical, 10)

            // Day cells
            let columns = Array(repeating: GridItem(.flexible(), spacing: 0), count: 7)
            LazyVGrid(columns: columns, spacing: 4) {
                ForEach(calendarDays) { day in
                    dayCell(day)
                        .onTapGesture {
                            viewModel.navigateTo(day.dateStr)
                        }
                }
            }
        }
        .padding(14)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: GHRadius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: GHRadius.xl)
                .stroke(GHPalette.n200, lineWidth: 1.5)
        )
        .shadow(color: GHShadow.sm.color, radius: GHShadow.sm.radius, y: GHShadow.sm.y)
    }

    private func dayCell(_ day: CalendarDay) -> some View {
        let isToday = day.dateStr == DateHelpers.todayStr()
        let isSelected = day.dateStr == viewModel.currentDate

        return VStack(spacing: 2) {
            Text("\(Calendar.current.component(.day, from: day.date))")
                .font(OutfitFont.font(weight: isToday ? .bold : .medium, size: 14))
                .foregroundStyle(
                    isToday ? GHPalette.teal800 :
                    (day.isCurrentMonth ? GHPalette.teal800 : GHPalette.n300)
                )

            Circle()
                .fill(GHPalette.amber400)
                .frame(width: 4, height: 4)
                .opacity(day.hasTasks ? 1 : 0)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 40)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(isToday ? GHPalette.amber400.opacity(0.2) :
                      (isSelected ? GHPalette.teal50 : .clear))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(isSelected && !isToday ? GHPalette.teal400.opacity(0.4) : .clear, lineWidth: 1)
        )
    }

    private func eventRow(task: PlannerTask) -> some View {
        let borderColor: Color = {
            switch task.priority {
            case "A": return GHPalette.coral400
            case "B": return GHPalette.amber400
            default: return GHPalette.teal400
            }
        }()

        let bgColor: Color = {
            switch task.priority {
            case "A": return GHPalette.coral100.opacity(0.5)
            case "B": return GHPalette.amber50
            default: return GHPalette.teal50
            }
        }()

        return HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 2)
                .fill(borderColor)
                .frame(width: 3, height: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(task.text)
                    .font(OutfitFont.font(weight: .medium, size: 14))
                    .foregroundStyle(GHPalette.teal800)
                    .strikethrough(task.isCompleted, color: GHPalette.n400)
                    .lineLimit(1)

                Text(task.status.capitalized)
                    .font(OutfitFont.font(weight: .medium, size: 11))
                    .foregroundStyle(GHPalette.n400)
            }

            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(bgColor)
    }

    // MARK: - Helpers

    private func changeMonth(by value: Int) {
        if let newDate = Calendar.current.date(byAdding: .month, value: value, to: displayedMonth) {
            withAnimation(.easeInOut(duration: 0.2)) {
                displayedMonth = newDate
            }
        }
    }
}

// MARK: - Calendar Day Model

private struct CalendarDay: Identifiable {
    let id = UUID()
    let date: Date
    let dateStr: String
    let isCurrentMonth: Bool
    let hasTasks: Bool
}
