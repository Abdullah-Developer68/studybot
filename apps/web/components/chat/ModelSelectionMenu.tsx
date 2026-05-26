"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Brain,
  Check,
  Eye,
  Filter,
  ImageIcon,
  Info,
  Puzzle,
  Search,
  Sparkles,
  Star,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { assets } from "@studybot/assets";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroupButton } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { useModelSelectionStore } from "@/stores/modelSelectionStore";
import type {
  ModelCapability,
  ModelOption,
  ModelProviderId,
} from "@/types/modelSelection";

const modelOptions: ModelOption[] = [
  {
    id: "openai/gpt-5.5",
    label: "GPT-5.5",
    provider: "openai",
    providerLabel: "OpenAI",
    description: "OpenAI's latest and greatest model",
    priceLabel: "$$$",
    highlighted: true,
    capabilities: ["vision", "reasoning", "tools"],
  },
  {
    id: "openai/gpt-5.4",
    label: "GPT-5.4",
    provider: "openai",
    providerLabel: "OpenAI",
    description: "Fast OpenAI model for everyday chat and tools",
    priceLabel: "$$$",
    highlighted: true,
    capabilities: ["vision", "reasoning", "tools"],
  },
  {
    id: "openai/gpt-imagegen-2",
    label: "GPT ImageGen 2",
    provider: "openai",
    providerLabel: "OpenAI",
    description: "OpenAI image generation model",
    priceLabel: "$$$",
    capabilities: ["vision", "image", "tools"],
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o mini",
    provider: "openai",
    providerLabel: "OpenAI",
    description: "Small, fast model for low-cost chat",
    priceLabel: "$$",
    capabilities: ["vision", "tools"],
  },
  {
    id: "anthropic/claude-3.5-haiku",
    label: "Claude 3.5 Haiku",
    provider: "anthropic",
    providerLabel: "Anthropic",
    description: "Quick Claude model for concise answers",
    priceLabel: "$$",
    capabilities: ["reasoning", "tools"],
  },
  {
    id: "google/gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    provider: "google",
    providerLabel: "Google",
    description: "Fast multimodal Gemini model",
    priceLabel: "$$",
    capabilities: ["vision", "reasoning", "tools"],
  },
  {
    id: "meta/llama-3.3-70b",
    label: "Llama 3.3 70B",
    provider: "meta",
    providerLabel: "Meta",
    description: "Open-weight model for general reasoning",
    priceLabel: "$$",
    capabilities: ["reasoning", "tools"],
  },
  {
    id: "deepseek/deepseek-r1",
    label: "DeepSeek R1",
    provider: "deepseek",
    providerLabel: "DeepSeek",
    description: "Reasoning-focused model for hard problems",
    priceLabel: "$",
    capabilities: ["reasoning"],
  },
  {
    id: "z-ai/glm-4.5-air:free",
    label: "GLM 4.5 Air",
    provider: "zai",
    providerLabel: "Z.ai",
    description: "Free fast model for everyday study help",
    priceLabel: "Free",
    highlighted: true,
    capabilities: ["reasoning", "tools"],
  },
];

const providers: Array<{
  id: ModelProviderId | "all";
  label: string;
  railLabel: string;
}> = [
  { id: "all", label: "All providers", railLabel: "★" },
  { id: "openai", label: "OpenAI", railLabel: "" },
  { id: "anthropic", label: "Anthropic", railLabel: "AI" },
  { id: "google", label: "Google", railLabel: "✦" },
  { id: "meta", label: "Meta", railLabel: "∞" },
  { id: "deepseek", label: "DeepSeek", railLabel: "DS" },
  { id: "zai", label: "Z.ai", railLabel: "Z" },
];

const capabilityIcons: Record<ModelCapability, { icon: LucideIcon; label: string }> = {
  vision: { icon: Eye, label: "Vision" },
  reasoning: { icon: Brain, label: "Reasoning" },
  tools: { icon: Puzzle, label: "Tools" },
  image: { icon: ImageIcon, label: "Image" },
};

const providerAccent: Record<ModelProviderId, string> = {
  openai: "text-emerald-300 bg-emerald-500/10 border-emerald-400/15",
  anthropic: "text-orange-300 bg-orange-500/10 border-orange-400/15",
  google: "text-sky-300 bg-sky-500/10 border-sky-400/15",
  meta: "text-blue-300 bg-blue-500/10 border-blue-400/15",
  deepseek: "text-purple-300 bg-purple-500/10 border-purple-400/15",
  zai: "text-pink-300 bg-pink-500/10 border-pink-400/15",
};

const ProviderMark = ({
  provider,
  className,
}: {
  provider: ModelProviderId;
  className?: string;
}) => {
  if (provider === "openai") {
    return (
      <Image
        src={assets.openAiLogo}
        alt="OpenAI"
        width={18}
        height={18}
        className={cn("h-4.5 w-4.5 invert", className)}
      />
    );
  }

  const providerLabel = providers.find((item) => item.id === provider)?.railLabel;

  return (
    <span
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold",
        providerAccent[provider],
        className,
      )}
    >
      {providerLabel}
    </span>
  );
};

