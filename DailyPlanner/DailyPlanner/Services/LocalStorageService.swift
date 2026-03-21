import Foundation

class LocalStorageService {
    static let shared = LocalStorageService()

    private let fileName = "fcplanner_data.json"

    private var fileURL: URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        return docs.appendingPathComponent(fileName)
    }

    func loadData() -> AppData {
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            return AppData()
        }
        do {
            let data = try Data(contentsOf: fileURL)
            return try JSONDecoder().decode(AppData.self, from: data)
        } catch {
            print("LocalStorage load error: \(error)")
            return AppData()
        }
    }

    func saveData(_ appData: AppData) {
        do {
            let data = try JSONEncoder().encode(appData)
            try data.write(to: fileURL, options: .atomic)
        } catch {
            print("LocalStorage save error: \(error)")
        }
    }
}
