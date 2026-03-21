import Foundation
// Firebase imports would go here when Firebase SDK is added:
// import FirebaseFirestore

/// Handles syncing data to/from Firestore.
/// The Firestore schema must match the web app exactly:
///   /planners/{userId}           → { theme, autoRollover, lastVisitedDate }
///   /planners/{userId}/days/{dateStr} → { tasks: [...], notes: "" }
///
/// This service is a stub that compiles without Firebase SDK.
/// Once you add Firebase via SPM, uncomment the Firestore calls.
class FirebaseSyncService {
    static let shared = FirebaseSyncService()

    enum SyncStatus {
        case idle, syncing, synced, error
    }

    var status: SyncStatus = .idle
    private var syncTask: Task<Void, Never>?

    /// Schedule a debounced sync to cloud (1 second delay)
    func scheduleSyncToCloud(userId: String, data: AppData) {
        syncTask?.cancel()
        syncTask = Task {
            do {
                try await Task.sleep(for: .seconds(1))
                guard !Task.isCancelled else { return }
                await syncToCloud(userId: userId, data: data)
            } catch {
                // Cancelled
            }
        }
    }

    /// Upload all data to Firestore
    func syncToCloud(userId: String, data: AppData) async {
        status = .syncing

        // TODO: Uncomment when Firebase SDK is added
        /*
        let db = Firestore.firestore()
        let plannerRef = db.collection("planners").document(userId)

        do {
            // Write settings to main document
            try await plannerRef.setData([
                "theme": data.settings.theme,
                "autoRollover": data.settings.autoRollover,
                "lastVisitedDate": data.settings.lastVisitedDate ?? NSNull()
            ], merge: true)

            // Write days in batches (max 490 per batch)
            let dayEntries = Array(data.days)
            var batchStart = 0
            while batchStart < dayEntries.count {
                let batch = db.batch()
                let batchEnd = min(batchStart + 490, dayEntries.count)

                for i in batchStart..<batchEnd {
                    let (dateStr, dayData) = dayEntries[i]
                    let dayRef = plannerRef.collection("days").document(dateStr)
                    let tasksData = try dayData.tasks.map { task -> [String: Any] in
                        return [
                            "id": task.id,
                            "priority": task.priority,
                            "number": task.number,
                            "text": task.text,
                            "status": task.status,
                            "forwardedTo": task.forwardedTo ?? NSNull(),
                            "createdAt": task.createdAt
                        ]
                    }
                    batch.setData([
                        "tasks": tasksData,
                        "notes": dayData.notes
                    ], forDocument: dayRef)
                }

                try await batch.commit()
                batchStart = batchEnd
            }

            status = .synced
        } catch {
            print("Sync to cloud error: \(error)")
            status = .error
        }
        */

        // Stub: just mark as synced
        status = .synced
    }

    /// Fetch cloud data and merge with local (cloud wins for conflicts)
    func syncFromCloud(userId: String, localData: AppData) async -> AppData {
        status = .syncing

        // TODO: Uncomment when Firebase SDK is added
        /*
        let db = Firestore.firestore()
        let plannerRef = db.collection("planners").document(userId)

        do {
            var merged = localData

            // Fetch settings
            let settingsDoc = try await plannerRef.getDocument()
            if let settingsData = settingsDoc.data() {
                if let theme = settingsData["theme"] as? String {
                    merged.settings.theme = theme
                }
                if let autoRollover = settingsData["autoRollover"] as? Bool {
                    merged.settings.autoRollover = autoRollover
                }
                if let lastVisited = settingsData["lastVisitedDate"] as? String {
                    if let localLast = merged.settings.lastVisitedDate {
                        merged.settings.lastVisitedDate = max(localLast, lastVisited)
                    } else {
                        merged.settings.lastVisitedDate = lastVisited
                    }
                }
            }

            // Fetch all days
            let daysSnapshot = try await plannerRef.collection("days").getDocuments()
            for doc in daysSnapshot.documents {
                let dateStr = doc.documentID
                let cloudTasks = (doc.data()["tasks"] as? [[String: Any]])?.compactMap { dict -> PlannerTask? in
                    guard let id = dict["id"] as? String,
                          let priority = dict["priority"] as? String,
                          let number = dict["number"] as? Int,
                          let text = dict["text"] as? String,
                          let status = dict["status"] as? String,
                          let createdAt = dict["createdAt"] as? String
                    else { return nil }
                    return PlannerTask(
                        id: id, priority: priority, number: number, text: text,
                        status: status, forwardedTo: dict["forwardedTo"] as? String, createdAt: createdAt
                    )
                } ?? []
                let cloudNotes = doc.data()["notes"] as? String ?? ""

                if let localDay = merged.days[dateStr] {
                    // Merge: union by task ID, cloud wins
                    var taskMap: [String: PlannerTask] = [:]
                    for t in localDay.tasks { taskMap[t.id] = t }
                    for t in cloudTasks { taskMap[t.id] = t } // cloud overwrites
                    var mergedDay = DayData(
                        tasks: Array(taskMap.values),
                        notes: cloudNotes.isEmpty ? localDay.notes : cloudNotes
                    )
                    merged.days[dateStr] = mergedDay
                } else {
                    merged.days[dateStr] = DayData(tasks: cloudTasks, notes: cloudNotes)
                }
            }

            status = .synced
            return merged
        } catch {
            print("Sync from cloud error: \(error)")
            status = .error
            return localData
        }
        */

        // Stub: return local data unchanged
        status = .synced
        return localData
    }
}
