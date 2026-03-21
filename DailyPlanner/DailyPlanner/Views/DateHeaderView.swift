import SwiftUI

struct DateHeaderView: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    let theme: AppTheme

    @State private var showDatePicker = false
    @State private var pickerDate = Date()

    var body: some View {
        let badge = DateHelpers.dateBadge(viewModel.currentDate)

        HStack(spacing: 12) {
            // Previous day
            Button {
                viewModel.goToPreviousDay()
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(theme.textPrimary)
                    .frame(width: 44, height: 44)
            }

            Spacer()

            // Date display
            VStack(spacing: 4) {
                Button {
                    pickerDate = DateHelpers.parseDate(viewModel.currentDate)
                    showDatePicker = true
                } label: {
                    Text(DateHelpers.formatDisplay(viewModel.currentDate))
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(theme.textPrimary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }

                Text(badge.text)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(AppTheme.badgeColor(badge.type))
                    .clipShape(Capsule())
            }

            Spacer()

            // Next day
            Button {
                viewModel.goToNextDay()
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(theme.textPrimary)
                    .frame(width: 44, height: 44)
            }

            // Today button
            Button {
                viewModel.goToToday()
            } label: {
                Text("Today")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(theme.textSecondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(theme.bgButton)
                    .cornerRadius(6)
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(theme.borderPrimary, lineWidth: 1)
                    )
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .sheet(isPresented: $showDatePicker) {
            NavigationStack {
                DatePicker("Go to date", selection: $pickerDate, displayedComponents: .date)
                    .datePickerStyle(.graphical)
                    .padding()
                    .navigationTitle("Select Date")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button("Go") {
                                viewModel.navigateTo(DateHelpers.toDateStr(pickerDate))
                                showDatePicker = false
                            }
                        }
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Cancel") {
                                showDatePicker = false
                            }
                        }
                    }
            }
            .presentationDetents([.medium])
        }
    }
}
