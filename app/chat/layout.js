import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/global/AppSidebar";
import { cookies } from "next/headers";

const ChatLayout = async ({ children }) => {
  // This is a feature of next.js that allows to access cookies on the server side during SSR.
  const cookieStore = await cookies();
  // It gets the data from the request headers
  const defaultOpen = cookieStore.get("sidebar-state")?.value === "true";

  return (
    <>
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
    </>
  );
};

export default ChatLayout;
