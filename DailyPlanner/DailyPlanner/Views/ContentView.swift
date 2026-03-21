import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = PlannerViewModel()
    @StateObject private var authViewModel = AuthViewModel()

    var body: some View {
        NavigationStack {
            MainPlannerView()
        }
        .environmentObject(viewModel)
        .environmentObject(authViewModel)
    }
}

#Preview {
    ContentView()
}
