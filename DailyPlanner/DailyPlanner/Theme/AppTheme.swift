import SwiftUI

enum AppTheme: String, CaseIterable {
    case classic
    case light
    case dark

    var displayName: String {
        switch self {
        case .classic: return "Classic"
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }

    var icon: String {
        switch self {
        case .classic: return "leaf"
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
        case .classic: return Color(hex: "f5f0e8")
        case .light: return Color(hex: "f0f2f5")
        case .dark: return Color(hex: "121212")
        }
    }

    var bgCard: Color {
        switch self {
        case .classic: return Color(hex: "fffef9")
        case .light: return .white
        case .dark: return Color(hex: "1e1e1e")
        }
    }

    var bgInput: Color {
        switch self {
        case .classic: return .white
        case .light: return .white
        case .dark: return Color(hex: "2a2a2a")
        }
    }

    var bgHover: Color {
        switch self {
        case .classic: return Color(hex: "fdfbf5")
        case .light: return Color(hex: "f8f9fb")
        case .dark: return Color(hex: "252525")
        }
    }

    var bgButton: Color {
        switch self {
        case .classic: return Color(hex: "f5f0e8")
        case .light: return Color(hex: "f2f4f7")
        case .dark: return Color(hex: "2a2a2a")
        }
    }

    var bgButtonHover: Color {
        switch self {
        case .classic: return Color(hex: "ebe5d9")
        case .light: return Color(hex: "e4e7ec")
        case .dark: return Color(hex: "383838")
        }
    }

    // MARK: - Text

    var textPrimary: Color {
        switch self {
        case .classic: return Color(hex: "2c2c2c")
        case .light: return Color(hex: "1a1a1a")
        case .dark: return Color(hex: "e0e0e0")
        }
    }

    var textSecondary: Color {
        switch self {
        case .classic: return Color(hex: "555555")
        case .light: return Color(hex: "444444")
        case .dark: return Color(hex: "b0b0b0")
        }
    }

    var textMuted: Color {
        switch self {
        case .classic: return Color(hex: "777777")
        case .light: return Color(hex: "666666")
        case .dark: return Color(hex: "888888")
        }
    }

    var textFaint: Color {
        switch self {
        case .classic: return Color(hex: "999999")
        case .light: return Color(hex: "888888")
        case .dark: return Color(hex: "777777")
        }
    }

    // MARK: - Borders

    var borderPrimary: Color {
        switch self {
        case .classic: return Color(hex: "d4cfc4")
        case .light: return Color(hex: "d0d5dd")
        case .dark: return Color(hex: "383838")
        }
    }

    var borderSecondary: Color {
        switch self {
        case .classic: return Color(hex: "eae5da")
        case .light: return Color(hex: "e4e7ec")
        case .dark: return Color(hex: "2e2e2e")
        }
    }

    // MARK: - Priority Colors

    static var priorityA: Color { Color(hex: "e74c3c") }
    static var priorityB: Color { Color(hex: "3498db") }
    static var priorityC: Color { Color(hex: "95a5a6") }

    static func priorityColor(_ p: String) -> Color {
        switch p {
        case "A": return priorityA
        case "B": return priorityB
        default: return priorityC
        }
    }

    // MARK: - Status Colors

    static var statusCompleted: Color { Color(hex: "27ae60") }
    static var statusCancelled: Color { Color(hex: "e67e22") }
    static var statusForwarded: Color { Color(hex: "3498db") }
    static var statusOpen: Color { Color(hex: "cccccc") }

    static func statusColor(_ s: String) -> Color {
        switch s {
        case "completed": return statusCompleted
        case "cancelled": return statusCancelled
        case "forwarded": return statusForwarded
        default: return statusOpen
        }
    }

    // MARK: - Heatmap

    var heatmapEmpty: Color {
        switch self {
        case .classic: return Color(hex: "e8e3da")
        case .light: return Color(hex: "e4e7ec")
        case .dark: return Color(hex: "2a2a2a")
        }
    }

    var heatmapLow: Color {
        switch self {
        case .classic, .light: return Color(hex: "c8e6c9")
        case .dark: return Color(hex: "1b5e20")
        }
    }

    var heatmapMid: Color {
        switch self {
        case .classic, .light: return Color(hex: "66bb6a")
        case .dark: return Color(hex: "388e3c")
        }
    }

    var heatmapHigh: Color {
        switch self {
        case .classic, .light: return Color(hex: "2e7d32")
        case .dark: return Color(hex: "4caf50")
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

    static func badgeColor(_ type: String) -> Color {
        switch type {
        case "today": return Color(hex: "27ae60")
        case "past": return Color(hex: "e74c3c")
        default: return Color(hex: "3498db")
        }
    }
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
