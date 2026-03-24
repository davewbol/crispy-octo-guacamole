import SwiftUI

struct TaskListView: View {
    @EnvironmentObject var viewModel: PlannerViewModel
    let theme: AppTheme

    var body: some View {
        let tasks = viewModel.currentDay.sortedTasks

        if tasks.isEmpty {
            VStack(spacing: 8) {
                Text("No tasks for this day")
                    .font(.system(size: 15))
                    .foregroundStyle(theme.textFaint)
                Text("Add a task above to get started")
                    .font(.system(size: 13))
                    .foregroundStyle(theme.textFaint.opacity(0.7))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 32)
        } else {
            LazyVStack(spacing: 0) {
                ForEach(tasks) { task in
                    TaskRowView(task: task, theme: theme)
                    if task.id != tasks.last?.id {
                        Divider()
                            .background(theme.borderSecondary)
                    }
                }
            }
            .background(theme.bgCard)
            .cornerRadius(GHRadius.md)
            .overlay(
                RoundedRectangle(cornerRadius: GHRadius.md)
                    .stroke(theme.borderSecondary, lineWidth: 1)
            )
        }
    }
}
