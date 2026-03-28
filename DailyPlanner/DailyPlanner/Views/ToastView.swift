import SwiftUI

struct ToastView: View {
    let icon: String
    let title: String
    let message: String
    let type: ToastType

    enum ToastType {
        case success, info

        var borderColor: Color {
            switch self {
            case .success: return GHPalette.sage400
            case .info: return GHPalette.teal400
            }
        }

        var bgColor: Color {
            switch self {
            case .success: return GHPalette.sage50
            case .info: return GHPalette.teal50
            }
        }

        var iconColor: Color {
            switch self {
            case .success: return GHPalette.sage400
            case .info: return GHPalette.teal500
            }
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(type.iconColor)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(OutfitFont.font(weight: .bold, size: 13))
                    .foregroundStyle(GHPalette.teal800)

                Text(message)
                    .font(OutfitFont.font(weight: .regular, size: 12))
                    .foregroundStyle(GHPalette.n500)
            }

            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(type.bgColor)
        .clipShape(RoundedRectangle(cornerRadius: GHRadius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: GHRadius.lg)
                .stroke(type.borderColor.opacity(0.4), lineWidth: 1.5)
        )
        .shadow(color: GHShadow.md.color, radius: GHShadow.md.radius, y: GHShadow.md.y)
        .padding(.horizontal, 20)
    }
}
