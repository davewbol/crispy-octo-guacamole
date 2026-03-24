import SwiftUI

struct DailyNotesView: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    let theme: AppTheme

    @State private var notes: String = ""
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("DAILY NOTES / APPOINTMENTS")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(theme.textFaint)
                .tracking(0.5)

            TextEditor(text: $notes)
                .font(.system(size: 16))
                .foregroundStyle(theme.textPrimary)
                .scrollContentBackground(.hidden)
                .background(theme.bgInput)
                .frame(minHeight: 80, maxHeight: 160)
                .cornerRadius(GHRadius.sm)
                .overlay(
                    RoundedRectangle(cornerRadius: GHRadius.sm)
                        .stroke(isFocused ? theme.borderPrimary : theme.borderSecondary, lineWidth: 1)
                )
                .focused($isFocused)
                .onChange(of: notes) { _, newValue in
                    viewModel.updateNotes(newValue)
                }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .onAppear { notes = viewModel.currentDay.notes }
        .onChange(of: viewModel.currentDate) { _, _ in
            notes = viewModel.currentDay.notes
        }
    }
}
