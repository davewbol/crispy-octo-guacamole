import SwiftUI

struct TaskRowView: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    let task: PlannerTask
    let theme: AppTheme
    let priority: String

    @State private var isEditing = false
    @State private var editText: String = ""
    @State private var showForwardSheet = false
    @FocusState private var textFocused: Bool

    private var isDone: Bool { task.status == "completed" }
    private var isCancelled: Bool { task.status == "cancelled" }
    private var isForwarded: Bool { task.status == "forwarded" }
    private var isHighPriority: Bool { priority == "A" || priority == "B" }
    private var borderColor: Color { theme.priorityBorderColor(priority) }

    var body: some View {
        HStack(spacing: 12) {
            // Checkbox
            Button {
                let impact = UIImpactFeedbackGenerator(style: .light)
                impact.impactOccurred()
                viewModel.cycleTaskStatus(task.id)
            } label: {
                checkbox
            }
            .disabled(isForwarded)

            // Body
            VStack(alignment: .leading, spacing: 2) {
                if isEditing && !isForwarded {
                    TextField("Task name", text: $editText)
                        .font(OutfitFont.font(weight: .medium, size: 14.5))
                        .foregroundStyle(theme.textPrimary)
                        .focused($textFocused)
                        .onSubmit { commitEdit() }
                } else {
                    Text(task.text)
                        .font(OutfitFont.font(weight: isDone || isCancelled ? .regular : .medium, size: 14.5))
                        .foregroundStyle(isDone || isCancelled ? GHPalette.n400 : theme.textPrimary)
                        .strikethrough(isDone || isCancelled, color: GHPalette.n400)
                        .lineLimit(2)
                        .onTapGesture {
                            guard !isForwarded else { return }
                            editText = task.text
                            isEditing = true
                            textFocused = true
                        }
                }

                if isForwarded, let fwd = task.forwardedTo {
                    Text("\u{2192} \(fwd)")
                        .font(OutfitFont.font(weight: .medium, size: 11.5))
                        .foregroundStyle(GHPalette.amber600)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // Badge
            statusBadge
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 13)
        .overlay(
            borderColor != .clear ?
                Rectangle()
                    .fill(borderColor)
                    .frame(width: 3)
                : nil,
            alignment: .leading
        )
        .contentShape(Rectangle())
        .opacity(isCancelled ? 0.5 : (isForwarded ? 0.6 : 1))
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            if !isForwarded {
                Button(role: .destructive) {
                    viewModel.deleteTask(task.id)
                } label: {
                    Label("Delete", systemImage: "trash")
                }

                Button {
                    showForwardSheet = true
                } label: {
                    Label("Forward", systemImage: "arrow.right")
                }
                .tint(GHPalette.amber400)
            }
        }
        .sheet(isPresented: $showForwardSheet) {
            ForwardTaskSheet { targetDate in
                viewModel.forwardTask(task.id, to: targetDate)
            }
        }
    }

    // MARK: - Checkbox

    private var checkbox: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6)
                .stroke(isDone ? Color.clear : GHPalette.n300, lineWidth: 1.5)
                .frame(width: 22, height: 22)

            if isDone {
                RoundedRectangle(cornerRadius: 6)
                    .fill(isHighPriority ? GHPalette.amber400 : GHPalette.teal800)
                    .frame(width: 22, height: 22)

                Image(systemName: "checkmark")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(isHighPriority ? GHPalette.teal800 : .white)
            } else if isCancelled {
                RoundedRectangle(cornerRadius: 6)
                    .fill(GHPalette.n300)
                    .frame(width: 22, height: 22)

                Image(systemName: "xmark")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(.white)
            } else if isForwarded {
                RoundedRectangle(cornerRadius: 6)
                    .fill(GHPalette.amber400.opacity(0.3))
                    .frame(width: 22, height: 22)

                Image(systemName: "arrow.right")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(GHPalette.amber600)
            }
        }
    }

    // MARK: - Badge

    @ViewBuilder
    private var statusBadge: some View {
        if isDone {
            badgePill(text: "Done", type: "done")
        } else if isCancelled {
            badgePill(text: "Skip", type: "neutral")
        } else if isForwarded {
            badgePill(text: "Fwd", type: "amber")
        } else if priority == "A" {
            badgePill(text: "Urgent", type: "coral")
        }
    }

    private func badgePill(text: String, type: String) -> some View {
        Text(text)
            .font(OutfitFont.font(weight: .bold, size: 10.5))
            .padding(.horizontal, 9)
            .padding(.vertical, 3)
            .background(theme.badgeBg(for: type))
            .foregroundStyle(theme.badgeText(for: type))
            .clipShape(Capsule())
    }

    // MARK: - Edit

    private func commitEdit() {
        isEditing = false
        let trimmed = editText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty && trimmed != task.text {
            viewModel.updateTaskText(task.id, newText: trimmed)
        }
    }
}
