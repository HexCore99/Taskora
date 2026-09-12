import { useState } from "react";
import {
  ChevronRightIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { useProjectStore } from "@/stores/useProjectStore";
import { useBoardStore } from "@/stores/useBoardStore";
import { useJustTaskStore } from "@/stores/useJustTaskStore";
import TrashConfirmDialog from "@/components/trash/TrashConfirmDialog";
import { ProjectBoardMoveMenu } from "@/components/SidebarBoardMoveMenu";

export function NavProjects({ navOpenItems = {}, onNavItemOpenChange }) {
  const projects = useProjectStore((state) => state.projects);
  const error = useProjectStore((state) => state.error);
  const createProject = useProjectStore((state) => state.createProject);
  const createBoard = useProjectStore((state) => state.createBoard);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const deleteBoard = useProjectStore((state) => state.deleteBoard);
  const clearError = useProjectStore((state) => state.clearError);
  const moveBoardToJustTasks = useProjectStore(
    (state) => state.moveBoardToJustTasks,
  );
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const loadJustTaskBoards = useJustTaskStore(
    (state) => state.loadJustTaskBoards,
  );
  const boardState = useBoardStore((state) => state.states);
  const setBoardState = useBoardStore((state) => state.set_state);

  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [creatingBoardFor, setCreatingBoardFor] = useState(null);
  const [boardName, setBoardName] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleCreateProject(event) {
    event.preventDefault();
    const trimmedName = projectName.trim();
    if (!trimmedName) return;

    try {
      await createProject(trimmedName);
      setProjectName("");
      setIsCreatingProject(false);
    } catch {
      // The store already exposes the backend error.
    }
  }

  async function handleCreateBoard(event, projectId) {
    event.preventDefault();
    const trimmedName = boardName.trim();
    if (!trimmedName) return;

    try {
      await createBoard(projectId, trimmedName);
      setBoardName("");
      setCreatingBoardFor(null);
    } catch {
      // The store already exposes the backend error.
    }
  }

  function beginCreatingProject() {
    clearError();
    setProjectName("");
    setIsCreatingProject(true);
  }

  function beginCreatingBoard(event, projectId) {
    event.preventDefault();
    event.stopPropagation();
    clearError();
    onNavItemOpenChange?.(`project:${projectId}`, true);
    setBoardName("");
    setCreatingBoardFor(projectId);
  }

  function handleBoardClick(event, project, board) {
    event.preventDefault();

    setBoardState({
      type: "board",
      projectId: project.id,
      boardId: board.id,
      justTaskId: null,
      title: board.name,
      focusedTaskId: null,
    });
  }

  function requestDeleteProject(event, project) {
    event.preventDefault();
    event.stopPropagation();

    setPendingDelete({
      type: "project",
      project,
    });
  }

  function requestDeleteBoard(event, project, board) {
    event.preventDefault();
    event.stopPropagation();

    setPendingDelete({
      type: "board",
      project,
      board,
    });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    setIsDeleting(true);

    try {
      if (pendingDelete.type === "project") {
        const { project } = pendingDelete;

        await deleteProject(project.id);

        if (boardState.projectId === project.id) {
          setBoardState({
            type: "general",
            projectId: null,
            boardId: null,
            justTaskId: null,
            title: "All Tasks",
            focusedTaskId: null,
          });
        }
      } else {
        const { project, board } = pendingDelete;

        await deleteBoard(project.id, board.id);

        if (boardState.boardId === board.id) {
          setBoardState({
            type: "general",
            projectId: null,
            boardId: null,
            justTaskId: null,
            title: "All Tasks",
            focusedTaskId: null,
          });
        }
      }

      setPendingDelete(null);
    } catch {
      // The store already exposes the backend error.
    } finally {
      setIsDeleting(false);
    }
  }

  async function moveToJustTasks(project, board) {
    try {
      const movedBoard = await moveBoardToJustTasks(project.id, board.id);
      await Promise.all([loadProjects(), loadJustTaskBoards()]);

      if (
        boardState.type === "board" &&
        Number(boardState.boardId) === Number(board.id)
      ) {
        setBoardState({
          type: "just-tasks",
          projectId: null,
          boardId: null,
          justTaskId: movedBoard.id,
          title: movedBoard.name,
          focusedTaskId: null,
        });
      }
    } catch {
      // The project store exposes the backend error below the project list.
    }
  }

  const deletingProject = pendingDelete?.type === "project";
  const deleteTargetName = deletingProject
    ? pendingDelete?.project.name
    : pendingDelete?.board.name;

  return (
    <SidebarGroup className="pt-3 pb-4 group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Projects</SidebarGroupLabel>

      <SidebarGroupAction
        type="button"
        title="Create project"
        aria-label="Create project"
        onClick={beginCreatingProject}
      >
        <PlusIcon />
      </SidebarGroupAction>

      <SidebarMenu className="gap-2">
        {isCreatingProject && (
          <SidebarMenuItem className="mb-2">
            <form onSubmit={handleCreateProject}>
              <Input
                autoFocus
                type="text"
                value={projectName}
                placeholder="Project name"
                onChange={(event) => setProjectName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setProjectName("");
                    setIsCreatingProject(false);
                    clearError();
                  }
                }}
                className="h-8 px-2 text-sm"
              />
            </form>
          </SidebarMenuItem>
        )}

        {projects.map((project) => (
          <Collapsible
            key={project.id}
            asChild
            open={navOpenItems[`project:${project.id}`] ?? true}
            onOpenChange={(open) =>
              onNavItemOpenChange?.(`project:${project.id}`, open)
            }
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  tooltip={project.name}
                  isActive={
                    boardState.type === "board" &&
                    boardState.projectId === project.id
                  }
                  className="h-9 pr-14 data-[active=true]:bg-orange-50! data-[active=true]:text-orange-600! data-[active=true]:hover:bg-orange-50! data-[active=true]:hover:text-orange-600! dark:data-[active=true]:bg-orange-950/40! dark:data-[active=true]:text-orange-300! dark:data-[active=true]:hover:bg-orange-950/40! dark:data-[active=true]:hover:text-orange-300!"
                >
                  <ChevronRightIcon className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  <span>{project.name}</span>
                </SidebarMenuButton>
              </CollapsibleTrigger>

              <SidebarMenuAction
                type="button"
                showOnHover
                className="right-7"
                title={`Create board in ${project.name}`}
                aria-label={`Create board in ${project.name}`}
                onClick={(event) => beginCreatingBoard(event, project.id)}
              >
                <PlusIcon />
              </SidebarMenuAction>

              <SidebarMenuAction
                type="button"
                showOnHover
                title={`Delete ${project.name}`}
                aria-label={`Delete ${project.name}`}
                className="text-destructive hover:text-destructive"
                onClick={(event) => requestDeleteProject(event, project)}
              >
                <Trash2Icon />
              </SidebarMenuAction>

              <CollapsibleContent>
                <SidebarMenuSub className="mx-2 gap-1 py-1 pr-0 pl-3">
                  {project.boards.map((board) => (
                    <SidebarMenuSubItem
                      key={board.id}
                      className="group/board"
                    >
                      <ProjectBoardMoveMenu
                        onMove={() => moveToJustTasks(project, board)}
                      >
                        <SidebarMenuSubButton
                          href="#"
                          className="pr-7 data-[active=true]:bg-orange-50! data-[active=true]:text-orange-600! data-[active=true]:hover:bg-orange-50! data-[active=true]:hover:text-orange-600! dark:data-[active=true]:bg-orange-950/40! dark:data-[active=true]:text-orange-300! dark:data-[active=true]:hover:bg-orange-950/40! dark:data-[active=true]:hover:text-orange-300!"
                          isActive={
                            boardState.type === "board" &&
                            boardState.boardId === board.id
                          }
                          onClick={(event) =>
                            handleBoardClick(event, project, board)
                          }
                        >
                          <span>{board.name}</span>
                        </SidebarMenuSubButton>
                      </ProjectBoardMoveMenu>

                      <button
                        type="button"
                        title={`Delete ${board.name}`}
                        aria-label={`Delete ${board.name}`}
                        className="absolute right-1 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-destructive opacity-0 transition-opacity hover:bg-sidebar-accent group-hover/board:opacity-100 focus-visible:opacity-100"
                        onClick={(event) =>
                          requestDeleteBoard(event, project, board)
                        }
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    </SidebarMenuSubItem>
                  ))}

                  {creatingBoardFor === project.id && (
                    <SidebarMenuSubItem>
                      <form
                        onSubmit={(event) =>
                          handleCreateBoard(event, project.id)
                        }
                      >
                        <Input
                          autoFocus
                          type="text"
                          value={boardName}
                          placeholder="Board name"
                          onChange={(event) => setBoardName(event.target.value)}
                          onBlur={() => {
                            setBoardName("");
                            setCreatingBoardFor(null);
                            clearError();
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              setBoardName("");
                              setCreatingBoardFor(null);
                              clearError();
                            }
                          }}
                          className="h-7 px-2 text-xs md:text-xs"
                        />
                      </form>
                    </SidebarMenuSubItem>
                  )}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>

      {error && <p className="mt-2 px-2 text-xs text-destructive">{error}</p>}

      <TrashConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={deletingProject ? "Delete this project?" : "Delete this board?"}
        description={`"${deleteTargetName ?? "Untitled"}" will be removed. Any tasks inside it will be moved to Trash.`}
        confirmLabel={deletingProject ? "Delete project" : "Delete board"}
        onConfirm={confirmDelete}
        isConfirming={isDeleting}
      />
    </SidebarGroup>
  );
}
