import SwiftUI

struct ForwardTaskSheet: View {
    let onForward: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var selectedDate = Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date()

    private var tomorrow: Date {
        Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date()
    }

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
                Text("Forward Task")
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

            VStack(spacing: 16) {
                Text("Choose a future date to move this task to")
                    .font(OutfitFont.font(weight: .regular, size: 13.5))
                    .foregroundStyle(GHPalette.n500)
                    .padding(.top, 4)

                DatePicker(
                    "Target date",
                    selection: $selectedDate,
                    in: tomorrow...,
                    displayedComponents: .date
                )
                .datePickerStyle(.graphical)
                .tint(GHPalette.amber400)

                Button {
                    let dateStr = DateHelpers.toDateStr(selectedDate)
                    onForward(dateStr)
                    dismiss()
                } label: {
                    Text("Forward Task \u{2192}")
                        .font(OutfitFont.font(weight: .bold, size: 15.2))
                        .foregroundStyle(GHPalette.teal800)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(GHPalette.amber400)
                        .clipShape(RoundedRectangle(cornerRadius: GHRadius.md))
                        .shadow(color: GHShadow.amber.color, radius: GHShadow.amber.radius, y: GHShadow.amber.y)
                }
            }
            .padding(20)

            Spacer()
        }
        .background(Color.white)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.hidden)
    }
}

struct EditForwardDateSheet: View {
    let currentTarget: String
    let sourceDate: String
    let onUpdate: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var selectedDate = Date()

    private var minDate: Date {
        Calendar.current.date(byAdding: .day, value: 1, to: DateHelpers.parseDate(sourceDate)) ?? Date()
    }

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
                Text("Edit Forward Date")
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

            VStack(spacing: 16) {
                DatePicker(
                    "New date",
                    selection: $selectedDate,
                    in: minDate...,
                    displayedComponents: .date
                )
                .datePickerStyle(.graphical)
                .tint(GHPalette.amber400)

                Button {
                    let dateStr = DateHelpers.toDateStr(selectedDate)
                    onUpdate(dateStr)
                    dismiss()
                } label: {
                    Text("Update Date \u{2192}")
                        .font(OutfitFont.font(weight: .bold, size: 15.2))
                        .foregroundStyle(GHPalette.teal800)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(GHPalette.amber400)
                        .clipShape(RoundedRectangle(cornerRadius: GHRadius.md))
                        .shadow(color: GHShadow.amber.color, radius: GHShadow.amber.radius, y: GHShadow.amber.y)
                }
            }
            .padding(20)

            Spacer()
        }
        .background(Color.white)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.hidden)
        .onAppear {
            selectedDate = DateHelpers.parseDate(currentTarget)
        }
    }
}
