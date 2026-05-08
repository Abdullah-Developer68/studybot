import bot from "./bot.webp";
import chillGuy from "./chill guy.jpg";
import openAiLogo from "./OpenAI logo.svg";

export const assets = {
  bot,
  chillGuy,
  openAiLogo,
} as const;

export type AssetKey = keyof typeof assets;
export type Assets = typeof assets;
