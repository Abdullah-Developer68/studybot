import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ModelSelectionStoreTypes } from "../types/modelSelection";

const DEFAULT_MODEL_ID = "z-ai/glm-4.5-air:free";

export const useModelSelectionStore = create<ModelSelectionStoreTypes>()(
  persist(
    (set) => ({
      isOpen: false,
      selectedModelId: DEFAULT_MODEL_ID,
      actions: {
        openMenu: () => set({ isOpen: true }),
        closeMenu: () => set({ isOpen: false }),
        toggleMenu: () => set((state) => ({ isOpen: !state.isOpen })),
        setMenuOpen: (isOpen) => set({ isOpen }),
        selectModel: (modelId) =>
          set({ selectedModelId: modelId, isOpen: false }),
      },
    }),
    {
      name: "modelSelection",
      partialize: (state) => ({ selectedModelId: state.selectedModelId }),
    },
  ),
);
