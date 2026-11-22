"use client";

import { useSyncExternalStore, type ReactNode } from "react";

export interface NavBarOverride {
  pathname: string;
  title?: string;
  truncateTitle?: boolean;
  hideSearch?: boolean;
  actions?: ReactNode;
  mobileActions?: ReactNode;
}

let currentOverride: NavBarOverride | null = null;
const listeners = new Set<() => void>();

export function setNavBarOverride(next: NavBarOverride | null) {
  currentOverride = next;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return currentOverride;
}

function getServerSnapshot() {
  return null;
}

export function useNavBarOverride(pathname: string): NavBarOverride | null {
  const override = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!override || override.pathname !== pathname) {
    return null;
  }
  return override;
}
