import SwiftUI

struct AddTaskSheet: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var taskText = ""
    @State private var selectedPriority = "B"
    @FocusState private var textFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            // Handle
            RoundedRectangle(cornerRadius: 2)
                .fill(GHPalette.n200)
                .frame(width: 36, height: 4)
                .padding(.top, 12)
                .padding(.bottom, 4)

            // Header
            HStack {
                Text("Add Task")
                    .font(OutfitFont.font(weight: .heavy, size: 16))
                    .foregroundStyle(GHPalette.teal800)
                    .tracking(-0.2)

                Spacer()

                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 13.5, weight: .medium))
                        .foregroundStyle(GHPalette.n500)
                        .frame(width: 30, height: 30)
                        .background(GHPalette.n100)
                        .clipShape(Circle())
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)

            Divider().background(GHPalette.n100)

            // Form
            VStack(alignment: .leading, spacing: 14) {
                // Task name
                VStack(alignment: .leading, spacing: 6) {
                    Text("Task name")
                        .font(OutfitFont.font(weight: .bold, size: 12.5))
                        .foregroundStyle(GHPalette.teal800)

                    TextField("What do you need to do?", text: $taskText)
                        .font(OutfitFont.font(weight: .regular, size: 14.8))
                        .padding(12)
                        .background(.white)
                        .overlay(
                            RoundedRectangle(cornerRadius: GHRadius.md)
                                .stroke(textFocused ? GHPalette.teal500 : GHPalette.n200, lineWidth: 1.5)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: GHRadius.md))
                        .focused($textFocused)
                        .onSubmit { addTask() }
                }

                // Priority
                VStack(alignment: .leading, spacing: 6) {
                    Text("Priority")
                        .font(OutfitFont.font(weight: .bold, size: 12.5))
                        .foregroundStyle(GHPalette.teal800)

                    HStack(spacing: 8) {
                        priorityChip("A", label: "\u{1F525} High", selected: selectedPriority == "A")
                        priorityChip("B", label: "\u{1F4CC} Normal", selected: selectedPriority == "B")
                        priorityChip("C", label: "\u{1F53D} Low", selected: selectedPriority == "C")
                    }
                }

                // Add button
                Button(action: addTask) {
                    Text("Add Task \u{2192}")
                        .font(OutfitFont.font(weight: .bold, size: 15.2))
                        .foregroundStyle(GHPalette.teal800)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(GHPalette.amber400)
                        .clipShape(RoundedRectangle(cornerRadius: GHRadius.md))
                        .shadow(color: GHShadow.amber.color, radius: GHShadow.amber.radius, y: GHShadow.amber.y)
                }
                .disabled(taskText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                .opacity(taskText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.6 : 1)
                .padding(.top, 2)
            }
            .padding(20)

            Spacer()
        }
        .background(Color.white)
        .presentationDetents([.medium])
        .presentationDragIndicator(.hidden)
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
                textFocused = true
            }
        }
    }

    private func priorityChip(_ priority: String, label: String, selected: Bool) -> some View {
        Button {
            selectedPriority = priority
        } label: {
            Text(label)
                .font(OutfitFont.font(weight: .bold, size: 12))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 9)
                .background(selected ? chipBg(priority) : .white)
                .foregroundStyle(selected ? chipText(priority) : GHPalette.n500)
                .clipShape(RoundedRectangle(cornerRadius: GHRadius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: GHRadius.md)
                        .stroke(selected ? chipBorder(priority) : GHPalette.n200, lineWidth: 1.5)
                )
        }
    }

    private func chipBg(_ p: String) -> Color {
        switch p {
        case "A": return GHPalette.amber100
        case "B": return GHPalette.teal50
        default: return GHPalette.n100
        }
    }

    private func chipText(_ p: String) -> Color {
        switch p {
        case "A": return GHPalette.amber600
        case "B": return GHPalette.teal600
        default: return GHPalette.n500
        }
    }

    private func chipBorder(_ p: String) -> Color {
        switch p {
        case "A": return GHPalette.amber400
        case "B": return GHPalette.teal400
        default: return GHPalette.n300
        }
    }

    private func addTask() {
        let trimmed = taskText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let impact = UIImpactFeedbackGenerator(style: .medium)
        impact.impactOccurred()
        viewModel.addTask(text: trimmed, priority: selectedPriority)
        taskText = ""
        dismiss()
    }
}
