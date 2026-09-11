import { useMemo, useState } from "react";
import { CalendarDays, FileSearch, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { flattenTasks, useTaskStore } from "@/stores/useTaskStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useJustTaskStore } from "@/stores/useJustTaskStore";
import TaskDetailsPanel from "./task-details/TaskDetailsPanel";

const statusLabels = {
  todo: "Todo",
  "in-progress": "In Progress",
  completed: "Completed",
};

const statusClasses = {
  todo: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
  "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300",
};

function getTaskBreadcrumb(task, projects, justTaskBoards) {
  if (task.just_task_id != null) {
    const justTaskBoard = justTaskBoards.find(
      (candidate) => Number(candidate.id) === Number(task.just_task_id),
    );

    return justTaskBoard
      ? ["JustTasks", justTaskBoard.name]
      : ["JustTasks"];
  }

  if (task.board_id == null) return ["All Tasks"];

  for (const project of projects) {
    const board = project.boards.find(
      (candidate) => Number(candidate.id) === Number(task.board_id),
    );

    if (board) return [project.name, board.name];
  }

  return ["All Tasks"];
}

function getSearchText(task) {
  const noteText = (task.notes ?? [])
    .map((note) => note.text ?? note.description ?? "")
    .join(" ");

  return [task.name, task.description, noteText]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

export default function SearchBoard() {
  const [query, setQuery] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [detailsAnchor, setDetailsAnchor] = useState(null);

  function openTaskDetails(taskId, anchorElement) {
    setSelectedTaskId(taskId);
    setDetailsAnchor(anchorElement);
  }

  function closeTaskDetails() {
    setSelectedTaskId(null);
    setDetailsAnchor(null);
  }

  const tasks = useTaskStore((state) => state.tasks);
  const projects = useProjectStore((state) => state.projects);
  const justTaskBoards = useJustTaskStore((state) => state.justTaskBoards);
  const taskList = flattenTasks(tasks);
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const results = useMemo(() => {
    if (!normalizedQuery) return [];

    return taskList.filter((task) =>
      getSearchText(task).includes(normalizedQuery),
    );
  }, [normalizedQuery, taskList]);

  const selectedTask = taskList.find(
    (task) => Number(task.id) === Number(selectedTaskId),
  );

  return (
    <div className="flex min-h-[calc(100vh-6.5rem)] w-full overflow-hidden">
      <section className="min-w-0 flex-1 overflow-y-auto px-6 pb-10">
        <div className="mx-auto w-full max-w-4xl">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              value={query}
              autoFocus
              aria-label="Search tasks"
              placeholder="Search tasks..."
              className="h-12 rounded-xl bg-transparent pl-12 pr-11 text-base shadow-none focus-visible:border-orange-400 focus-visible:ring-orange-400/20"
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setQuery("")}
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            Search task titles, descriptions, and notes.
          </p>

          {!normalizedQuery ? (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <FileSearch className="mb-4 size-10 text-muted-foreground/60" />
              <h2 className="font-medium">Find a task</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Start typing to search across all your tasks.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <FileSearch className="mb-4 size-10 text-muted-foreground/60" />
              <h2 className="font-medium">No tasks found</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different word or phrase.
              </p>
            </div>
          ) : (
            <div className="mt-7">
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                {results.length} {results.length === 1 ? "result" : "results"}
              </p>

              <div className="space-y-3">
                {results.map((task) => {
                  const breadcrumb = getTaskBreadcrumb(
                    task,
                    projects,
                    justTaskBoards,
                  );

                  return (
                    <button
                      key={task.id}
                      type="button"
                      className="w-full rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-orange-300 hover:bg-orange-50/50 focus-visible:ring-2 focus-visible:ring-orange-400 dark:hover:border-orange-800 dark:hover:bg-orange-950/20"
                      onClick={(event) =>
                        openTaskDetails(task.id, event.currentTarget)
                      }
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h2 className="truncate font-medium">{task.name}</h2>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {breadcrumb.join(" / ")}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[task.status] ?? statusClasses.todo}`}
                        >
                          {statusLabels[task.status] ?? "Todo"}
                        </span>
                      </div>

                      {task.description && (
                        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                          {task.description}
                        </p>
                      )}

                      {task.due_date && (
                        <span className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="size-3.5" />
                          Due {task.due_date}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {selectedTask && (
        <TaskDetailsPanel
          task={selectedTask}
          anchorElement={detailsAnchor}
          breadcrumb={getTaskBreadcrumb(
            selectedTask,
            projects,
            justTaskBoards,
          )}
          onClose={closeTaskDetails}
        />
      )}
    </div>
  );
}
