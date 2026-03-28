import SwiftUI

struct TaskGroupView: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    let priority: String
    let tasks: [PlannerTask]
    let theme: AppTheme
    var onAddTap: () -> Void

    private var sectionTitle: String {
        switch priority {
        case "A": return "\u{1F525} High Priority"
        case "B": return "\u{1F4CC} Important"
        default: return "\u{1F4CB} Nice to Do"
        }
    }

    private var sectionEmoji: String {
        switch priority {
        case "A": return "\u{1F525}"
        case "B": return "\u{1F4CC}"
        default: return "\u{1F4CB}"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Section header
            HStack {
                Text(sectionTitle)
                    .font(OutfitFont.font(weight: .bold, size: 10.5))
                    .foregroundStyle(GHPalette.n400)
                    .textCase(.uppercase)
                    .tracking(1)

                Spacer()
            }
            .padding(.bottom, 8)

            // Task card
            VStack(spacing: 0) {
                ForEach(Array(tasks.enumerated()), id: \.element.id) { index, task in
                    TaskRowView(task: task, theme: theme, priority: priority)
                    if index < tasks.count - 1 {
                        Divider()
                            .background(GHPalette.n100)
                    }
                }

                // Add task row
                addRow
            }
            .background(theme.bgCard)
            .clipShape(RoundedRectangle(cornerRadius: GHRadius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: GHRadius.xl)
                    .stroke(theme.borderPrimary, lineWidth: 1.5)
            )
            .shadow(color: GHShadow.sm.color, radius: GHShadow.sm.radius, y: GHShadow.sm.y)
        }
    }

    private var addRow: some View {
        Button(action: onAddTap) {
            HStack(spacing: 10) {
                Text("\uFF0B")
                    .font(OutfitFont.font(weight: .black, size: 13))
                    .foregroundStyle(GHPalette.teal800)
                    .frame(width: 22, height: 22)
                    .background(GHPalette.amber400)
                    .clipShape(RoundedRectangle(cornerRadius: 6))

                Text("Add task\u{2026}")
                    .font(OutfitFont.font(weight: .semibold, size: 13.5))
                    .foregroundStyle(GHPalette.amber600)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 11)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(GHPalette.amber50)
            .overlay(
                Rectangle()
                    .stroke(style: StrokeStyle(lineWidth: 1.5, dash: [6, 4]))
                    .foregroundStyle(GHPalette.amber200)
                    .frame(height: 1.5),
                alignment: .top
            )
        }
    }
}
