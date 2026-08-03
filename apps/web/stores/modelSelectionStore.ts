import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import type { ModelSelectionStoreTypes } from "../types/modelSelection.types";

const DEFAULT_MODEL_ID = "cohere/north-mini-code:free";

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

// Schema for the persisted slice of the store (see partialize below).
// z.enum(MODEL_IDS) rejects any model id outside the current list.
const PersistedModelSelectionSchema = z.object({
  selectedModelId: z.enum(MODEL_IDS),
});

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
      // Persisted localStorage state is untrusted: validate it with zod so a
      // stale/retired model id (e.g. "z-ai/glm-4.5-air:free") makes the whole
      // slice fall back to defaults instead of sending a dead slug.
      merge: (persisted, current) => {
        const parsed = PersistedModelSelectionSchema.safeParse(persisted);
        if (!parsed.success) {
          return current;
        }
        return { ...current, selectedModelId: parsed.data.selectedModelId };
      },
      partialize: (state) => ({ selectedModelId: state.selectedModelId }),
    },
  ),
);
