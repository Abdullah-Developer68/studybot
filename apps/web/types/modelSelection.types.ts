export type ModelProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "meta"
  | "deepseek"
  | "zai";

export type ModelCapability = "vision" | "reasoning" | "tools" | "image";

export type ModelOption = {
  id: string;
  label: string;
  provider: ModelProviderId;
  providerLabel: string;
  description: string;
  priceLabel: string;
  highlighted?: boolean;
  capabilities: ModelCapability[];
};

type ModelSelectionActions = {
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
  setMenuOpen: (isOpen: boolean) => void;
  selectModel: (modelId: string) => void;
};

export type ModelSelectionStoreTypes = {
  isOpen: boolean;
  selectedModelId: string;
  actions: ModelSelectionActions;
};
