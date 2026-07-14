type ModelSelectionActions = {
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
  setMenuOpen: (isOpen: boolean) => void;
  selectModel: (modelId: string) => void;
};

// The ones below are exported

type ModelSelectionStoreTypes = {
  isOpen: boolean;
  selectedModelId: string;
  actions: ModelSelectionActions;
};

type ModelProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "meta"
  | "deepseek"
  | "zai"
  | "cohere";

type ModelCapability = "vision" | "reasoning" | "tools" | "image";

type ModelOption = {
  id: string;
  label: string;
  provider: ModelProviderId;
  providerLabel: string;
  description: string;
  priceLabel: string;
  highlighted?: boolean;
  capabilities: ModelCapability[];
};

export type {
  ModelProviderId,
  ModelCapability,
  ModelOption,
  ModelSelectionStoreTypes,
};
