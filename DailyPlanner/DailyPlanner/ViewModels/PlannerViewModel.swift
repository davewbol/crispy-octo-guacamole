import Foundation
import SwiftUI
import Combine

@MainActor
class PlannerViewModel: ObservableObject {
    @Published var data: AppData
    @Published var currentDate: String
    @Published var showConfetti = false

    private let storage = LocalStorageService.shared

    init() {
        let loaded = LocalStorageService.shared.loadData()
        self.data = loaded
        self.currentDate = DateHelpers.todayStr()
    }

    // MARK: - Day Data Access

    var currentDay: DayData {
        get { data.days[currentDate] ?? DayData() }
        set {
            data.days[currentDate] = newValue
            save()
        }
    }

    func dayData(for dateStr: String) -> DayData {
        data.days[dateStr] ?? DayData()
    }

    // MARK: - Date Navigation

    func goToPreviousDay() {
        currentDate = DateHelpers.addDays(currentDate, -1)
    }

    func goToNextDay() {
        currentDate = DateHelpers.addDays(currentDate, 1)
    }

    func goToToday() {
        currentDate = DateHelpers.todayStr()
    }

    func navigateTo(_ dateStr: String) {
        currentDate = dateStr
    }

    // MARK: - Task CRUD

    func addTask(text: String, priority: String) {
        guard !text.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        var day = currentDay
        let number = day.nextNumber(for: priority)
        let task = PlannerTask.create(priority: priority, number: number, text: text.trimmingCharacters(in: .whitespaces))
        day.tasks.append(task)
        currentDay = day
    }

    func updateTaskText(_ taskId: String, newText: String) {
        var day = currentDay
        guard let idx = day.tasks.firstIndex(where: { $0.id == taskId }) else { return }
        let trimmed = newText.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        day.tasks[idx].text = trimmed
        currentDay = day
    }

    func deleteTask(_ taskId: String) {
        var day = currentDay
        let wasAllComplete = day.isAllCompleted
        guard let idx = day.tasks.firstIndex(where: { $0.id == taskId }) else { return }
        let removed = day.tasks.remove(at: idx)
        renumberPriority(&day.tasks, priority: removed.priority)
        currentDay = day
        if !wasAllComplete && currentDay.isAllCompleted {
            triggerConfetti()
        }
    }

    func cycleTaskStatus(_ taskId: String) {
        var day = currentDay
        guard let idx = day.tasks.firstIndex(where: { $0.id == taskId }) else { return }
        let task = day.tasks[idx]
        guard task.status != "forwarded" else { return }

        let wasAllComplete = day.isAllCompleted

        let cycle: [String: String] = ["open": "completed", "completed": "cancelled", "cancelled": "open"]
        day.tasks[idx].status = cycle[task.status] ?? "open"
        currentDay = day

        if !wasAllComplete && currentDay.isAllCompleted {
            triggerConfetti()
        }
    }

    func changePriority(_ taskId: String, to newPriority: String) {
        var day = currentDay
        guard let idx = day.tasks.firstIndex(where: { $0.id == taskId }) else { return }
        guard day.tasks[idx].priority != newPriority else { return }
        day.tasks[idx].priority = newPriority
        day.tasks[idx].number = DayData(tasks: day.tasks.filter { $0.id != taskId }).nextNumber(for: newPriority)
        renumberPriority(&day.tasks, priority: day.tasks[idx].priority)
        currentDay = day
    }

    func moveTask(_ taskId: String, direction: Int) {
        var day = currentDay
        guard let task = day.tasks.first(where: { $0.id == taskId }) else { return }
        var group = day.tasks
            .filter { $0.priority == task.priority }
            .sorted { $0.number < $1.number }
        guard let groupIdx = group.firstIndex(where: { $0.id == taskId }) else { return }
        let swapIdx = groupIdx + direction
        guard swapIdx >= 0 && swapIdx < group.count else { return }

        let tmp = group[groupIdx].number
        group[groupIdx].number = group[swapIdx].number
        group[swapIdx].number = tmp

        // Apply back to day.tasks
        for g in group {
            if let i = day.tasks.firstIndex(where: { $0.id == g.id }) {
                day.tasks[i].number = g.number
            }
        }
        currentDay = day
    }

