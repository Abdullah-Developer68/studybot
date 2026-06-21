import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ModelSelectionStoreTypes } from "../types/modelSelection.types";

const DEFAULT_MODEL_ID = "poolside/laguna-xs.2:free";

// Must match the model list in ModelSelectionMenu.tsx and supportedModels
// in the chat edge function. Used to validate persisted localStorage state.
const MODEL_IDS = [
  "openai/gpt-5.5",
  "openai/gpt-5.4",
  "openai/gpt-imagegen-2",
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-haiku",
  "google/gemini-2.0-flash",
  "meta/llama-3.3-70b",
  "deepseek/deepseek-r1",
  DEFAULT_MODEL_ID,
] as const;

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
      version: 2,
      // Drop any persisted model id that no longer exists in the current
      // model list (e.g. the retired "z-ai/glm-4.5-air:free") so the store
      // falls back to DEFAULT_MODEL_ID instead of sending a dead slug.
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<typeof current>) };
        const validModelIds = new Set<string>(MODEL_IDS);
        if (
          merged.selectedModelId &&
          !validModelIds.has(merged.selectedModelId)
        ) {
          merged.selectedModelId = DEFAULT_MODEL_ID;
        }
        return merged;
      },
      partialize: (state) => ({ selectedModelId: state.selectedModelId }),
    },
  ),
);
