import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ControlPanelTypes } from "../types/controlPanel";

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
