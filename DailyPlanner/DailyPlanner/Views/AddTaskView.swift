import SwiftUI

struct AddTaskView: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    let theme: AppTheme

    @State private var taskText = ""
    @State private var selectedPriority = "B"

    var body: some View {
        HStack(spacing: 8) {
            TextField("Add a task...", text: $taskText)
                .textFieldStyle(.plain)
                .font(.system(size: 16))
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .background(theme.bgInput)
                .cornerRadius(GHRadius.sm)
                .overlay(
                    RoundedRectangle(cornerRadius: GHRadius.sm)
                        .stroke(theme.borderPrimary, lineWidth: 1)
                )
                .foregroundStyle(theme.textPrimary)
                .onSubmit { addTask() }

            Menu {
                ForEach(["A", "B", "C"], id: \.self) { p in
                    Button {
                        selectedPriority = p
                    } label: {
                        Label(priorityLabel(p), systemImage: selectedPriority == p ? "checkmark" : "")
                    }
                }
            } label: {
                Text(selectedPriority)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(theme.priorityTextColor(selectedPriority))
                    .frame(width: 36, height: 36)
                    .background(theme.priorityColor(selectedPriority))
                    .clipShape(RoundedRectangle(cornerRadius: GHRadius.sm))
            }

            Button(action: addTask) {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(theme.priorityColor(selectedPriority))
            }
            .disabled(taskText.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }

    private func addTask() {
        guard !taskText.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        viewModel.addTask(text: taskText, priority: selectedPriority)
        taskText = ""
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    private func priorityLabel(_ p: String) -> String {
        switch p {
        case "A": return "A — Vital"
        case "B": return "B — Important"
        default: return "C — Nice to do"
        }
    }
}
