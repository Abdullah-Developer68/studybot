import { z } from "zod";

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

// Providers the model selection menu can list.
const ModelProviderIdSchema = z.enum([
  "openai",
  "anthropic",
  "google",
  "meta",
  "deepseek",
  "zai",
  "cohere",
]);

// Capability badges shown on a model option.
const ModelCapabilitySchema = z.enum(["vision", "reasoning", "tools", "image"]);

// A single selectable model in the menu.
const ModelOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  provider: ModelProviderIdSchema,
  providerLabel: z.string(),
  description: z.string(),
  priceLabel: z.string(),
  highlighted: z.boolean().optional(),
  capabilities: z.array(ModelCapabilitySchema),
});

// Types are inferred from the schemas so compile-time types and runtime
// validation can never drift apart.
type ModelProviderId = z.infer<typeof ModelProviderIdSchema>;
type ModelCapability = z.infer<typeof ModelCapabilitySchema>;
type ModelOption = z.infer<typeof ModelOptionSchema>;

export { ModelProviderIdSchema, ModelCapabilitySchema, ModelOptionSchema };
export type {
  ModelProviderId,
  ModelCapability,
  ModelOption,
  ModelSelectionStoreTypes,
};
