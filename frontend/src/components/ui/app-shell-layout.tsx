import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "./app-shell-layout.module.css";

export type AppShellLayoutProps = ComponentPropsWithoutRef<"div"> & {
  sidebar?: ReactNode;
  navbar: ReactNode;
  footer?: ReactNode;
  contentAs?: "div" | "main";
  contentId?: string;
  navigationId?: string;
  mobileMenuOpen?: boolean;
  layout?: "responsive" | "desktop" | "mobile";
};

/** Floating sidebar on the left; page navbar and content in the right column. */
export function AppShellLayout({
  sidebar,
  navbar,
  footer,
  contentAs: Content = "div",
  contentId,
  children,
  navigationId,
  mobileMenuOpen = false,
  layout = "responsive",
  className,
  ...props
}: AppShellLayoutProps) {
  return (
    <div
      {...props}
      className={[styles.shell, className].filter(Boolean).join(" ")}
      data-layout={layout}
      data-sidebar={sidebar ? "true" : undefined}
      data-menu-open={mobileMenuOpen ? "true" : undefined}
    >
      {sidebar && <div id={navigationId} className={styles.navigation}>{sidebar}</div>}
      <div className={styles.column}>
        <div className={styles.navbar}>{navbar}</div>
        <Content id={contentId} tabIndex={Content === "main" ? -1 : undefined} className={styles.content}>
          <div className={styles.contentBody}>
            <div className={styles.page}>{children}</div>
            {footer}
          </div>
        </Content>
      </div>
    </div>
  );
}
