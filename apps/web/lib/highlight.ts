// Shared lowlight instance used across the chat. Starts with no languages
// registered — individual grammars are lazy-loaded on demand when a code
// block in that language appears in an AI response. This avoids the ~300ms
// synchronous cost of registering all ~190 highlight.js languages upfront.
import { createLowlight } from "lowlight";

export const lowlight = createLowlight();
