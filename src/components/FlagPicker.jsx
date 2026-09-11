import { memo, useState } from "react";
import { Flag as FlagIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTaskStore } from "@/stores/useTaskStore";

const priorities = [
  { value: "1", label: "Urgent", color: "#dc4c3e", filled: true },
  { value: "2", label: "High", color: "#f59e0b", filled: true },
  { value: "3", label: "Medium", color: "#2563eb", filled: true },
  { value: "4", label: "Low", color: "#6b7280", filled: false },
];

function PriorityFlag({ priority, size = 16 }) {
  return (
    <FlagIcon
      size={size}
      strokeWidth={1.75}
      stroke={priority.color}
      fill={priority.filled ? priority.color : "none"}
    />
  );
}

const Flag = memo(function Flag({
  taskId,
  taskPriority,
  onChange,
  showLabel = false,
  withinTaskDetails = false,
}) {
  const setPriorityInStore = useTaskStore((state) => state.setPriority);
  const selectedPriority = String(taskPriority ?? 4);
  const priority =
    priorities.find((item) => item.value === selectedPriority) ?? priorities[3];

  function setPriority(p) {
    if (onChange) {
      onChange(Number(p));
      return;
    }

    setPriorityInStore(taskId, p);
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={priority.label}
          aria-label={`Set priority. Current: ${priority.label}`}
          onPointerDown={(event) => event.stopPropagation()}
          className={
            "inline-flex h-7 items-center justify-center gap-2 rounded px-1.5 transition-colors hover:bg-muted " +
            (showLabel ? "text-sm text-foreground" : "w-7")
          }
        >
          <PriorityFlag priority={priority} />
          {showLabel && <span>{priority.label}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-task-details-popup={withinTaskDetails || undefined}
        align="start"
        onPointerDown={(event) => event.stopPropagation()}
        className="w-36 min-w-36 bg-popover p-1"
      >
        <DropdownMenuRadioGroup
          value={selectedPriority}
          onValueChange={setPriority}
        >
          {priorities.map((item) => (
            <DropdownMenuRadioItem
              key={item.value}
              value={item.value}
              className="cursor-pointer gap-2 px-2 py-2 text-sm"
            >
              <PriorityFlag priority={item} size={17} />
              <span>{item.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
export default Flag;
