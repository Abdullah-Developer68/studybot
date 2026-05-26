import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ControlPanelTypes } from "../types/controlPanel.types";

export const useControlPanelStore = create<ControlPanelTypes>()(
  persist(
    (set) => ({
      expanded: false,
      actions: {
        expandPanel: () => set({ expanded: true }),
        collapsePanel: () => set({ expanded: false }),
      },
    }),
    {
      name: "controlPanel",
      partialize: (state) => ({ expanded: state.expanded }),
    },
  ),
);

// Custom hooks for easier access to actions and states

export const useIsPanelExpanded = () =>
  useControlPanelStore((state) => state.expanded);

export const useControlPanelActions = () =>
  useControlPanelStore((state) => state.actions);
