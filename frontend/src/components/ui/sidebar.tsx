"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { useTranslations } from "@/i18n/provider";
import { ChevronLeftIcon, ChevronRightIcon, MenuIcon } from "./icons";
import { SidebarUtilities } from "./sidebar-utilities";
export { SidebarUtilities, type SidebarUtilitiesProps } from "./sidebar-utilities";
import styles from "./sidebar.module.css";

export type SidebarItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
  current?: "page" | "location";
} & (
  | { href: string; onSelect?: () => void }
  | { href?: never; onSelect: () => void }
);

export type SidebarProps = {
  label: string;
  brand?: ReactNode;
  mobileSearch?: ReactNode;
  items: readonly SidebarItem[];
  footer?: ReactNode;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  layout?: "responsive" | "mobile";
};

/** Route links in the app, selectable examples in the gallery. */
export function Sidebar({
  label,
  brand = <BrandLogo />,
  mobileSearch,
  items,
  footer,
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  layout = "responsive",
}: SidebarProps) {
  const t = useTranslations();
  const navigationId = useId();
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isCollapsed = collapsed ?? internalCollapsed;
  const toggleLabel = isCollapsed ? t("Expand sidebar") : t("Collapse sidebar");
  const footerContent = footer === undefined ? <SidebarUtilities /> : footer;

  return (
    <div className={styles.panel} data-layout={layout} data-collapsed={isCollapsed ? "true" : undefined}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>{brand}</div>
        {mobileSearch && <div className={styles.mobileSearch}>{mobileSearch}</div>}
        <button type="button" className={styles.collapseButton}
          aria-label={toggleLabel} title={toggleLabel} aria-expanded={!isCollapsed}
          aria-controls={navigationId}
          onClick={() => {
            const next = !isCollapsed;
            if (collapsed === undefined) setInternalCollapsed(next);
            onCollapsedChange?.(next);
          }}>
          {isCollapsed ? <ChevronRightIcon size={20} /> : <ChevronLeftIcon size={20} />}
        </button>
      </div>
      <nav id={navigationId} aria-label={label} className={styles.navigation}>
        <ul className={styles.list}>
          {items.map((item) => {
            const content = (
              <>
                <span className={styles.icon} aria-hidden="true">{item.icon ?? <MenuIcon size={20} />}</span>
                <span className={styles.label}>{item.label}</span>
              </>
            );

            return (
              <li key={item.id}>
                {item.href !== undefined ? (
                  <Link
                    href={item.href}
                    onClick={item.onSelect}
                    aria-current={item.active ? (item.current ?? "page") : undefined}
                    title={isCollapsed ? item.label : undefined}
                    className={styles.item}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={item.onSelect}
                    aria-current={item.active ? (item.current ?? "page") : undefined}
                    title={isCollapsed ? item.label : undefined}
                    className={styles.item}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      {footerContent && <div className={styles.footer}>{footerContent}</div>}
    </div>
  );
}
