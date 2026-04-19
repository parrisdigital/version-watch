const filters = ["breaking", "api", "model", "pricing", "security", "deployments"];

export function FilterBar() {
  return (
    <div className="flex flex-wrap gap-3">
      {filters.map((filter) => (
        <span
          key={filter}
          className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-400"
        >
          {filter}
        </span>
      ))}
    </div>
  );
}
