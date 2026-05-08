import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import ReduxProvider from "@/app/providers/ReduxProvider";
import AuthProvider from "@/app/providers/AuthProvider";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/global/AppSidebar";
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

export default async function RootLayout({ children }) {
  // This is a feature of next.js that allows to access cookies on the server side during SSR.
  const cookieStore = await cookies();
  // It gets the data from the request headers
  const defaultOpen = cookieStore.get("sidebar-state")?.value === "true";

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReduxProvider>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <SidebarProvider defaultOpen={defaultOpen}>
                <span className="absolute z-40">
                  <AppSidebar />
                </span>

                <main className="w-full flex">
                  {/* This is the button to open or close the sidebar */}
                  <SidebarTrigger className="z-50" />
                  {children}
                </main>
              </SidebarProvider>
            </ThemeProvider>
          </AuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