    // MARK: - Forwarding

    func forwardTask(_ taskId: String, to targetDate: String) {
        var day = currentDay
        guard let idx = day.tasks.firstIndex(where: { $0.id == taskId }) else { return }
        let wasAllComplete = day.isAllCompleted

        day.tasks[idx].status = "forwarded"
        day.tasks[idx].forwardedTo = targetDate
        data.days[currentDate] = day

        var targetDay = data.days[targetDate] ?? DayData()
        let newTask = PlannerTask.create(
            priority: day.tasks[idx].priority,
            number: targetDay.nextNumber(for: day.tasks[idx].priority),
            text: day.tasks[idx].text
        )
        targetDay.tasks.append(newTask)
        data.days[targetDate] = targetDay
        save()

        if !wasAllComplete && (data.days[currentDate] ?? DayData()).isAllCompleted {
            triggerConfetti()
        }
    }

    // MARK: - Notes

    func updateNotes(_ text: String) {
        var day = currentDay
        day.notes = text
        data.days[currentDate] = day
        save()
    }

    // MARK: - Rollover

    func checkRollover() {
        let today = DateHelpers.todayStr()
        guard data.settings.autoRollover else { return }
        guard let lastDate = data.settings.lastVisitedDate, !lastDate.isEmpty else {
            data.settings.lastVisitedDate = today
            save()
            return
        }
        guard lastDate < today else {
            data.settings.lastVisitedDate = today
            save()
            return
        }

        var checkDate = lastDate
        var rolledCount = 0
        while checkDate < today {
            let dayData = data.days[checkDate]
            if let tasks = dayData?.tasks {
                for task in tasks where task.status == "open" {
                    forwardTaskFromRollover(task, from: checkDate, to: today)
                    rolledCount += 1
                }
            }
            checkDate = DateHelpers.addDays(checkDate, 1)
        }

        data.settings.lastVisitedDate = today
        save()
    }

    private func forwardTaskFromRollover(_ task: PlannerTask, from sourceDate: String, to targetDate: String) {
        var sourceDay = data.days[sourceDate] ?? DayData()
        guard let idx = sourceDay.tasks.firstIndex(where: { $0.id == task.id }) else { return }
        sourceDay.tasks[idx].status = "forwarded"
        sourceDay.tasks[idx].forwardedTo = targetDate
        data.days[sourceDate] = sourceDay

        var targetDay = data.days[targetDate] ?? DayData()
        let newTask = PlannerTask.create(
            priority: task.priority,
            number: targetDay.nextNumber(for: task.priority),
            text: task.text
        )
        targetDay.tasks.append(newTask)
        data.days[targetDate] = targetDay
    }

    // MARK: - Streak

    func calculateStreak() -> Int {
        let today = DateHelpers.todayStr()
        var checkDate = today
        var streak = 0
        var looked = 0

        while looked < 400 {
            let dayData = data.days[checkDate]
            if let d = dayData, !d.tasks.isEmpty {
                if d.isAllCompleted {
                    streak += 1
                } else {
                    break
                }
            }
            checkDate = DateHelpers.addDays(checkDate, -1)
            looked += 1
        }
        return streak
    }

    // MARK: - Heatmap

    func weekDates() -> [String] {
        DateHelpers.getWeekDates(currentDate)
    }

    func completionPercent(for dateStr: String) -> Int {
        dayData(for: dateStr).completionPercent
    }

    // MARK: - Confetti

    private func triggerConfetti() {
        showConfetti = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) { [weak self] in
            self?.showConfetti = false
        }
    }

    // MARK: - Private Helpers

    private func save() {
        storage.saveData(data)
    }

    private func renumberPriority(_ tasks: inout [PlannerTask], priority: String) {
        let indices = tasks.enumerated()
            .filter { $0.element.priority == priority }
            .sorted { $0.element.number < $1.element.number }
        for (newNum, item) in indices.enumerated() {
            tasks[item.offset].number = newNum + 1
        }
    }
}
