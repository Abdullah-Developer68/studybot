import defaultProfile from "./img/defaultProfile.webp";
import openAiLogo from "./img/OpenAI logo.svg";
import nerdbot from "./img/nerdbot.png";

export const assets = {
  defaultProfile,
  openAiLogo,
  nerdbot,
} as const;

export type AssetKey = keyof typeof assets;
export type Assets = typeof assets;
