import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs";

export type NavBarProps = {
  title: string;
  breadcrumbs?: readonly BreadcrumbItem[];
  actions?: ReactNode;
  leading?: ReactNode;
  titleAs?: "h1" | "h2" | "h3" | "h4";
};

/** Page context on the left, optional actions on the right. */
export function NavBar({ title, breadcrumbs, actions, leading, titleAs: Title = "h1" }: NavBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-b border-[var(--color-border-subtle)] pb-5 pt-2">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {leading}
        <div className="min-w-0 flex-1 space-y-1">
          {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} size="compact" />}
          <Title className="text-xl font-semibold tracking-tight text-[var(--color-text)] [overflow-wrap:anywhere]">{title}</Title>
        </div>
      </div>
      {actions && <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  );
}
