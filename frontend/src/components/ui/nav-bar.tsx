import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs";
import styles from "./nav-bar.module.css";

export type NavBarProps = {
  title: string;
  truncateTitle?: boolean;
  breadcrumbs?: readonly BreadcrumbItem[];
  actions?: ReactNode;
  mobileActions?: ReactNode;
  search?: ReactNode;
  leading?: ReactNode;
  layout?: "responsive" | "mobile";
  titleAs?: "h1" | "h2" | "h3" | "h4";
};

/** Page context on the left, optional actions on the right. */
export function NavBar({ title, truncateTitle = false, breadcrumbs, actions, mobileActions, search, leading, layout = "responsive", titleAs: Title = "h1" }: NavBarProps) {
  return (
    <div className={styles.bar} data-layout={layout} data-mobile-actions={mobileActions ? "true" : undefined}>
      <div className={styles.layout}>
        <div className={styles.context}>
          {leading}
          <div className={styles.heading}>
            {breadcrumbs && breadcrumbs.length > 0 && <div className={styles.breadcrumbs}><Breadcrumbs items={breadcrumbs} size="compact" /></div>}
            <Title
              className={styles.title}
              data-truncate={truncateTitle ? "true" : undefined}
              title={truncateTitle ? title : undefined}
            >
              {title}
            </Title>
          </div>
        </div>
        {search && <div className={styles.search}>{search}</div>}
        {actions && <div className={styles.actions}>{actions}</div>}
        {mobileActions && <div className={styles.mobileActions}>{mobileActions}</div>}
      </div>
    </div>
  );
}
