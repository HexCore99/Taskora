import { ContextMenu } from "@base-ui/react/context-menu";
import { ChevronRightIcon, FolderIcon, ListTodoIcon } from "lucide-react";

const popupClassName =
  "z-50 min-w-52 rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none";
const itemClassName =
  "flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground";

function Submenu({ children, icon: Icon, label }) {
  return (
    <ContextMenu.SubmenuRoot>
      <ContextMenu.SubmenuTrigger className={itemClassName}>
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </ContextMenu.SubmenuTrigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner
          alignOffset={-4}
          sideOffset={4}
          className="z-50"
        >
          <ContextMenu.Popup className={popupClassName}>
            {children}
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.SubmenuRoot>
  );
}

function ProjectDestinations({ projects, onMove }) {
  if (projects.length === 0) {
    return (
      <p className="px-2.5 py-2 text-xs text-muted-foreground">
        No projects yet
      </p>
    );
  }

  return projects.map((project) => (
    <ContextMenu.Item
      key={project.id}
      className={itemClassName}
      onClick={() => onMove(project)}
    >
      <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{project.name}</span>
    </ContextMenu.Item>
  ));
}

export function JustTaskMoveMenu({ children, projects, onMove }) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="z-50">
          <ContextMenu.Popup className={popupClassName}>
            <Submenu icon={FolderIcon} label="Move to Project">
              <ProjectDestinations projects={projects} onMove={onMove} />
            </Submenu>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

export function ProjectBoardMoveMenu({ children, onMove }) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="z-50">
          <ContextMenu.Popup className={popupClassName}>
            <ContextMenu.Item className={itemClassName} onClick={onMove}>
              <ListTodoIcon className="size-4 shrink-0 text-muted-foreground" />
              <span>Move to JustTasks</span>
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
