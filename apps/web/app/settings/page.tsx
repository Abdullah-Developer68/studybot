"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, Moon, Sun, User, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { logout } from "@studybot/supabase";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid rendering theme-dependent UI until after hydration so the server
  // and client markup stay in sync.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Signs the user out via Supabase and redirects to the auth page
  const handleLogout = async () => {
    try {
      await logout();
      router.push("/auth");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] w-full bg-zinc-950 px-6 py-8 text-zinc-100 md:min-h-dvh">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-zinc-400">
            Manage your account and app preferences.
          </p>
        </div>

        {/* Appearance */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Appearance
          </h2>
          <p className="mb-4 text-sm text-zinc-400">
            Choose a theme for the StudyBot interface.
          </p>
          <div className="flex flex-wrap gap-2">
            {mounted ? (
              <>
                {[
                  { value: "light", label: "Light", icon: Sun },
                  { value: "dark", label: "Dark", icon: Moon },
                  { value: "system", label: "System", icon: Monitor },
                ].map(({ value, label, icon: Icon }) => {
                  const selected = theme === value;
                  return (
                    <Button
                      key={value}
                      variant="outline"
                      size="sm"
                      onClick={() => setTheme(value)}
                      className={cn(
                        "gap-2 border-zinc-700 hover:bg-zinc-800 hover:text-white",
                        selected
                          ? "bg-white text-zinc-900 hover:bg-zinc-200"
                          : "bg-transparent text-zinc-300",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  );
                })}
              </>
            ) : (
              <div className="h-9 w-48 animate-pulse rounded-md bg-zinc-800" />
            )}
          </div>
        </section>

        {/* Account */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Account
          </h2>
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="default"
              disabled
              className="w-full justify-start gap-2 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              // Profile settings are not wired yet; enable this button once the
              // profile flow is implemented.
            >
              <User className="h-4 w-4" />
              Profile
            </Button>
            <Separator className="bg-zinc-800" />
            <Button
              variant="ghost"
              size="default"
              onClick={handleLogout}
              className="w-full justify-start gap-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
