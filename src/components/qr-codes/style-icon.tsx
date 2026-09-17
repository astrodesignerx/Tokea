/** Tiny pictures for the dot and corner style choices. Decorative only. */
export function StyleIcon({
  kind,
  variant,
}: {
  kind: "dot" | "corner" | "density";
  variant: string;
}) {
  if (kind === "density") {
    // A fine checker for detailed, a coarse one for compact.
    const n = variant === "compact" ? 2 : 4;
    const cell = 14 / n;
    const cells = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if ((r + c) % 2 !== 0) continue;
        cells.push(
          <rect
            key={`${r}-${c}`}
            x={1 + c * cell}
            y={1 + r * cell}
            width={cell - 0.8}
            height={cell - 0.8}
            fill="currentColor"
          />
        );
      }
    }
    return (
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
        {cells}
      </svg>
    );
  }

  if (kind === "corner") {
    const outer =
      variant === "circle" ? (
        <>
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="8" cy="8" r="2.6" fill="currentColor" />
        </>
      ) : (
        <>
          <rect
            x="1.5"
            y="1.5"
            width="13"
            height="13"
            rx={variant === "rounded" ? 4 : 0}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <rect x="5.3" y="5.3" width="5.4" height="5.4" rx={variant === "rounded" ? 1.6 : 0} fill="currentColor" />
        </>
      );
    return (
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
        {outer}
      </svg>
    );
  }

  // A 2x2 cluster of modules with the bottom-right one missing.
  const cells = [
    [1, 1],
    [8.5, 1],
    [1, 8.5],
  ];
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      {variant === "rounded" ? (
        <path d="M1 5.5a4.5 4.5 0 0 1 4.5-4.5h9v6.5h-7v7h-3a3.5 3.5 0 0 1-3.5-3.5z" fill="currentColor" />
      ) : (
        cells.map(([x, y]) =>
          variant === "dots" ? (
            <circle key={`${x}-${y}`} cx={x + 3.25} cy={y + 3.25} r="3" fill="currentColor" />
          ) : (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="6.5"
              height="6.5"
              rx={variant === "soft" ? 2 : 0}
              fill="currentColor"
            />
          )
        )
      )}
    </svg>
  );
}
