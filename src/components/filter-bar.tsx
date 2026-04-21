const filters = ["breaking", "api", "model", "pricing", "security", "deployments"];

export function FilterBar() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {filters.map((filter) => (
        <span key={filter} className="vw-tag vw-tag-mono">
          {filter}
        </span>
      ))}
    </div>
  );
}
