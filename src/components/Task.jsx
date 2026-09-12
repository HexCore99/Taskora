import { useCallback, useState } from "react";
import { Check, Trash2, SquarePen, X } from "lucide-react";
import { useTaskStore } from "@/stores/useTaskStore";
import { useTaskDrag } from "@/hooks/useTaskDrag";
import DatePicker from "./DatePicker";
import FlagPicker from "./FlagPicker";
import TaskDragHandle from "./TaskDragHandle";
import { useSortingStore } from "@/stores/useSortingStore";

export default function Task({
  task,
  onDelete,
  isSelected = false,
  detailsPanelSide = "right",
  onOpenDetails,
}) {
  const changeTaskStatus = useTaskStore((state) => state.changeTaskStatus);

  const setNewDate = useTaskStore((state) => state.setDate);
  const updateTaskName = useTaskStore((state) => state.updateTaskName);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(task.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    isDragging,
    style,
  } = useTaskDrag(task.id);

  async function handleStatusChange(nextStatus) {
    const previousStatus = task.status;

    await changeTaskStatus(task.id, nextStatus);

    const { sortOptions, sortColumn } = useSortingStore.getState();
    const columnsToReSort = new Set([previousStatus, nextStatus]);

    for (const columnStatus of columnsToReSort) {
      const sortOption = sortOptions[columnStatus];

      if (sortOption && sortOption !== "default") {
        await sortColumn(columnStatus, sortOption);
      }
    }
  }

  function startEditing() {
    setDraftName(task.name);
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraftName(task.name);
    setIsEditing(false);
  }

  async function saveEditing() {
    const nextName = draftName.trim();

    if (nextName) {
      await updateTaskName(task.id, nextName);
    }

    setIsEditing(false);
  }

  const setDate = useCallback(
    async (taskId, newDate) => {
      await setNewDate(taskId, newDate);
      const { sortOptions, sortColumn } = useSortingStore.getState();
      const sortOption = sortOptions[task.status];
      if (sortOption !== "default") {
        await sortColumn(task.status, sortOption);
      }
    },
    [task.status, setNewDate],
  );

  function handleCardClick(event) {
    if (isDragging || isEditing) return;

    const interactiveTarget =
      event.target instanceof Element &&
      event.target.closest(
        "button, input, textarea, select, a, [role='menuitem'], [role='menuitemradio'], [role='option']",
      );

    if (interactiveTarget) return;

    onOpenDetails?.(task.id, event.currentTarget);
  }

  function handleCardKeyDown(event) {
    if (event.target !== event.currentTarget) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenDetails?.(task.id, event.currentTarget);
    }
  }

  const cardClassName = [
    taskColor[task.status] ?? taskColor.todo,
    "task-card h-fit w-full min-w-[300px] cursor-pointer rounded-lg border px-3 py-3 shadow-sm transition-shadow hover:shadow-lg",
  ]
    .filter(Boolean)
    .join(" ");

  const cardStyle = {
    ...style,
    translate: isSelected
      ? `${detailsPanelSide === "left" ? "-6px" : "6px"} 0`
      : "0 0",
    scale: isSelected ? "1.015" : "1",
    transition: [
      style.transition,
      "translate 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      "scale 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      "box-shadow 180ms ease",
    ]
      .filter(Boolean)
      .join(", "),
  };

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      role="button"
      tabIndex={0}
      aria-selected={isSelected}
      data-selected={isSelected}
      className={cardClassName}
      onClick={handleCardClick}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={handleCardKeyDown}
    >
      <div className="flex items-center justify-between gap-3">
        <input
          type="checkbox"
          checked={task.status === "completed"}
          className="accent-[var(--task-card-accent)]"
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => {
            const nextStatus = event.target.checked ? "completed" : "todo";
            handleStatusChange(nextStatus);
          }}
        />
        {isEditing ? (
          <input
            className="min-w-0 flex-1 rounded border border-[var(--task-card-accent)] bg-background px-2 py-1 text-sm outline-none"
            value={draftName}
            autoFocus
            onPointerDown={(event) => event.stopPropagation()}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation();

              if (event.key === "Enter") {
                saveEditing();
              }

              if (event.key === "Escape") {
                cancelEditing();
              }
            }}
          />
        ) : (
          <p className="min-w-0 flex-1 break-words">{task.name}</p>
        )}

        {/* {isEditing ? (
          <>
            <button
              type="button"
              className="shrink-0 p-2 hover:text-green-600"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={saveEditing}
            >
              <Check size={20} />
            </button>
            <button
              type="button"
              className="shrink-0 p-2 hover:text-red-500"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={cancelEditing}
            >
              <X size={20} />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="shrink-0 p-2 hover:text-blue-500"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={startEditing}
          >
            <SquarePen
              className="cursor-pointer hover:text-blue-500"
              size={20}
            />
          </button>
        )}*/}
        {/* <button
          type="button"
          className="shrink-0 p-2 hover:text-blue-500"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onDelete(task.id)}
        >
          <Trash2 size={20} strokeWidth={1.25} />
        </button>*/}


        <TaskDragHandle
          attributes={attributes}
          listeners={listeners}
          setActivatorNodeRef={setActivatorNodeRef}
        />
      </div>
      <div className="mt-2 flex items-center gap-1">
        <DatePicker taskId={task.id} onChange={setDate} />
        <FlagPicker taskId={task.id} taskPriority={task.priority} />
      </div>
    </div>
  );
}

const taskColor = {
  todo: "task-card--todo",
  "in-progress": "task-card--progress",
  completed: "task-card--completed",
};
