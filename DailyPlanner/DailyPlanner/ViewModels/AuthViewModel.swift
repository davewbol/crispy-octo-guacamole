import Foundation
import SwiftUI
// Firebase/Google imports would go here when SDKs are added:
// import FirebaseAuth
// import GoogleSignIn
// import GoogleSignInSwift

/// Manages Google Sign-In and Firebase Auth state.
/// This is a stub that compiles without Firebase SDK.
/// Once you add Firebase via SPM, uncomment the auth calls.
@MainActor
class AuthViewModel: ObservableObject {
    @Published var isSignedIn = false
    @Published var userName = ""
    @Published var userEmail = ""
    @Published var userId: String?

    init() {
        // TODO: Uncomment when Firebase SDK is added
        /*
        Auth.auth().addStateDidChangeListener { [weak self] _, user in
            DispatchQueue.main.async {
                self?.isSignedIn = user != nil
                self?.userName = user?.displayName ?? ""
                self?.userEmail = user?.email ?? ""
                self?.userId = user?.uid
            }
        }
        */
    }

    func signIn() {
        // TODO: Uncomment when Firebase SDK is added
        /*
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootVC = windowScene.windows.first?.rootViewController else { return }

        GIDSignIn.sharedInstance.signIn(withPresenting: rootVC) { [weak self] result, error in
            guard error == nil, let user = result?.user,
                  let idToken = user.idToken?.tokenString else {
                print("Google Sign-In error: \(error?.localizedDescription ?? "unknown")")
                return
            }
            let credential = GoogleAuthProvider.credential(
                withIDToken: idToken,
                accessToken: user.accessToken.tokenString
            )
            Auth.auth().signIn(with: credential) { authResult, error in
                if let error = error {
                    print("Firebase Auth error: \(error.localizedDescription)")
                }
                // State change listener handles the rest
            }
        }
        */

        // Stub: simulate sign-in for UI development
        print("Sign-in would happen here. Add Firebase SDK to enable.")
    }

    func signOut() {
        // TODO: Uncomment when Firebase SDK is added
        /*
        do {
            try Auth.auth().signOut()
            GIDSignIn.sharedInstance.signOut()
        } catch {
            print("Sign-out error: \(error)")
        }
        */

        isSignedIn = false
        userName = ""
        userEmail = ""
        userId = nil
    }
}
