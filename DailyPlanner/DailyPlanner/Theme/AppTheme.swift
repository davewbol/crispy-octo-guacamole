import SwiftUI

// MARK: - Golden Hour Design Tokens (Primitives)

/// Primitive color palette — theme-independent constants
enum GHPalette {
    // Teal scale
    static let teal900 = Color(hex: "0E2424")
    static let teal800 = Color(hex: "1A3A3A")
    static let teal700 = Color(hex: "2A5050")
    static let teal600 = Color(hex: "3A6666")
    static let teal500 = Color(hex: "4A7C7C")
    static let teal400 = Color(hex: "6B9999")
    static let teal300 = Color(hex: "8CB3B3")
    static let teal200 = Color(hex: "B3CCCC")
    static let teal100 = Color(hex: "D9E6E6")
    static let teal50  = Color(hex: "F0F5F5")
    static let teal25  = Color(hex: "F7FAFA")

    // Amber scale
    static let amber500 = Color(hex: "E5A62D")
    static let amber400 = Color(hex: "FFB932")
    static let amber300 = Color(hex: "FFCB66")
    static let amber200 = Color(hex: "FFDD99")
    static let amber100 = Color(hex: "FFEECC")
    static let amber50  = Color(hex: "FFF8E6")

    // Semantic accents
    static let sage      = Color(hex: "3D9A65")
    static let sageLight = Color(hex: "E8F5EC")
    static let sageDark  = Color(hex: "2D7A4D")
    static let coral      = Color(hex: "F06650")
    static let coralLight = Color(hex: "FDE8E4")
    static let coralDark  = Color(hex: "D04A36")
    static let info       = Color(hex: "3B82F6")
    static let infoLight  = Color(hex: "E0EDFF")

    // Neutrals (teal-tinted)
    static let neutral400 = Color(hex: "8CA0A0")
    static let neutral300 = Color(hex: "B3C2C2")
    static let neutral200 = Color(hex: "D9E2E2")

    // Confetti colors (Golden Hour palette)
    static let confetti: [Color] = [
        amber400, sage, coral, teal800, amber300, info, teal400, amber200
    ]
}

// MARK: - Typography Tokens

enum GHTypography {
    static let trackingDisplay: CGFloat = -0.03
    static let trackingH1: CGFloat = -0.025
    static let trackingH2: CGFloat = -0.02
    static let trackingBody: CGFloat = 0
    static let trackingLabel: CGFloat = 0.12

    static let leadingBody: CGFloat = 1.65
    static let leadingTight: CGFloat = 1.2
}

// MARK: - Radius Tokens

enum GHRadius {
    static let sm: CGFloat = 6
    static let md: CGFloat = 10
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let full: CGFloat = 9999
}

// MARK: - App Theme

enum AppTheme: String, CaseIterable {
    case classic
    case light
    case dark

