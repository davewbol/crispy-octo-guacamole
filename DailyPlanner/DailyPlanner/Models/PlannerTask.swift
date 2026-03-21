import Foundation

struct PlannerTask: Codable, Identifiable, Equatable {
    var id: String
    var priority: String  // "A", "B", "C"
    var number: Int
    var text: String
    var status: String    // "open", "completed", "cancelled", "forwarded"
    var forwardedTo: String?
    var createdAt: String

    static func create(priority: String, number: Int, text: String) -> PlannerTask {
        let timestamp = Int(Date().timeIntervalSince1970 * 1000)
        let random = String(Int.random(in: 0...999999), radix: 36)
        return PlannerTask(
            id: "t_\(timestamp)_\(random)",
            priority: priority,
            number: number,
            text: text,
            status: "open",
            forwardedTo: nil,
            createdAt: ISO8601DateFormatter().string(from: Date())
        )
    }

    var isActionable: Bool {
        status != "cancelled" && status != "forwarded"
    }

    var isCompleted: Bool {
        status == "completed"
    }

    var statusIcon: String {
        switch status {
        case "completed": return "checkmark.circle.fill"
        case "cancelled": return "xmark.circle.fill"
        case "forwarded": return "arrow.right.circle.fill"
        default: return "circle"
        }
    }
}
