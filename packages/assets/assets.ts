import defaultProfile from "./defaultProfile.webp";
import openAiLogo from "./OpenAI logo.svg";
import nerdbot from "./nerdbot.webp";

export const assets = {
  defaultProfile,
  openAiLogo,
  nerdbot,
} as const;

export type AssetKey = keyof typeof assets;
export type Assets = typeof assets;
