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

struct EditForwardDateSheet: View {
    let theme: AppTheme
    let currentTarget: String
    let sourceDate: String
    let onUpdate: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var selectedDate = Date()

    private var minDate: Date {
        Calendar.current.date(byAdding: .day, value: 1, to: DateHelpers.parseDate(sourceDate)) ?? Date()
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Text("Change forwarded date")
                    .font(.system(size: 15))
                    .foregroundStyle(theme.textSecondary)

                DatePicker(
                    "New date",
                    selection: $selectedDate,
                    in: minDate...,
                    displayedComponents: .date
                )
                .datePickerStyle(.graphical)
                .padding(.horizontal)

                Spacer()
            }
            .padding(.top)
            .navigationTitle("Edit Forward Date")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Update") {
                        let dateStr = DateHelpers.toDateStr(selectedDate)
                        onUpdate(dateStr)
                        dismiss()
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .onAppear {
            selectedDate = DateHelpers.parseDate(currentTarget)
        }
    }
}
