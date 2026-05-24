import { create } from "zustand";

type TemplateState = {
  openTemplate: boolean;
  newTemplate: boolean;
  createNewTemplate: () => void;
};

export const useTemplateStore = create<TemplateState>((set) => ({
  openTemplate: false,
  newTemplate: false,

  createNewTemplate: () =>
    set((state) => ({ newTemplate: !state.newTemplate })),
}));
