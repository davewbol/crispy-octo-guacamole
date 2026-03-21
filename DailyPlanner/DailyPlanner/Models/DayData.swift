import Foundation

struct DayData: Codable, Equatable {
    var tasks: [PlannerTask]
    var notes: String

    init(tasks: [PlannerTask] = [], notes: String = "") {
        self.tasks = tasks
        self.notes = notes
    }

    var sortedTasks: [PlannerTask] {
        let priorityOrder: [String: Int] = ["A": 0, "B": 1, "C": 2]
        return tasks.sorted { a, b in
            let pa = priorityOrder[a.priority] ?? 3
            let pb = priorityOrder[b.priority] ?? 3
            if pa != pb { return pa < pb }
            return a.number < b.number
        }
    }

    var completedCount: Int {
        tasks.filter { $0.status == "completed" }.count
    }

    var totalCount: Int {
        tasks.count
    }

    var completionPercent: Int {
        guard totalCount > 0 else { return -1 }
        return Int(round(Double(completedCount) / Double(totalCount) * 100))
    }

    var isAllCompleted: Bool {
        let actionable = tasks.filter { $0.isActionable }
        guard !actionable.isEmpty else { return false }
        return actionable.allSatisfy { $0.isCompleted }
    }

    func nextNumber(for priority: String) -> Int {
        let group = tasks.filter { $0.priority == priority }
        return (group.map(\.number).max() ?? 0) + 1
    }
}
