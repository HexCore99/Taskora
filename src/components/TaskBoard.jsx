import { useRef, useState } from "react";
import { DndContext, closestCorners } from "@dnd-kit/core";
import { invoke } from "@tauri-apps/api/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  flattenTasks,
  groupTasksByStatus,
  useTaskStore,
} from "@/stores/useTaskStore";
import { useBoardStore } from "@/stores/useBoardStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useSortingStore } from "@/stores/useSortingStore";
import { useJustTaskStore } from "@/stores/useJustTaskStore";
import TaskColumn from "./TaskColumn";
import Task from "./Task";
import CreateTask from "./CreateTask";
import TaskDetailsPanel from "./task-details/TaskDetailsPanel";
import EmptyColumnText from "./EmptyColumnText";

const columns = [
  { title: "Todo", status: "todo" },
  { title: "In Progress", status: "in-progress" },
  { title: "Completed", status: "completed" },
];

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

export default function TaskBoard({ defaultTaskPriority = 4 }) {
  const [detailsAnchor, setDetailsAnchor] = useState(null);
  const [detailsPanelSide, setDetailsPanelSide] = useState("right");
  const boardGridRef = useRef(null);

  const tasks = useTaskStore((state) => state.tasks);
  const currentBoardId = useTaskStore((state) => state.currentBoardId);
  const currentJustTaskId = useTaskStore(
    (state) => state.currentJustTaskId,
  );
  const currentIncludeAll = useTaskStore((state) => state.currentIncludeAll);
  const setTasks = useTaskStore((state) => state.setTasks);
  const createTask = useTaskStore((state) => state.createTask);
  const moveToTrash = useTaskStore((state) => state.moveToTrash);

  const boardState = useBoardStore((state) => state.states);
  const setBoardState = useBoardStore((state) => state.set_state);
  const projects = useProjectStore((state) => state.projects);
  const justTaskBoards = useJustTaskStore((state) => state.justTaskBoards);
  const selectedTaskId = boardState.focusedTaskId ?? null;

  const visibleTasks = flattenTasks(tasks);
  const selectedTask = visibleTasks.find(
    (task) => Number(task.id) === Number(selectedTaskId),
  );

  function setSelectedTaskId(taskId, anchorElement = null) {
    setDetailsAnchor(taskId == null ? null : anchorElement);

    if (taskId == null || !anchorElement) {
      setDetailsPanelSide("right");
    } else {
      const anchorRect = anchorElement.getBoundingClientRect();
      const panelWidth = Math.min(400, window.innerWidth - 16);
      const panelFitsOnRight =
        anchorRect.right + 12 + panelWidth <= window.innerWidth - 8;

      setDetailsPanelSide(panelFitsOnRight ? "right" : "left");
    }

    setBoardState({
      ...boardState,
      focusedTaskId: taskId ?? null,
    });
  }


  function getDropStatus(overId, taskList) {
    const column = columns.find((column) => column.status === overId);
    if (column) return column.status;

    const targetTask = taskList.find((task) => String(task.id) === overId);
    if (!targetTask) return null;

    return targetTask.status ?? "todo";
  }

  function handleDragOver(event) {
    const { active, over } = event;

    if (!over) return;

    const activeTaskId = String(active.id);
    const overId = String(over.id);

    setTasks((currentTasks) => {
      const currentTaskList = flattenTasks(currentTasks);
      const nextStatus = getDropStatus(overId, currentTaskList);
      if (!nextStatus) return currentTasks;

      const activeTask = currentTaskList.find(
        (task) => String(task.id) === activeTaskId,
      );

      if (!activeTask || activeTask.status === nextStatus) {
        return currentTasks;
      }

      const updatedTasks = currentTaskList.map((task) => {
        return String(task.id) === activeTaskId
          ? { ...task, status: nextStatus }
          : task;
      });

      return groupTasksByStatus(updatedTasks);
    });
  }

  async function handleDragEnd(event) {
    const { active, over } = event;

    if (!over) return;

    const activeTaskId = String(active.id);
    const activeOverId = String(over.id);
    const taskList = flattenTasks(tasks);

    const activeTask = taskList.find(
      (task) => String(task.id) === activeTaskId,
    );
    if (!activeTask) return;

    const previousStatus = activeTask.status;

    const nextStatus = getDropStatus(activeOverId, taskList);
    if (!nextStatus) return;

    const statusUpdatedTasks = taskList.map((task) =>
      String(task.id) === activeTaskId ? { ...task, status: nextStatus } : task,
    );
    const oldIdx = statusUpdatedTasks.findIndex(
      (task) => String(task.id) === activeTaskId,
    );
    const newIdx = statusUpdatedTasks.findIndex(
      (task) => String(task.id) === activeOverId,
    );
    let reorderedTasks = statusUpdatedTasks;

    if (oldIdx !== -1 && newIdx !== -1) {
      reorderedTasks = arrayMove(statusUpdatedTasks, oldIdx, newIdx);
    }

    const tasksByStatus = groupTasksByStatus(reorderedTasks);
    const tasksToPersist = flattenTasks(tasksByStatus);

    setTasks(tasksByStatus);
    await invoke("update_position", {
      tasks: tasksToPersist,
      boardId: currentBoardId,
      includeAll: currentIncludeAll,
      justTaskId: currentJustTaskId,
    });
    await invoke("update_task_status", {
      id: Number(activeTaskId),
      status: nextStatus,
    });

    const { sortOptions, sortColumn } = useSortingStore.getState();
    const columnsToReSort = new Set([previousStatus, nextStatus]);

    for (const colStat of columnsToReSort) {
      const sortOption = sortOptions[colStat];
      if (sortOption && sortOption !== "default") {
        await sortColumn(colStat, sortOption);
      }
    }
  }

  function getTasksForColumn(status) {
    return tasks[status] ?? [];
  }


  async function handleDeleteTask(taskId) {
    await moveToTrash(taskId);
    setSelectedTaskId(null);
  }

  async function handleCreateTask(task) {
    await createTask(task);

    const { sortOptions, sortColumn } = useSortingStore.getState();
    const sortOption = sortOptions[task.status];

    if (sortOption) {
      await sortColumn(task.status, sortOption);
    }
  }

  function restrictToBoardColumns({ transform, draggingNodeRect }) {
    const boardRect = boardGridRef.current?.getBoundingClientRect();

    if (!boardRect || !draggingNodeRect) return transform;

    return {
      ...transform,
      x: Math.min(
        Math.max(transform.x, boardRect.left - draggingNodeRect.left),
        boardRect.right - draggingNodeRect.right,
      ),
    };
  }


  return (
    <DndContext
      collisionDetection={closestCorners}
      modifiers={[restrictToWindowEdges, restrictToBoardColumns]}
      onDragStart={() => setSelectedTaskId(null)}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="flex min-h-[calc(100vh-3.5rem)] w-full overflow-hidden">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div
            ref={boardGridRef}
            className="mt-6 grid w-full min-w-[1050px] grid-cols-[repeat(3,minmax(350px,1fr))]"
          >
            {columns.map((column) => {
              const columnTasks = getTasksForColumn(column.status);

              return (
                <TaskColumn
                  key={column.status}
                  title={column.title}
                  status={column.status}
                >
                    <CreateTask
                      colStatus={column.status}
                      defaultPriority={defaultTaskPriority}
                      onAdd={handleCreateTask}
                    />

                  {columnTasks.length === 0 && (
                    <EmptyColumnText status={column.status}/>
                    )}

                  <SortableContext
                    items={columnTasks.map((task) => String(task.id))}
                    strategy={verticalListSortingStrategy}
                  >
                    {columnTasks.map((task) => (
                      <Task
                        key={task.id}
                        task={task}
                        isSelected={Number(selectedTaskId) === Number(task.id)}
                        detailsPanelSide={detailsPanelSide}
                        onOpenDetails={setSelectedTaskId}
                        onDelete={handleDeleteTask}
                      />
                    ))}
                  </SortableContext>
                </TaskColumn>
              );
            })}
          </div>
        </div>

        {selectedTask && (
          <TaskDetailsPanel
            task={selectedTask}
            anchorElement={detailsAnchor}
            breadcrumb={getTaskBreadcrumb(
              selectedTask,
              projects,
              justTaskBoards,
            )}
            onClose={() => setSelectedTaskId(null)}
          />
        )}
      </div>
    </DndContext>
  );
}
