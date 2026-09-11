export default function TaskDescription({ value, onChange }) {
  return (
    <section>
      <label
        htmlFor="task-details-description"
        className="mb-2 block text-sm font-medium text-foreground"
      >
        Description
      </label>
      <textarea
        id="task-details-description"
        value={value}
        rows={3}
        placeholder="Add a description..."
        className="w-full resize-y rounded-xl border border-border bg-background p-4 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-950"
        onChange={(event) => onChange(event.target.value)}
      />
    </section>
  );
}
