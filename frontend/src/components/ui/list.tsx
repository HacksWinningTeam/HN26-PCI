import type { ComponentPropsWithRef, ReactNode } from "react";

export type ListItem = {
  id: string;
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  layout?: "inline" | "stacked";
};

export type DefinitionListProps = Omit<ComponentPropsWithRef<"dl">, "children"> & {
  items: readonly ListItem[];
  variant?: "default" | "plain";
  columns?: 1 | 2 | 4;
};

const COLUMN_CLASSES: Record<NonNullable<DefinitionListProps["columns"]>, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

/** Semantic key-value definition list supporting row dividers or multi-column metadata grids. */
export function DefinitionList({
  items,
  variant = "default",
  columns = 1,
  className,
  ...props
}: DefinitionListProps) {
  const isGrid = columns > 1;

  return (
    <dl
      {...props}
      className={[
        isGrid
          ? `grid gap-4 ${COLUMN_CLASSES[columns]}`
          : variant === "default"
            ? "divide-y divide-[var(--color-border-subtle)] rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4"
            : "divide-y divide-[var(--color-border-subtle)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={
            isGrid
              ? "space-y-0.5 text-sm"
              : [
                  "text-sm",
                  item.layout === "stacked"
                    ? "space-y-1 py-3"
                    : "flex min-h-[60px] flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2",
                ].join(" ")
          }
        >
          <dt className="text-xs font-medium text-[var(--color-text-muted)]">
            {item.label}
          </dt>
          <dd className="font-semibold text-[var(--color-text)]">{item.value}</dd>
          {item.description !== undefined ? (
            <dd className="w-full text-xs text-[var(--color-text-muted)]">
              {item.description}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
