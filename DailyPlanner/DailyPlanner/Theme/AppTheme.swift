import SwiftUI

// MARK: - Golden Hour Design Tokens (Primitives)

/// Primitive color palette — theme-independent constants
enum GHPalette {
    // Teal scale
    static let teal900 = Color(hex: "0E2424")
    static let teal800 = Color(hex: "1A3A3A")
    static let teal700 = Color(hex: "234F4F")
    static let teal600 = Color(hex: "2D6464")
    static let teal500 = Color(hex: "3A7A7A")
    static let teal400 = Color(hex: "5A9A9A")
    static let teal300 = Color(hex: "8CB3B3")
    static let teal200 = Color(hex: "B0D8D8")
    static let teal100 = Color(hex: "D8EEEE")
    static let teal50  = Color(hex: "EFF8F8")
    static let teal25  = Color(hex: "F7FAFA")

    // Amber scale
    static let amber600 = Color(hex: "C98A00")
    static let amber500 = Color(hex: "E09B00")
    static let amber400 = Color(hex: "FFB932")
    static let amber300 = Color(hex: "FFCA62")
    static let amber200 = Color(hex: "FFDC99")
    static let amber100 = Color(hex: "FFF0CC")
    static let amber50  = Color(hex: "FFF8E6")

    // Sage scale
    static let sage500 = Color(hex: "2D7A4F")
    static let sage400 = Color(hex: "3D9A65")
    static let sage200 = Color(hex: "A8DBBE")
    static let sage100 = Color(hex: "D4F0E3")
    static let sage50  = Color(hex: "EEF9F4")

    // Coral scale
    static let coral500 = Color(hex: "D94F3A")
    static let coral400 = Color(hex: "F06650")
    static let coral100 = Color(hex: "FDE8E5")

    // Info
    static let info      = Color(hex: "3B82F6")
    static let infoLight = Color(hex: "E0EDFF")

    // Neutrals (teal-tinted)
    static let n900 = Color(hex: "0F1A1A")
    static let n700 = Color(hex: "2E4040")
    static let n600 = Color(hex: "4A5E5E")
    static let n500 = Color(hex: "6B8080")
    static let n400 = Color(hex: "8FA5A5")
    static let n300 = Color(hex: "B5C8C8")
    static let n200 = Color(hex: "D8E6E6")
    static let n150 = Color(hex: "E6EEEE")
    static let n100 = Color(hex: "EEF4F4")
    static let n50  = Color(hex: "F7FAFA")

    // Legacy aliases
    static let sage      = sage400
    static let sageLight = sage100
    static let sageDark  = sage500
    static let coral      = coral400
    static let coralLight = coral100
    static let coralDark  = coral500
    static let neutral400 = n400
    static let neutral300 = n300
    static let neutral200 = n200

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

// MARK: - Font Helper

/// Outfit font with fallback to system rounded.
/// To use the actual Outfit font, add .ttf files to the Fonts/ directory
/// and register them in Info.plist under UIAppFonts.
enum OutfitFont {
    static func font(weight: Font.Weight, size: CGFloat) -> Font {
        // Try custom Outfit font first, fall back to system rounded
        let name = outfitName(for: weight)
        if let _ = UIFont(name: name, size: size) {
            return .custom(name, size: size)
        }
        return .system(size: size, weight: weight, design: .rounded)
    }

