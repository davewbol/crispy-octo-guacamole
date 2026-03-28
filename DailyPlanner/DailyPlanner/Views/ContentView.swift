import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = PlannerViewModel()
    @StateObject private var authViewModel = AuthViewModel()
    @State private var selectedTab = 0
    @State private var isShowingAddSheet = false

    var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $selectedTab) {
                TodayScreen(isShowingAddSheet: $isShowingAddSheet)
                    .tabItem {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Today")
                    }
                    .tag(0)

                CalendarScreen()
                    .tabItem {
                        Image(systemName: "calendar")
                        Text("Calendar")
                    }
                    .tag(1)

                ProfileScreen()
                    .tabItem {
                        Image(systemName: "person.fill")
                        Text("Profile")
                    }
                    .tag(2)
            }
            .tint(GHPalette.amber400)

            // Floating action button (only on Today tab)
            if selectedTab == 0 {
                HStack {
                    Spacer()
                    FABButton(isShowingSheet: $isShowingAddSheet)
                        .padding(.trailing, 20)
                        .padding(.bottom, 60)
                }
            }
        }
        .environmentObject(viewModel)
        .environmentObject(authViewModel)
        .sheet(isPresented: $isShowingAddSheet) {
            AddTaskSheet()
        }
        .onAppear {
            // Style the tab bar
            let appearance = UITabBarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = UIColor.white
            appearance.shadowColor = UIColor(GHPalette.n200)
            UITabBar.appearance().standardAppearance = appearance
            UITabBar.appearance().scrollEdgeAppearance = appearance
        }
    }
}

#Preview {
    ContentView()
}
