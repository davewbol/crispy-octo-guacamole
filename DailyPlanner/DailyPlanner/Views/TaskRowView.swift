import SwiftUI

struct TaskRowView: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    let task: PlannerTask
    let theme: AppTheme

    @State private var editingText: String = ""
    @State private var isEditing = false
    @State private var showForwardSheet = false
    @State private var showDeleteConfirm = false
    @State private var showPriorityMenu = false

    var body: some View {
        HStack(spacing: 8) {
            // Priority badge
            Menu {
                ForEach(["A", "B", "C"], id: \.self) { p in
                    Button(priorityLabel(p)) {
                        viewModel.changePriority(task.id, to: p)
                    }
                }
            } label: {
                Text(task.priority)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 24, height: 24)
                    .background(AppTheme.priorityColor(task.priority))
                    .clipShape(Circle())
            }
            .disabled(task.status == "forwarded")

            // Number
            Text("\(task.number)")
                .font(.system(size: 13, weight: .medium, design: .monospaced))
                .foregroundStyle(theme.textFaint)
                .frame(width: 20)

            // Task text
            if isEditing && task.status != "forwarded" {
                TextField("Task", text: $editingText, onCommit: {
                    viewModel.updateTaskText(task.id, newText: editingText)
                    isEditing = false
                })
                .textFieldStyle(.plain)
                .font(.system(size: 16))
                .foregroundStyle(theme.textPrimary)
                .padding(.horizontal, 4)
                .padding(.vertical, 2)
                .background(theme.bgInput)
                .cornerRadius(4)
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(theme.borderPrimary, lineWidth: 1)
                )
            } else {
                Text(task.text)
                    .font(.system(size: 16))
                    .foregroundStyle(textColor)
                    .strikethrough(task.status == "completed" || task.status == "cancelled")
                    .opacity(task.status == "cancelled" || task.status == "forwarded" ? 0.5 : 1)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        guard task.status != "forwarded" else { return }
                        editingText = task.text
                        isEditing = true
                    }
            }

            // Forwarded-to indicator
            if let fwd = task.forwardedTo {
                Text("→ \(fwd)")
                    .font(.system(size: 11))
                    .foregroundStyle(AppTheme.statusForwarded)
            }

            // Status button
            Button {
                withAnimation(.easeOut(duration: 0.2)) {
                    viewModel.cycleTaskStatus(task.id)
                }
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            } label: {
                Image(systemName: task.statusIcon)
                    .font(.system(size: 22))
                    .foregroundStyle(AppTheme.statusColor(task.status))
            }
            .disabled(task.status == "forwarded")

            // Action buttons
            if task.status != "forwarded" {
                actionButtons
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(theme.bgCard)
        .sheet(isPresented: $showForwardSheet) {
            ForwardTaskSheet(theme: theme) { targetDate in
                viewModel.forwardTask(task.id, to: targetDate)
            }
        }
        .alert("Delete Task", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) {
                viewModel.deleteTask(task.id)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to delete this task?")
        }
    }

    private var actionButtons: some View {
        HStack(spacing: 2) {
            Button { viewModel.moveTask(task.id, direction: -1) } label: {
                Image(systemName: "chevron.up")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.textFaint)
            }
            .frame(width: 28, height: 28)

            Button { viewModel.moveTask(task.id, direction: 1) } label: {
                Image(systemName: "chevron.down")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.textFaint)
            }
            .frame(width: 28, height: 28)

            Button { showForwardSheet = true } label: {
                Image(systemName: "arrow.right.circle")
                    .font(.system(size: 14))
                    .foregroundStyle(theme.textFaint)
            }
            .frame(width: 28, height: 28)

            Button { showDeleteConfirm = true } label: {
                Image(systemName: "trash")
                    .font(.system(size: 13))
                    .foregroundStyle(theme.textFaint)
            }
            .frame(width: 28, height: 28)
        }
    }

    private var textColor: Color {
        switch task.status {
        case "completed": return AppTheme.statusCompleted
        case "cancelled": return theme.textMuted
        case "forwarded": return theme.textFaint
        default: return theme.textPrimary
        }
    }

    private func priorityLabel(_ p: String) -> String {
        switch p {
        case "A": return "A — Vital"
        case "B": return "B — Important"
        default: return "C — Nice to do"
        }
    }
}
