import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";

import AuthProvider from "@/app/providers/AuthProvider";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import ControlPanel from "@/components/global/ControlPanel";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "StudyBot Chat",
  description: "Chat with StudyBot",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <main className="w-full flex">
              <ControlPanel />
              <div className="flex-1 pt-14 md:pt-0">{children}</div>
            </main>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
