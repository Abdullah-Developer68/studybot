import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Home, MessageSquare, Settings, LayoutTemplate } from "lucide-react";

const AppSidebar = () => {
  const menuItems = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Chat", icon: MessageSquare, href: "/chat" },
    { label: "Settings", icon: Settings, href: "/settings" },
    { label: "Templates", icon: LayoutTemplate, href: "/templates" },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <h2 className="text-lg font-bold">My App</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild>
                  <a href={item.href}>
                    {/* The Home/Settings etc are not images, but react components form
                    lucide-react so they can be rendered as such.*/}
                    <item.icon />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <p className="text-sm text-gray-500">© 2024 My App</p>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
