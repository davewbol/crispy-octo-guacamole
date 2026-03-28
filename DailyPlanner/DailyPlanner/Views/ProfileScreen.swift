import SwiftUI

struct ProfileScreen: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    @EnvironmentObject var authViewModel: AuthViewModel

    private var totalDone: Int {
        viewModel.data.days.values.reduce(0) { $0 + $1.tasks.filter { $0.isCompleted }.count }
    }

    private var streak: Int { viewModel.calculateStreak() }

    private var avgPercent: Int {
        let daysWithTasks = viewModel.data.days.values.filter { !$0.tasks.isEmpty }
        guard !daysWithTasks.isEmpty else { return 0 }
        let total = daysWithTasks.reduce(0) { $0 + max(0, $1.completionPercent) }
        return total / daysWithTasks.count
    }

    private var initials: String {
        let name = authViewModel.isSignedIn ? authViewModel.userName : "User"
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return "\(parts[0].prefix(1))\(parts[1].prefix(1))".uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }

    var body: some View {
        VStack(spacing: 0) {
            // Profile header
            VStack(spacing: 12) {
                // Avatar
                Text(initials)
                    .font(OutfitFont.font(weight: .bold, size: 22))
                    .foregroundStyle(GHPalette.teal600)
                    .frame(width: 64, height: 64)
                    .background(GHPalette.teal100)
                    .clipShape(Circle())
                    .overlay(
                        Circle().stroke(GHPalette.amber400, lineWidth: 2.5)
                    )

                VStack(spacing: 4) {
                    Text(authViewModel.isSignedIn ? authViewModel.userName : "Planner User")
                        .font(OutfitFont.font(weight: .bold, size: 18))
                        .foregroundStyle(.white)

                    Text(authViewModel.isSignedIn ? authViewModel.userEmail : "Sign in to sync")
                        .font(OutfitFont.font(weight: .regular, size: 12.5))
                        .foregroundStyle(.white.opacity(0.45))
                }

                // Plan badge
                Text("\u{2726} Free Plan")
                    .font(OutfitFont.font(weight: .bold, size: 11))
                    .foregroundStyle(GHPalette.amber400)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 5)
                    .overlay(
                        Capsule().stroke(GHPalette.amber400.opacity(0.4), lineWidth: 1.5)
                    )
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
            .background(
                ZStack {
                    GHPalette.teal800
                    RadialGradient(
                        colors: [GHPalette.amber400.opacity(0.1), .clear],
                        center: .topTrailing,
                        startRadius: 0,
                        endRadius: 180
                    )
                }
            )

            ScrollView {
                VStack(spacing: 16) {
                    // Stats row
                    HStack(spacing: 10) {
                        profileStat(value: "\(totalDone)", label: "Tasks Done")
                        profileStat(value: "\(streak)", label: "Streak")
                        profileStat(value: "\(avgPercent)%", label: "Avg Done")
                    }
                    .padding(.horizontal, 16)

                    // Account section
                    settingsGroup(title: "Account") {
                        settingsRow(icon: "person.circle", title: "Edit Profile")
                        Divider().background(GHPalette.n100)
                        settingsRow(icon: "lock.shield", title: "Password & Security")
                    }
                    .padding(.horizontal, 16)

                    // Preferences section
                    settingsGroup(title: "Preferences") {
                        themeRow
                        Divider().background(GHPalette.n100)
                        settingsToggle(icon: "arrow.triangle.2.circlepath", title: "Auto Rollover",
                                       isOn: Binding(
                                        get: { viewModel.data.settings.autoRollover },
                                        set: { viewModel.data.settings.autoRollover = $0 }
                                       ))
                    }
                    .padding(.horizontal, 16)

                    // Data section
                    settingsGroup(title: "Data") {
                        HStack {
                            Image(systemName: "arrow.triangle.2.circlepath.circle")
                                .font(.system(size: 16))
                                .foregroundStyle(GHPalette.n500)
                                .frame(width: 28)

                            Text("Sync Status")
                                .font(OutfitFont.font(weight: .medium, size: 14))
                                .foregroundStyle(GHPalette.teal800)

                            Spacer()

                            Text("Local Only")
                                .font(OutfitFont.font(weight: .medium, size: 12))
                                .foregroundStyle(GHPalette.n400)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 13)
                    }
                    .padding(.horizontal, 16)

                    // Sign out
                    if authViewModel.isSignedIn {
                        Button {
                            authViewModel.signOut()
                        } label: {
                            Text("Sign Out")
                                .font(OutfitFont.font(weight: .bold, size: 14))
                                .foregroundStyle(GHPalette.coral400)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(GHPalette.coral100)
                                .clipShape(RoundedRectangle(cornerRadius: GHRadius.md))
                        }
                        .padding(.horizontal, 16)
                    } else {
                        Button {
                            authViewModel.signIn()
                        } label: {
                            Text("Sign In with Google")
                                .font(OutfitFont.font(weight: .bold, size: 14))
                                .foregroundStyle(GHPalette.teal800)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(GHPalette.amber400)
                                .clipShape(RoundedRectangle(cornerRadius: GHRadius.md))
                                .shadow(color: GHShadow.amber.color, radius: GHShadow.amber.radius, y: GHShadow.amber.y)
                        }
                        .padding(.horizontal, 16)
                    }

                    Spacer().frame(height: 80)
                }
                .padding(.top, 16)
            }
            .background(GHPalette.n50)
        }
    }

    // MARK: - Components

    private func profileStat(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(OutfitFont.font(weight: .black, size: 20))
                .foregroundStyle(GHPalette.teal800)
                .tracking(-0.5)

            Text(label)
                .font(OutfitFont.font(weight: .semibold, size: 10))
                .foregroundStyle(GHPalette.n400)
                .textCase(.uppercase)
                .tracking(0.5)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: GHRadius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: GHRadius.lg)
                .stroke(GHPalette.n200, lineWidth: 1.5)
        )
        .shadow(color: GHShadow.sm.color, radius: GHShadow.sm.radius, y: GHShadow.sm.y)
    }

    private func settingsGroup(title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(OutfitFont.font(weight: .bold, size: 10.5))
                .foregroundStyle(GHPalette.n400)
                .textCase(.uppercase)
                .tracking(1)
                .padding(.bottom, 8)
                .padding(.leading, 4)

            VStack(spacing: 0) {
                content()
            }
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: GHRadius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: GHRadius.xl)
                    .stroke(GHPalette.n200, lineWidth: 1.5)
            )
            .shadow(color: GHShadow.sm.color, radius: GHShadow.sm.radius, y: GHShadow.sm.y)
        }
    }

    private func settingsRow(icon: String, title: String) -> some View {
        HStack {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(GHPalette.n500)
                .frame(width: 28)

            Text(title)
                .font(OutfitFont.font(weight: .medium, size: 14))
                .foregroundStyle(GHPalette.teal800)

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(GHPalette.n300)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 13)
    }

    private func settingsToggle(icon: String, title: String, isOn: Binding<Bool>) -> some View {
        HStack {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(GHPalette.n500)
                .frame(width: 28)

            Text(title)
                .font(OutfitFont.font(weight: .medium, size: 14))
                .foregroundStyle(GHPalette.teal800)

            Spacer()

            Toggle("", isOn: isOn)
                .tint(GHPalette.amber400)
                .labelsHidden()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    private var themeRow: some View {
        HStack {
            Image(systemName: "paintbrush")
                .font(.system(size: 16))
                .foregroundStyle(GHPalette.n500)
                .frame(width: 28)

            Text("Theme")
                .font(OutfitFont.font(weight: .medium, size: 14))
                .foregroundStyle(GHPalette.teal800)

            Spacer()

            Picker("", selection: Binding(
                get: { viewModel.data.settings.theme },
                set: { viewModel.data.settings.theme = $0 }
            )) {
                ForEach(AppTheme.allCases, id: \.rawValue) { theme in
                    Text(theme.displayName).tag(theme.rawValue)
                }
            }
            .pickerStyle(.menu)
            .tint(GHPalette.amber500)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }
}