const ModelSelectionMenu = () => {
  const [query, setQuery] = useState("");
  const [activeProvider, setActiveProvider] = useState<ModelProviderId | "all">(
    "all",
  );
  const isOpen = useModelSelectionStore((state) => state.isOpen);
  const selectedModelId = useModelSelectionStore(
    (state) => state.selectedModelId,
  );
  const setMenuOpen = useModelSelectionStore(
    (state) => state.actions.setMenuOpen,
  );
  const selectModel = useModelSelectionStore(
    (state) => state.actions.selectModel,
  );

  const selectedModel =
    modelOptions.find((model) => model.id === selectedModelId) ?? modelOptions[0];

  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return modelOptions.filter((model) => {
      const matchesProvider =
        activeProvider === "all" || model.provider === activeProvider;
      const matchesQuery =
        !normalizedQuery ||
        model.label.toLowerCase().includes(normalizedQuery) ||
        model.providerLabel.toLowerCase().includes(normalizedQuery) ||
        model.description.toLowerCase().includes(normalizedQuery);

      return matchesProvider && matchesQuery;
    });
  }, [activeProvider, query]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <InputGroupButton
          type="button"
          variant="ghost"
          className="min-w-40 justify-between rounded-full px-3"
        >
          <span className="flex min-w-0 items-center gap-2">
            <ProviderMark provider={selectedModel.provider} />
            <span className="truncate text-sm font-medium">
              {selectedModel.label}
            </span>
          </span>
          <ChevronDown
            size={14}
            className={cn(
              "shrink-0 opacity-70 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </InputGroupButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={12}
        className="w-[min(36rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border-zinc-800 bg-zinc-950/95 p-0 text-zinc-100 shadow-2xl shadow-black/60 backdrop-blur-xl"
      >
        <div className="border-b border-zinc-900 bg-[radial-gradient(circle_at_18%_0%,rgba(236,72,153,0.17),transparent_32%),linear-gradient(180deg,rgba(63,63,70,0.24),transparent)] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Choose a model</p>
              <p className="text-xs text-zinc-500">
                Switch providers based on speed, reasoning, and cost.
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-pink-400/25 bg-pink-500/15 px-3 py-2 text-xs font-semibold text-pink-100 hover:bg-pink-500/25"
            >
              Upgrade
            </button>
          </div>
        </div>

        <div className="flex max-h-112 min-h-96">
          <div className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-zinc-900 bg-black/20 py-4">
            {providers.map((provider) => {
              const isActive = activeProvider === provider.id;

              return (
                <button
                  key={provider.id}
                  type="button"
                  title={provider.label}
                  onClick={() => setActiveProvider(provider.id)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-white",
                    isActive && "bg-zinc-900 text-white shadow-inner",
                  )}
                >
                  {provider.id === "openai" ? (
                    <ProviderMark provider="openai" />
                  ) : (
                    provider.railLabel
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-3 border-b border-zinc-900 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
                placeholder="Search models..."
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
              />
              <Filter className="h-4 w-4 shrink-0 text-zinc-500" />
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {filteredModels.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-zinc-500">
                  <Sparkles className="h-5 w-5" />
                  <p>No models match your search.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredModels.map((model) => {
                    const isSelected = model.id === selectedModel.id;

                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => selectModel(model.id)}
                        className={cn(
                          "group grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-zinc-900/80",
                          isSelected && "bg-zinc-900/95 ring-1 ring-white/10",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="flex min-w-0 items-center gap-2">
                            <ProviderMark provider={model.provider} />
                            <span
                              className={cn(
                                "truncate text-base font-bold text-zinc-200 group-hover:text-white",
                                isSelected && "text-white",
                              )}
                            >
                              {model.label}
                            </span>
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                model.priceLabel === "Free"
                                  ? "text-emerald-300"
                                  : "text-pink-300/80",
                              )}
                            >
                              {model.priceLabel}
                            </span>
                            {model.highlighted ? (
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ) : (
                              <Star className="h-4 w-4 text-zinc-600" />
                            )}
                          </span>
                          <span className="mt-1 block truncate text-sm text-zinc-500">
                            {model.description}
                          </span>
                        </span>

                        <span className="flex items-center gap-2">
                          <span className="hidden items-center gap-1 rounded-full bg-zinc-900 px-2 py-1 sm:flex">
                            {model.capabilities.map((capability) => {
                              const CapabilityIcon = capabilityIcons[capability].icon;

                              return (
                                <CapabilityIcon
                                  key={capability}
                                  aria-label={capabilityIcons[capability].label}
                                  className="h-3.5 w-3.5 text-violet-300"
                                />
                              );
                            })}
                          </span>
                          {isSelected ? (
                            <Check className="h-4 w-4 text-emerald-300" />
                          ) : (
                            <Info className="h-4 w-4 text-zinc-600" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { modelOptions };
export default ModelSelectionMenu;
