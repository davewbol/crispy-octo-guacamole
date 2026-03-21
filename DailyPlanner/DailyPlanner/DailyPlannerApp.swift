import SwiftUI
// Uncomment when Firebase SDK is added:
// import Firebase
// import GoogleSignIn

@main
struct DailyPlannerApp: App {
    init() {
        // Uncomment when Firebase SDK is added:
        // FirebaseApp.configure()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
            // Uncomment when Google Sign-In is added:
            // .onOpenURL { url in
            //     GIDSignIn.sharedInstance.handle(url)
            // }
        }
    }
}
