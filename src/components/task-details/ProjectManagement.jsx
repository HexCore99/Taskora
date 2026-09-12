import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FolderIcon,
  ListTodoIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function findBoardLocation(boardId, projects) {
  if (boardId == null) return null;

  for (const project of projects) {
    const board = (project.boards ?? []).find(
      (candidate) => Number(candidate.id) === Number(boardId),
    );

    if (board) return { board, project };
  }

  return null;
}

function findJustTaskBoard(justTaskId, justTaskBoards) {
  if (justTaskId == null) return null;

  return justTaskBoards.find(
    (board) => Number(board.id) === Number(justTaskId),
  );
}

function getDestinationValue(destination) {
  if (destination.just_task_id != null) {
    return `just:${destination.just_task_id}`;
  }

  if (destination.board_id != null) {
    return `board:${destination.board_id}`;
  }

  return "none";
}

export default function ProjectManagement({
  destination,
  projects = [],
  justTaskBoards = [],
  onChange,
  onOpenChange,
}) {
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const boardLocation = findBoardLocation(destination.board_id, projects);
  const justTaskBoard = findJustTaskBoard(
    destination.just_task_id,
    justTaskBoards,
  );
  const selectedLabel = boardLocation
    ? `${boardLocation.project.name} / ${boardLocation.board.name}`
    : justTaskBoard
      ? `JustTasks / ${justTaskBoard.name}`
      : destination.just_task_id != null
        ? "Unknown JustTask"
        : "No Project";

  function handleOpenChange(open) {
    if (!open) setExpandedProjectId(null);
    onOpenChange?.(open);
  }

  function handleProjectSelect(event, projectId) {
    event.preventDefault();
    setExpandedProjectId((currentId) =>
      currentId === projectId ? null : projectId,
    );
  }

  function selectDestination(value) {
    if (value === "none") {
      onChange({ board_id: null, just_task: false, just_task_id: null });
      return;
    }

    const [type, id] = value.split(":");
    const destinationId = Number(id);

    if (type === "board") {
      onChange({
        board_id: destinationId,
        just_task: false,
        just_task_id: null,
      });
    } else if (type === "just") {
      onChange({
        board_id: null,
        just_task: true,
        just_task_id: destinationId,
      });
    }
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Change project. Current: ${selectedLabel}`}
          className="group inline-flex h-8 min-w-40 max-w-56 items-center gap-2 rounded-lg px-2.5 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/30 data-[state=open]:bg-muted"
        >
          <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">{selectedLabel}</span>
          <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        data-task-details-popup
        align="end"
        sideOffset={6}
        className="w-64 min-w-64 rounded-xl p-1.5"
      >
        <DropdownMenuRadioGroup
          value={getDestinationValue(destination)}
          onValueChange={selectDestination}
        >
          <DropdownMenuRadioItem
            value="none"
            className="cursor-pointer rounded-lg px-2.5 py-2.5"
          >
            <FolderIcon className="size-4 text-muted-foreground" />
            <span>No Project</span>
          </DropdownMenuRadioItem>

          {projects.length > 0 && <DropdownMenuSeparator />}

          {projects.map((project) => {
            const isExpanded = expandedProjectId === project.id;

            return (
              <div key={project.id}>
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg px-2.5 py-2.5 font-medium"
                  onSelect={(event) => handleProjectSelect(event, project.id)}
                >
                  <ChevronRight
                    className={`size-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                  <span className="truncate">{project.name}</span>
                </DropdownMenuItem>

                {isExpanded && (
                  <div className="ml-4 border-l border-border pl-1">
                    {(project.boards ?? []).length > 0 ? (
                      project.boards.map((board) => (
                        <DropdownMenuRadioItem
                          key={board.id}
                          value={`board:${board.id}`}
                          className="cursor-pointer rounded-lg py-2.5 pl-3"
                        >
                          <span className="truncate">{board.name}</span>
                        </DropdownMenuRadioItem>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-xs text-muted-foreground">
                        No boards yet
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="px-2.5 pb-1 pt-2">
            JustTasks
          </DropdownMenuLabel>

          {justTaskBoards.length > 0 ? (
            justTaskBoards.map((board) => (
              <DropdownMenuRadioItem
                key={board.id}
                value={`just:${board.id}`}
                className="cursor-pointer rounded-lg px-2.5 py-2.5"
              >
                <ListTodoIcon className="size-4 text-muted-foreground" />
                <span className="truncate">{board.name}</span>
              </DropdownMenuRadioItem>
            ))
          ) : (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">
              No JustTasks yet
            </p>
          )}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
