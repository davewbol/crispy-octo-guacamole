import SwiftUI

struct ConfettiView: View {
    @Binding var isActive: Bool

    @State private var particles: [ConfettiParticle] = []
    @State private var startTime: Date = Date()

    var body: some View {
        if isActive {
            TimelineView(.animation) { timeline in
                Canvas { context, size in
                    let elapsed = timeline.date.timeIntervalSince(startTime)
                    guard elapsed < 2.5 else {
                        DispatchQueue.main.async { isActive = false }
                        return
                    }
                    let fade = elapsed > 1.8 ? max(0, 1 - (elapsed - 1.8) / 0.7) : 1.0

                    for particle in particles {
                        let t = elapsed
                        let x = particle.x + particle.vx * t
                        let y = particle.y + particle.vy * t + 0.5 * 400 * t * t
                        let rotation = Angle.degrees(particle.rotation + particle.rotSpeed * t * 60)
                        let rect = CGRect(x: -particle.size / 2, y: -particle.size / 2, width: particle.size, height: particle.size)

                        context.opacity = fade
                        context.translateBy(x: x, y: y)
                        context.rotate(by: rotation)
                        context.fill(Path(rect), with: .color(particle.color))
                        context.rotate(by: -rotation)
                        context.translateBy(x: -x, y: -y)
                    }
                }
            }
            .allowsHitTesting(false)
            .ignoresSafeArea()
            .onAppear {
                startTime = Date()
                particles = (0..<60).map { _ in
                    ConfettiParticle(
                        x: UIScreen.main.bounds.width * 0.5 + CGFloat.random(in: -150...150),
                        y: UIScreen.main.bounds.height * 0.35,
                        vx: CGFloat.random(in: -200...200),
                        vy: CGFloat.random(in: -500 ... -150),
                        color: GHPalette.confetti.randomElement()!,
                        size: CGFloat.random(in: 4...9),
                        rotation: Double.random(in: 0...360),
                        rotSpeed: Double.random(in: -5...5)
                    )
                }
            }
        }
    }
}

private struct ConfettiParticle {
    let x: CGFloat
    let y: CGFloat
    let vx: CGFloat
    let vy: CGFloat
    let color: Color
    let size: CGFloat
    let rotation: Double
    let rotSpeed: Double
}
