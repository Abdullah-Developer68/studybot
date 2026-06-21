import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ControlPanelTypes } from "../types/controlPanel.types";

export const useControlPanelStore = create<ControlPanelTypes>()(
  persist(
    (set) => ({
      expanded: false,
      settingsMenuOpen: false,
      actions: {
        expandPanel: () => set({ expanded: true }),
        collapsePanel: () => set({ expanded: false }),
        // opens the settings popup menu
        openSettingsMenu: () => set({ settingsMenuOpen: true }),
        // closes the settings popup menu
        closeSettingsMenu: () => set({ settingsMenuOpen: false }),
      },
    }),
    {
      name: "controlPanel",
      // only persist the sidebar expanded state, not the menu open state
      partialize: (state) => ({ expanded: state.expanded }),
    },
  ),
);

// Custom hooks for easier access to actions and states

export const useIsPanelExpanded = () =>
  useControlPanelStore((state) => state.expanded);

export const useIsSettingsMenuOpen = () =>
  useControlPanelStore((state) => state.settingsMenuOpen);

export const useControlPanelActions = () =>
  useControlPanelStore((state) => state.actions);
