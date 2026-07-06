import type { ReactElement } from "react";
import Image from "next/image";
import { assets } from "@studybot/assets/assets";

// Empty-state welcome screen shown when no chat thread is active.
const WelcomeScreen = (): ReactElement => {
  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center text-center gap-12">
        <Image
          src={assets.nerdbot}
          alt="Nerdbot"
          width={320}
          height={320}
          priority
          className="rounded-full"
        />

        <p className="text-2xl md:text-3xl font-bold font-proxima">
          Hello! How can I help you today?
        </p>
      </div>
    </div>
  );
};

export default WelcomeScreen;
