import Foundation

struct AppSettings: Codable, Equatable {
    var lastVisitedDate: String?
    var autoRollover: Bool
    var theme: String  // "classic", "light", "dark"

    init() {
        self.lastVisitedDate = nil
        self.autoRollover = true
        self.theme = "classic"
    }
}

struct AppData: Codable {
    var days: [String: DayData]
    var settings: AppSettings

    init() {
        self.days = [:]
        self.settings = AppSettings()
    }
}
