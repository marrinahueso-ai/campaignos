"use client";

import { createContext, useContext } from "react";

const DashboardWidgetColorContext = createContext<string | null>(null);

export function DashboardWidgetColorProvider({
  color,
  children,
}: {
  color: string | null;
  children: React.ReactNode;
}) {
  return (
    <DashboardWidgetColorContext.Provider value={color}>
      {children}
    </DashboardWidgetColorContext.Provider>
  );
}

export function useDashboardWidgetColor(): string | null {
  return useContext(DashboardWidgetColorContext);
}
