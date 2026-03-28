import SwiftUI

struct DailyNotesView: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    let theme: AppTheme

    @State private var notes: String = ""
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Section header
            Text("\u{1F4DD} Daily Notes")
                .font(OutfitFont.font(weight: .bold, size: 10.5))
                .foregroundStyle(GHPalette.n400)
                .textCase(.uppercase)
                .tracking(1)
                .padding(.bottom, 8)

            // Card
            ZStack(alignment: .topLeading) {
                TextEditor(text: $notes)
                    .font(OutfitFont.font(weight: .regular, size: 14))
                    .foregroundStyle(theme.textPrimary)
                    .scrollContentBackground(.hidden)
                    .frame(minHeight: 80, maxHeight: 140)
                    .padding(12)
                    .focused($isFocused)
                    .onChange(of: notes) { _, newValue in
                        viewModel.updateNotes(newValue)
                    }

                if notes.isEmpty && !isFocused {
                    Text("Jot down notes, appointments, or reminders...")
                        .font(OutfitFont.font(weight: .regular, size: 13.5))
                        .foregroundStyle(GHPalette.n300)
                        .padding(.horizontal, 17)
                        .padding(.top, 20)
                        .allowsHitTesting(false)
                }
            }
            .background(theme.bgCard)
            .clipShape(RoundedRectangle(cornerRadius: GHRadius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: GHRadius.xl)
                    .stroke(isFocused ? GHPalette.teal500 : theme.borderPrimary, lineWidth: 1.5)
            )
            .shadow(color: GHShadow.sm.color, radius: GHShadow.sm.radius, y: GHShadow.sm.y)
        }
        .onAppear { notes = viewModel.currentDay.notes }
        .onChange(of: viewModel.currentDate) { _, _ in
            notes = viewModel.currentDay.notes
        }
    }
}
