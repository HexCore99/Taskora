import { PlusIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function createNote(text) {
  const generatedId =
    globalThis.crypto?.randomUUID?.() ??
    String(Date.now()) + "-" + String(Math.random());

  return {
    id: generatedId,
    text,
    completed: false,
  };
}

function NoteItem({ note, onToggle, onTextChange, onRemove }) {
  return (
    <div className="group flex items-center gap-3">
      <input
        type="checkbox"
        checked={note.completed}
        aria-label={"Mark " + note.text + " complete"}
        className="size-4 accent-orange-500"
        onChange={() => onToggle(note.id)}
      />
      <input
        type="text"
        value={note.text}
        aria-label="Note text"
        className={
          "min-w-0 flex-1 border-0 bg-transparent py-1 text-sm outline-none " +
          (note.completed ? "text-muted-foreground/60 line-through" : "text-foreground")
        }
        onChange={(event) => onTextChange(note.id, event.target.value)}
      />
      <button
        type="button"
        title="Remove note"
        aria-label={"Remove " + note.text}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 group-hover:opacity-100 focus-visible:opacity-100"
        onClick={() => onRemove(note.id)}
      >
        <XIcon size={15} />
      </button>
    </div>
  );
}

export default function TaskNotes({ notes, onChange }) {
  const newNoteInputRef = useRef(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    if (!isAdding) return undefined;

    function handleOutsideClick(event) {
      if (newNoteInputRef.current?.contains(event.target)) return;

      setNewNote("");
      setIsAdding(false);
    }

    document.addEventListener("click", handleOutsideClick);
    return () =>
      document.removeEventListener("click", handleOutsideClick);
  }, [isAdding]);

  function addNote() {
    const text = newNote.trim();
    if (!text) return;

    onChange([...notes, createNote(text)]);
    setNewNote("");
    setIsAdding(false);
  }

  function toggleNote(noteId) {
    onChange(
      notes.map((note) =>
        note.id === noteId ? { ...note, completed: !note.completed } : note,
      ),
    );
  }

  function updateNoteText(noteId, text) {
    onChange(
      notes.map((note) => (note.id === noteId ? { ...note, text } : note)),
    );
  }

  function removeNote(noteId) {
    onChange(notes.filter((note) => note.id !== noteId));
  }

  function handleNotesClick(event) {
    event.stopPropagation();

    if (isAdding && !newNoteInputRef.current?.contains(event.target)) {
      setNewNote("");
      setIsAdding(false);
    }
  }

  return (
    <section onClick={handleNotesClick}>
      <h3 className="mb-2 text-sm font-medium text-foreground">Notes</h3>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              onToggle={toggleNote}
              onTextChange={updateNoteText}
              onRemove={removeNote}
            />
          ))}
        </div>

        {notes.length === 0 && !isAdding && (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        )}

        {isAdding && (
          <div className="mt-3 flex items-center gap-2">
            <input
              ref={newNoteInputRef}
              autoFocus
              type="text"
              value={newNote}
              placeholder="Write a note"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-950"
              onChange={(event) => setNewNote(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addNote();
                if (event.key === "Escape") {
                  setNewNote("");
                  setIsAdding(false);
                }
              }}
            />
            <button
              type="button"
              className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
              onClick={addNote}
            >
              Add
            </button>
          </div>
        )}

        {!isAdding && (
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700"
            onClick={() => setIsAdding(true)}
          >
            <PlusIcon size={16} />
            Add note
          </button>
        )}
      </div>
    </section>
  );
}