    private static func outfitName(for weight: Font.Weight) -> String {
        switch weight {
        case .light: return "Outfit-Light"
        case .regular: return "Outfit-Regular"
        case .medium: return "Outfit-Medium"
        case .semibold: return "Outfit-SemiBold"
        case .bold: return "Outfit-Bold"
        case .heavy: return "Outfit-ExtraBold"
        case .black: return "Outfit-Black"
        default: return "Outfit-Regular"
        }
    }
}

// MARK: - Radius Tokens

enum GHRadius {
    static let sm: CGFloat = 6
    static let md: CGFloat = 10
    static let lg: CGFloat = 16
    static let xl: CGFloat = 20
    static let full: CGFloat = 9999
}

// MARK: - Shadow Tokens

enum GHShadow {
    static let sm = (color: Color(hex: "0E2424").opacity(0.07), radius: CGFloat(2), y: CGFloat(1))
    static let md = (color: Color(hex: "0E2424").opacity(0.09), radius: CGFloat(7), y: CGFloat(4))
    static let lg = (color: Color(hex: "0E2424").opacity(0.14), radius: CGFloat(16), y: CGFloat(12))
    static let amber = (color: GHPalette.amber400.opacity(0.32), radius: CGFloat(10), y: CGFloat(6))
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
        case .classic: return GHPalette.n50
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
        case .classic, .light: return GHPalette.n400
        case .dark: return Color(hex: "5E7A7A")
        }
    }

    var textOnPrimary: Color { .white }

    var textOnAccent: Color { GHPalette.teal900 }

    // MARK: - Borders

    var borderPrimary: Color {
        switch self {
        case .classic: return GHPalette.n200
        case .light: return Color(hex: "C8D4D4")
        case .dark: return Color(hex: "2A4242")
        }
    }

    var borderSecondary: Color {
        switch self {
        case .classic: return GHPalette.n100
        case .light: return Color(hex: "DCE4E4")
        case .dark: return Color(hex: "1E3434")
        }
    }

    var borderInputFocus: Color {
        GHPalette.teal500
    }

    // MARK: - Accent Colors

    var colorAccent: Color { GHPalette.amber400 }
    var colorAccentHover: Color { GHPalette.amber500 }
    var colorSuccess: Color { GHPalette.sage }
    var colorError: Color { GHPalette.coral }
    var colorInfo: Color { GHPalette.info }

    // MARK: - Priority Colors

    var priorityA: Color { GHPalette.coral400 }
    var priorityAText: Color { .white }
    var priorityB: Color { GHPalette.amber400 }
    var priorityBText: Color { GHPalette.teal800 }
    var priorityC: Color {
        switch self {
        case .classic, .light: return GHPalette.teal800
        case .dark: return GHPalette.teal400
        }
    }
    var priorityCText: Color {
        switch self {
        case .classic, .light: return .white
        case .dark: return GHPalette.teal900
        }
    }

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

    func priorityBorderColor(_ p: String) -> Color {
        switch p {
        case "A": return GHPalette.coral400
        case "B": return GHPalette.amber400
        default: return .clear
        }
    }

    // MARK: - Status Colors

    var statusCompleted: Color { GHPalette.sage }
    var statusCancelled: Color { GHPalette.n300 }
    var statusForwarded: Color { GHPalette.amber400 }
    var statusOpen: Color {
        switch self {
        case .classic: return GHPalette.n300
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

    // MARK: - Badge Colors

    func badgeBg(for type: String) -> Color {
        switch type {
        case "done": return GHPalette.sage100
        case "amber", "time": return GHPalette.amber100
        case "teal": return GHPalette.teal100
        case "coral", "urgent": return GHPalette.coral100
        default: return GHPalette.n100
        }
    }

    func badgeText(for type: String) -> Color {
        switch type {
        case "done": return GHPalette.sage500
        case "amber", "time": return GHPalette.amber600
        case "teal": return GHPalette.teal600
        case "coral", "urgent": return GHPalette.coral500
        default: return GHPalette.n500
        }
    }

    // MARK: - Heatmap (Amber scale)

    var heatmapEmpty: Color {
        switch self {
        case .classic: return GHPalette.n100
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

    var dateBadgeTodayBg: Color { GHPalette.sage100 }
    var dateBadgeTodayText: Color { GHPalette.sage }
    var dateBadgePastBg: Color { GHPalette.coral100 }
    var dateBadgePastText: Color { GHPalette.coral }
    var dateBadgeFutureBg: Color { GHPalette.infoLight }
    var dateBadgeFutureText: Color { GHPalette.info }

    func dateBadgeColor(_ type: String) -> Color {
        switch type {
        case "today": return dateBadgeTodayBg
        case "past": return dateBadgePastBg
        default: return dateBadgeFutureBg
        }
    }

    func dateBadgeTextColor(_ type: String) -> Color {
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
