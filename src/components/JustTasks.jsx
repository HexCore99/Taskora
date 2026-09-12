import { useEffect, useState } from "react";
import {
  ListTodoIcon,
  LoaderCircleIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useBoardStore } from "@/stores/useBoardStore";
import { useJustTaskStore } from "@/stores/useJustTaskStore";
import { useProjectStore } from "@/stores/useProjectStore";
import TrashConfirmDialog from "@/components/trash/TrashConfirmDialog";
import { JustTaskMoveMenu } from "@/components/SidebarBoardMoveMenu";

export function JustTasks() {
  const [isCreating, setIsCreating] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const boardState = useBoardStore((state) => state.states);
  const setBoardState = useBoardStore((state) => state.set_state);
  const justTaskBoards = useJustTaskStore((state) => state.justTaskBoards);
  const projects = useProjectStore((state) => state.projects);
  const isLoading = useJustTaskStore((state) => state.isLoading);
  const error = useJustTaskStore((state) => state.error);
  const loadJustTaskBoards = useJustTaskStore(
    (state) => state.loadJustTaskBoards,
  );
  const createJustTaskBoard = useJustTaskStore(
    (state) => state.createJustTaskBoard,
  );
  const deleteJustTaskBoard = useJustTaskStore(
    (state) => state.deleteJustTaskBoard,
  );
  const moveJustTaskBoardToProject = useJustTaskStore(
    (state) => state.moveJustTaskBoardToProject,
  );
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const clearError = useJustTaskStore((state) => state.clearError);

  useEffect(() => {
    loadJustTaskBoards().catch(() => {
      // The store exposes the backend error below the task list.
    });
  }, [loadJustTaskBoards]);

  function beginCreating() {
    clearError();
    setTaskName("");
    setIsCreating(true);
  }

  function openJustTaskBoard(justTaskBoard) {
    setBoardState({
      type: "just-tasks",
      projectId: null,
      boardId: null,
      justTaskId: justTaskBoard.id,
      title: justTaskBoard.name,
      focusedTaskId: null,
    });
  }

  async function handleCreate(event) {
    event.preventDefault();
    const name = taskName.trim();

    if (!name || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const createdBoard = await createJustTaskBoard(name);

      setTaskName("");
      setIsCreating(false);
      openJustTaskBoard(createdBoard);
    } catch {
      // Keep the entered name so the user can retry.
    } finally {
      setIsSubmitting(false);
    }
  }

  function requestDelete(event, justTaskBoard) {
    event.preventDefault();
    event.stopPropagation();
    setPendingDelete(justTaskBoard);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    setIsDeleting(true);

    try {
      await deleteJustTaskBoard(pendingDelete.id);

      if (
        boardState.type === "just-tasks" &&
        Number(boardState.justTaskId) === Number(pendingDelete.id)
      ) {
        setBoardState({
          type: "general",
          projectId: null,
          boardId: null,
          justTaskId: null,
          title: "All Tasks",
          focusedTaskId: null,
        });
      }

      setPendingDelete(null);
    } catch {
      // The store exposes the backend error below the list.
    } finally {
      setIsDeleting(false);
    }
  }

  async function moveToProject(justTaskBoard, project) {
    try {
      const movedBoard = await moveJustTaskBoardToProject(
        justTaskBoard.id,
        project.id,
      );
      await Promise.all([loadJustTaskBoards(), loadProjects()]);

      if (
        boardState.type === "just-tasks" &&
        Number(boardState.justTaskId) === Number(justTaskBoard.id)
      ) {
        setBoardState({
          type: "board",
          projectId: project.id,
          boardId: movedBoard.id,
          justTaskId: null,
          title: movedBoard.name,
          focusedTaskId: null,
        });
      }
    } catch {
      // The store exposes the backend error below the task list.
    }
  }

  return (
    <SidebarGroup className="pt-0 pb-4 group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>JustTasks</SidebarGroupLabel>

      <SidebarGroupAction
        type="button"
        title="Create JustTask"
        aria-label="Create JustTask"
        onClick={beginCreating}
      >
        <PlusIcon />
      </SidebarGroupAction>

      <SidebarMenu className="gap-1">
        {isCreating && (
          <SidebarMenuItem className="mb-1">
            <form onSubmit={handleCreate}>
              <Input
                autoFocus
                type="text"
                value={taskName}
                placeholder="JustTask name"
                disabled={isSubmitting}
                onChange={(event) => setTaskName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setTaskName("");
                    setIsCreating(false);
                    clearError();
                  }
                }}
                className="h-8 px-2 text-sm"
              />
            </form>
          </SidebarMenuItem>
        )}

        {isLoading && justTaskBoards.length === 0 && (
          <SidebarMenuItem>
            <div className="flex h-8 items-center gap-2 px-2 text-xs text-muted-foreground">
              <LoaderCircleIcon className="size-3.5 animate-spin" />
              <span>Loading JustTasks...</span>
            </div>
          </SidebarMenuItem>
        )}

        {!isLoading && justTaskBoards.length === 0 && !isCreating && (
          <SidebarMenuItem>
            <p className="px-2 py-1 text-xs text-muted-foreground">
              No JustTasks yet.
            </p>
          </SidebarMenuItem>
        )}

        {justTaskBoards.map((justTaskBoard) => (
          <SidebarMenuItem key={justTaskBoard.id}>
            <JustTaskMoveMenu
              projects={projects}
              onMove={(project) => moveToProject(justTaskBoard, project)}
            >
              <SidebarMenuButton
                type="button"
                tooltip={justTaskBoard.name}
                isActive={
                  boardState.type === "just-tasks" &&
                  Number(boardState.justTaskId) === Number(justTaskBoard.id)
                }
                className="h-8 px-2 data-[active=true]:bg-orange-50! data-[active=true]:text-orange-600! dark:data-[active=true]:bg-orange-950/40! dark:data-[active=true]:text-orange-300!"
                onClick={() => openJustTaskBoard(justTaskBoard)}
              >
                <ListTodoIcon className="text-muted-foreground" />
                <span>{justTaskBoard.name}</span>
              </SidebarMenuButton>
            </JustTaskMoveMenu>

            <SidebarMenuAction
              type="button"
              showOnHover
              title={`Delete ${justTaskBoard.name}`}
              aria-label={`Delete ${justTaskBoard.name}`}
              className="text-destructive hover:text-destructive"
              onClick={(event) => requestDelete(event, justTaskBoard)}
            >
              <Trash2Icon />
            </SidebarMenuAction>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>

      {error && <p className="mt-2 px-2 text-xs text-destructive">{error}</p>}

      <TrashConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this JustTask?"
        description={`"${pendingDelete?.name ?? "Untitled"}" will be removed. Any tasks inside it will be moved to Trash.`}
        confirmLabel="Delete JustTask"
        onConfirm={confirmDelete}
        isConfirming={isDeleting}
      />
    </SidebarGroup>
  );
}
