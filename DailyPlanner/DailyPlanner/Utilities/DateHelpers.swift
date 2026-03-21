import Foundation

enum DateHelpers {
    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.calendar = Calendar(identifier: .gregorian)
        f.timeZone = .current
        return f
    }()

    private static let displayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMMM d, yyyy"
        f.calendar = Calendar(identifier: .gregorian)
        f.timeZone = .current
        return f
    }()

    static func todayStr() -> String {
        dateFormatter.string(from: Date())
    }

    static func toDateStr(_ date: Date) -> String {
        dateFormatter.string(from: date)
    }

    static func parseDate(_ str: String) -> Date {
        dateFormatter.date(from: str) ?? Date()
    }

    static func addDays(_ dateStr: String, _ n: Int) -> String {
        let d = parseDate(dateStr)
        let result = Calendar.current.date(byAdding: .day, value: n, to: d) ?? d
        return toDateStr(result)
    }

    static func formatDisplay(_ dateStr: String) -> String {
        let d = parseDate(dateStr)
        return displayFormatter.string(from: d)
    }

    static func shortWeekday(_ dateStr: String) -> String {
        let d = parseDate(dateStr)
        let weekday = Calendar.current.component(.weekday, from: d)
        // 1=Sun, 2=Mon, ..., 7=Sat
        let labels = ["S", "M", "T", "W", "T", "F", "S"]
        return labels[weekday - 1]
    }

    /// Returns Mon-Sun date strings for the week containing dateStr
    static func getWeekDates(_ dateStr: String) -> [String] {
        let d = parseDate(dateStr)
        let cal = Calendar.current
        let weekday = cal.component(.weekday, from: d) // 1=Sun
        let mondayOffset = weekday == 1 ? -6 : 2 - weekday
        guard let monday = cal.date(byAdding: .day, value: mondayOffset, to: d) else { return [] }
        return (0..<7).map { i in
            let day = cal.date(byAdding: .day, value: i, to: monday) ?? monday
            return toDateStr(day)
        }
    }

    static func dateBadge(_ dateStr: String) -> (text: String, type: String) {
        let today = todayStr()
        if dateStr == today { return ("Today", "today") }
        if dateStr < today { return ("Past", "past") }
        return ("Future", "future")
    }
}
