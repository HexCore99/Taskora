import DatePicker from "@/components/DatePicker";
import FlagPicker from "@/components/FlagPicker";
import ProjectManagement from "./ProjectManagement";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "todo", label: "Todo", color: "bg-orange-500" },
  { value: "in-progress", label: "In Progress", color: "bg-blue-500" },
  { value: "completed", label: "Completed", color: "bg-green-500" },
];

function StatusIndicator({ color }) {
  return (
    <span
      aria-hidden="true"
      className={`size-2.5 shrink-0 rounded-full ${color}`}
    />
  );
}

function StatusPicker({ value, onValueChange, onOpenChange }) {
  const selectedStatus =
    STATUS_OPTIONS.find((option) => option.value === value) ?? STATUS_OPTIONS[0];

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Change status. Current: ${selectedStatus.label}`}
          className="group inline-flex h-8 min-w-32 items-center gap-2 rounded-lg px-2.5 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/30 data-[state=open]:bg-muted"
        >
          <StatusIndicator color={selectedStatus.color} />
          <span>{selectedStatus.label}</span>
          <ChevronDown className="ml-auto size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        data-task-details-popup
        align="end"
        sideOffset={6}
        className="w-44 min-w-44 rounded-xl p-1.5"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2.5 data-[state=checked]:bg-orange-50 data-[state=checked]:text-orange-700 dark:data-[state=checked]:bg-orange-950/40 dark:data-[state=checked]:text-orange-300"
            >
              <StatusIndicator color={option.color} />
              <span>{option.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PropertyRow({ label, children }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1 text-right">{children}</div>
    </div>
  );
}

export default function TaskProperties({
  taskId,
  draft,
  projects = [],
  justTaskBoards = [],
  onPopupOpenChange,
  onChange,
}) {
  return (
    <section
      aria-label="Task properties"
      className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card"
    >
      <PropertyRow label="Project">
        <ProjectManagement
          destination={draft}
          projects={projects}
          justTaskBoards={justTaskBoards}
          onOpenChange={onPopupOpenChange}
          onChange={(destination) => {
            onChange("board_id", destination.board_id);
            onChange("just_task", destination.just_task);
            onChange("just_task_id", destination.just_task_id);
          }}
        />
      </PropertyRow>

      <PropertyRow label="Status">
        <StatusPicker
          value={draft.status}
          onOpenChange={onPopupOpenChange}
          onValueChange={(status) => onChange("status", status)}
        />
      </PropertyRow>

      <PropertyRow label="Due date">
        <DatePicker
          taskId={taskId}
          dueDate={draft.due_date}
          withinTaskDetails
          onOpenChange={onPopupOpenChange}
          onChange={(_taskId, dueDate) => onChange("due_date", dueDate)}
        />
      </PropertyRow>

      <PropertyRow label="Priority">
        <FlagPicker
          taskId={taskId}
          taskPriority={draft.priority}
          withinTaskDetails
          showLabel
          onOpenChange={onPopupOpenChange}
          onChange={(priority) => onChange("priority", priority)}
        />
      </PropertyRow>
    </section>
  );
}
