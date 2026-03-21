import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    @EnvironmentObject var authViewModel: AuthViewModel
    let theme: AppTheme
    let onThemeChange: (AppTheme) -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                // Theme
                Section("Appearance") {
                    ForEach(AppTheme.allCases, id: \.self) { t in
                        Button {
                            onThemeChange(t)
                            viewModel.data.settings.theme = t.rawValue
                        } label: {
                            HStack {
                                Image(systemName: t.icon)
                                    .frame(width: 24)
                                Text(t.displayName)
                                Spacer()
                                if t.rawValue == viewModel.data.settings.theme {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(.blue)
                                }
                            }
                            .foregroundStyle(theme.textPrimary)
                        }
                    }
                }

                // Rollover
                Section("Behavior") {
                    Toggle("Auto-rollover open tasks", isOn: Binding(
                        get: { viewModel.data.settings.autoRollover },
                        set: { viewModel.data.settings.autoRollover = $0 }
                    ))
                }

                // Account
                Section("Account") {
                    if authViewModel.isSignedIn {
                        HStack {
                            Image(systemName: "person.circle.fill")
                            VStack(alignment: .leading) {
                                Text(authViewModel.userName)
                                    .font(.system(size: 15, weight: .medium))
                                Text(authViewModel.userEmail)
                                    .font(.system(size: 13))
                                    .foregroundStyle(theme.textMuted)
                            }
                        }
                        Button("Sign Out", role: .destructive) {
                            authViewModel.signOut()
                        }
                    } else {
                        Button {
                            authViewModel.signIn()
                        } label: {
                            HStack {
                                Image(systemName: "person.badge.plus")
                                Text("Sign in with Google")
                            }
                        }
                        Text("Sign in to sync across devices")
                            .font(.system(size: 13))
                            .foregroundStyle(theme.textMuted)
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
