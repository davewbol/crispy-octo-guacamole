import SwiftUI

struct ForwardTaskSheet: View {
    let theme: AppTheme
    let onForward: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var selectedDate = Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date()

    private var tomorrow: Date {
        Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date()
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Text("Forward task to a future date")
                    .font(.system(size: 15))
                    .foregroundStyle(theme.textSecondary)

                DatePicker(
                    "Target date",
                    selection: $selectedDate,
                    in: tomorrow...,
                    displayedComponents: .date
                )
                .datePickerStyle(.graphical)
                .padding(.horizontal)

                Spacer()
            }
            .padding(.top)
            .navigationTitle("Forward Task")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Forward") {
                        let dateStr = DateHelpers.toDateStr(selectedDate)
                        onForward(dateStr)
                        dismiss()
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
