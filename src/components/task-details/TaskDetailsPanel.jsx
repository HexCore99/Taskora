import { useEffect, useLayoutEffect, useRef, useState } from "react";
import TaskDescription from "./TaskDescription";
import TaskDetailsActions from "./TaskDetailsActions";
import TaskDetailsHeader from "./TaskDetailsHeader";
import TaskNotes from "./TaskNotes";
import TaskProperties from "./TaskProperties";
import { useTaskStore } from "@/stores/useTaskStore";
import { useSortingStore } from "@/stores/useSortingStore";

function createDraft(task) {
  return {
    name: task.name ?? "",
    status: task.status ?? "todo",
    due_date: task.due_date ?? null,
    priority: Number(task.priority ?? 4),
    description: task.description ?? "",
    notes: Array.isArray(task.notes)
      ? task.notes.map((note) => ({
          ...note,
          text: note.text ?? note.description ?? "",
          completed: Boolean(note.completed ?? note.is_completed),
        }))
      : [],
  };
}

export default function TaskDetailsPanel({
  task,
  breadcrumb,
  anchorElement,
  onClose,
}) {
  const panelRef = useRef(null);
  const [draft, setDraft] = useState(() => createDraft(task));
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [position, setPosition] = useState(null);

  const saveTaskDetails = useTaskStore((state) => state.saveTaskDetails);
  const moveToTrash = useTaskStore((state) => state.moveToTrash);
  const sortOptions = useSortingStore((state) => state.sortOptions);
  const sortColumn = useSortingStore((state) => state.sortColumn);

  useEffect(() => {
    setDraft(createDraft(task));
    setIsDeleting(false);
    setIsSaving(false);
  }, [task.id]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useLayoutEffect(() => {
    function updatePosition() {
      const panel = panelRef.current;
      if (!panel) return;

      const margin = 8;
      const gap = 12;
      const panelRect = panel.getBoundingClientRect();
      const anchorRect = anchorElement?.isConnected
        ? anchorElement.getBoundingClientRect()
        : null;

      if (!anchorRect) {
        setPosition({
          left: Math.max(margin, window.innerWidth - panelRect.width - margin),
          top: margin,
        });
        return;
      }

      const right = anchorRect.right + gap;
      const left = anchorRect.left - panelRect.width - gap;
      const preferredLeft =
        right + panelRect.width <= window.innerWidth - margin ? right : left;

      setPosition({
        left: Math.min(
          Math.max(margin, preferredLeft),
          window.innerWidth - panelRect.width - margin,
        ),
        top: Math.min(
          Math.max(margin, anchorRect.top),
          window.innerHeight - panelRect.height - margin,
        ),
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorElement, task.id]);

  useEffect(() => {
    function handleOutsidePointerDown(event) {
      const isPanelPopup =
        event.target instanceof Element &&
        event.target.closest("[data-task-details-popup]");

      if (
        panelRef.current?.contains(event.target) ||
        anchorElement?.contains(event.target) ||
        isPanelPopup
      ) {
        return;
      }

      onClose();
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [anchorElement, onClose]);

  function updateDraft(field, value) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  async function handleSave() {
    const name = draft.name.trim();
    if (!name) return;

    const changes = {
      ...draft,
      name,
      description: draft.description.trim() || null,
      notes: draft.notes
        .map((note) => ({ ...note, text: (note.text ?? "").trim() }))
        .filter((note) => note.text),
    };

    setIsSaving(true);

    try {
      await saveTaskDetails(task, changes);

      const affectedColumns = new Set([task.status, changes.status]);

      for (const columnStatus of affectedColumns) {
        const sortOption = sortOptions[columnStatus];

        if (sortOption && sortOption !== "default") {
          await sortColumn(columnStatus, sortOption);
        }
      }

      onClose();
    } catch (error) {
      console.error("Could not save task details:", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      await moveToTrash(task.id);
      onClose();
    } catch (error) {
      console.error("Could not move task to Trash:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <aside
      ref={panelRef}
      role="dialog"
      aria-label={"Task details for " + task.name}
      style={position ?? { left: 8, top: 8, visibility: "hidden" }}
      className="fixed z-50 flex h-[min(44rem,calc(100vh-1rem))] w-100 max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
    >
      <TaskDetailsHeader
        name={draft.name}
        breadcrumb={breadcrumb}
        onNameChange={(name) => updateDraft("name", name)}
        onClose={onClose}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 px-5 py-4">
          <TaskProperties
            taskId={task.id}
            draft={draft}
            onChange={updateDraft}
          />

          <TaskDescription
            value={draft.description}
            onChange={(description) => updateDraft("description", description)}
          />

          <TaskNotes
            key={task.id}
            notes={draft.notes}
            onChange={(notes) => updateDraft("notes", notes)}
          />
        </div>

        <TaskDetailsActions
          isDeleting={isDeleting}
          isSaving={isSaving}
          saveDisabled={!draft.name.trim()}
          onDelete={handleDelete}
          onCancel={onClose}
          onSave={handleSave}
        />
      </div>
    </aside>
  );
}
