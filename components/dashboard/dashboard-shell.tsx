"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import {
  ChartBar,
  Users,
  Heartbeat,
  Moon,
  Sun,
  UserPlus,
  HourglassMedium,
  ShieldWarning,
} from "@phosphor-icons/react";
import { UserMenu } from "@/components/auth/user-menu";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: ChartBar },
  { href: "/dashboard/patients", label: "Patients", icon: Users },
  { href: "/dashboard/alerts", label: "Alert Center", icon: ShieldWarning },
  { href: "/dashboard/add-patient", label: "Add Patient", icon: UserPlus },
  { href: "/dashboard/ongoing", label: "Ongoing", icon: HourglassMedium },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center gap-2 px-2 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Heartbeat size={18} weight="bold" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">MedGraph AI</p>
              <p className="text-[10px] text-muted-foreground">Hospital Intelligence</p>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
                      <Link href={item.href}>
                        <item.icon size={18} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <UserMenu />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* Top bar */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.href} className="contents">
                  {i > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {i === breadcrumbs.length - 1 ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </span>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun size={16} className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon size={16} className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <div
          className="flex-1 min-h-0 overflow-y-auto
            [&::-webkit-scrollbar]:w-2
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-border"
        >
          <main className="p-4 lg:p-6">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function buildBreadcrumbs(pathname: string) {
  const crumbs = [{ href: "/dashboard", label: "Dashboard" }];
  if (pathname.startsWith("/dashboard/patients")) {
    crumbs.push({ href: "/dashboard/patients", label: "Patients" });
    const match = pathname.match(/\/dashboard\/patients\/(.+)/);
    if (match) {
      crumbs.push({ href: pathname, label: match[1] });
    }
  } else if (pathname.startsWith("/dashboard/alerts")) {
    crumbs.push({ href: "/dashboard/alerts", label: "Alert Center" });
  } else if (pathname.startsWith("/dashboard/add-patient")) {
    crumbs.push({ href: "/dashboard/add-patient", label: "Add Patient" });
  } else if (pathname.startsWith("/dashboard/ongoing")) {
    crumbs.push({ href: "/dashboard/ongoing", label: "Ongoing Patients" });
  }
  return crumbs;
}
