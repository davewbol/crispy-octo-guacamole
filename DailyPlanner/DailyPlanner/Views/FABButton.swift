import SwiftUI

struct FABButton: View {
    @Binding var isShowingSheet: Bool

    var body: some View {
        Button {
            isShowingSheet.toggle()
        } label: {
            Text("\uFF0B")
                .font(OutfitFont.font(weight: .regular, size: 26))
                .foregroundStyle(GHPalette.teal800)
                .frame(width: 54, height: 54)
                .background(GHPalette.amber400)
                .clipShape(Circle())
                .shadow(color: GHShadow.amber.color, radius: GHShadow.amber.radius, y: GHShadow.amber.y)
                .rotationEffect(.degrees(isShowingSheet ? 45 : 0))
                .animation(.easeInOut(duration: 0.2), value: isShowingSheet)
        }
    }
}
