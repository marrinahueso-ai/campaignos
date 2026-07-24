"use client";

import { createContext, useContext } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

export type DashboardWidgetDragHandle = {
  attributes: DraggableAttributes | Record<string, unknown>;
  listeners: SyntheticListenerMap | undefined;
  disabled: boolean;
  editing: boolean;
};

const DashboardWidgetDragContext =
  createContext<DashboardWidgetDragHandle | null>(null);

export function DashboardWidgetDragProvider({
  value,
  children,
}: {
  value: DashboardWidgetDragHandle;
  children: React.ReactNode;
}) {
  return (
    <DashboardWidgetDragContext.Provider value={value}>
      {children}
    </DashboardWidgetDragContext.Provider>
  );
}

export function useDashboardWidgetDragHandle(): DashboardWidgetDragHandle | null {
  return useContext(DashboardWidgetDragContext);
}