    var displayName: String {
        switch self {
        case .classic: return "Golden Hour"
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }

    var icon: String {
        switch self {
        case .classic: return "sun.haze"
        case .light: return "sun.max"
        case .dark: return "moon"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .classic, .light: return .light
        case .dark: return .dark
        }
    }

    // MARK: - Backgrounds

    var bgPage: Color {
        switch self {
        case .classic: return GHPalette.teal25
        case .light: return Color(hex: "F2F5F5")
        case .dark: return Color(hex: "0E1A1A")
        }
    }

    var bgCard: Color {
        switch self {
        case .classic: return .white
        case .light: return .white
        case .dark: return Color(hex: "162626")
        }
    }

    var bgInput: Color {
        switch self {
        case .classic, .light: return .white
        case .dark: return Color(hex: "1E3030")
        }
    }

    var bgHover: Color {
        switch self {
        case .classic: return GHPalette.teal25
        case .light: return Color(hex: "F5F7F7")
        case .dark: return Color(hex: "1A2E2E")
        }
    }

    var bgButton: Color {
        switch self {
        case .classic: return GHPalette.teal50
        case .light: return Color(hex: "EEF1F1")
        case .dark: return Color(hex: "1E3030")
        }
    }

    var bgButtonHover: Color {
        switch self {
        case .classic: return GHPalette.teal100
        case .light: return Color(hex: "E2E7E7")
        case .dark: return Color(hex: "2A4242")
        }
    }

    var bgNotification: Color {
        switch self {
        case .classic: return GHPalette.amber50
        case .light: return GHPalette.amber50
        case .dark: return Color(hex: "2A2200")
        }
    }

    var bgDeleteHover: Color {
        switch self {
        case .classic, .light: return GHPalette.coralLight
        case .dark: return Color(hex: "3A1E1E")
        }
    }

    // MARK: - Text

    var textPrimary: Color {
        switch self {
        case .classic: return GHPalette.teal800
        case .light: return GHPalette.teal800
        case .dark: return Color(hex: "D9E6E6")
        }
    }

    var textSecondary: Color {
        switch self {
        case .classic: return GHPalette.teal700
        case .light: return GHPalette.teal700
        case .dark: return Color(hex: "A3BABA")
        }
    }

    var textMuted: Color {
        switch self {
        case .classic: return Color(hex: "6B8080")
        case .light: return Color(hex: "6B8080")
        case .dark: return Color(hex: "7A9999")
        }
    }

    var textFaint: Color {
        switch self {
        case .classic, .light: return GHPalette.neutral400
        case .dark: return Color(hex: "5E7A7A")
        }
    }

    var textOnPrimary: Color { .white }

    var textOnAccent: Color { GHPalette.teal900 }

    // MARK: - Borders

    var borderPrimary: Color {
        switch self {
        case .classic: return GHPalette.teal200
        case .light: return Color(hex: "C8D4D4")
        case .dark: return Color(hex: "2A4242")
        }
    }

    var borderSecondary: Color {
        switch self {
        case .classic: return GHPalette.teal100
        case .light: return Color(hex: "DCE4E4")
        case .dark: return Color(hex: "1E3434")
        }
    }

    var borderInputFocus: Color {
        GHPalette.teal400
    }

    // MARK: - Accent Colors

    var colorAccent: Color { GHPalette.amber400 }
    var colorAccentHover: Color { GHPalette.amber500 }
    var colorSuccess: Color { GHPalette.sage }
    var colorError: Color { GHPalette.coral }
    var colorInfo: Color { GHPalette.info }

    // MARK: - Priority Colors (Golden Hour)

    var priorityA: Color { GHPalette.amber400 }
    var priorityAText: Color { GHPalette.teal900 }
    var priorityB: Color {
        switch self {
        case .classic, .light: return GHPalette.teal800
        case .dark: return GHPalette.teal400
        }
    }
    var priorityBText: Color {
        switch self {
        case .classic, .light: return .white
        case .dark: return GHPalette.teal900
        }
    }
    var priorityC: Color { GHPalette.neutral400 }
    var priorityCText: Color { .white }

    func priorityColor(_ p: String) -> Color {
        switch p {
        case "A": return priorityA
        case "B": return priorityB
        default: return priorityC
        }
    }

    func priorityTextColor(_ p: String) -> Color {
        switch p {
        case "A": return priorityAText
        case "B": return priorityBText
        default: return priorityCText
        }
    }

    // MARK: - Status Colors

    var statusCompleted: Color { GHPalette.sage }
    var statusCancelled: Color { GHPalette.neutral300 }
    var statusForwarded: Color { GHPalette.amber400 }
    var statusOpen: Color {
        switch self {
        case .classic: return GHPalette.teal200
        case .light: return Color(hex: "C8D4D4")
        case .dark: return Color(hex: "3A5252")
        }
    }

    func statusColor(_ s: String) -> Color {
        switch s {
        case "completed": return statusCompleted
        case "cancelled": return statusCancelled
        case "forwarded": return statusForwarded
        default: return statusOpen
        }
    }

    // MARK: - Heatmap (Amber scale, not green)

    var heatmapEmpty: Color {
        switch self {
        case .classic: return GHPalette.teal100
        case .light: return Color(hex: "DCE4E4")
        case .dark: return Color(hex: "1E3030")
        }
    }

    var heatmapLow: Color {
        switch self {
        case .classic, .light: return GHPalette.amber100
        case .dark: return Color(hex: "3A3000")
        }
    }

    var heatmapMid: Color {
        switch self {
        case .classic, .light: return GHPalette.amber300
        case .dark: return GHPalette.amber500
        }
    }

    var heatmapHigh: Color {
        switch self {
        case .classic, .light: return GHPalette.amber400
        case .dark: return GHPalette.amber400
        }
    }

    func heatmapColor(for percent: Int) -> Color {
        if percent < 0 { return heatmapEmpty.opacity(0.5) }
        if percent == 0 { return heatmapEmpty }
        if percent <= 25 { return heatmapLow }
        if percent < 100 { return heatmapMid }
        return heatmapHigh
    }

    // MARK: - Date Badge

    var dateBadgeTodayBg: Color { GHPalette.sageLight }
    var dateBadgeTodayText: Color { GHPalette.sage }
    var dateBadgePastBg: Color { GHPalette.coralLight }
    var dateBadgePastText: Color { GHPalette.coral }
    var dateBadgeFutureBg: Color { GHPalette.infoLight }
    var dateBadgeFutureText: Color { GHPalette.info }

    func badgeColor(_ type: String) -> Color {
        switch type {
        case "today": return dateBadgeTodayBg
        case "past": return dateBadgePastBg
        default: return dateBadgeFutureBg
        }
    }

    func badgeTextColor(_ type: String) -> Color {
        switch type {
        case "today": return dateBadgeTodayText
        case "past": return dateBadgePastText
        default: return dateBadgeFutureText
        }
    }

    // MARK: - Streak / Flame

    var flameColor: Color { GHPalette.amber400 }
}

// MARK: - Color Hex Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        switch hex.count {
        case 6:
            r = Double((int >> 16) & 0xFF) / 255
            g = Double((int >> 8) & 0xFF) / 255
            b = Double(int & 0xFF) / 255
        default:
            r = 0; g = 0; b = 0
        }
        self.init(red: r, green: g, blue: b)
    }
}
