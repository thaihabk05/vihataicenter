"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  BookOpen,
  FileText,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { canManageUsers, canViewAllStats } from "@/lib/permissions";
import type { User } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  visible: boolean;
}

interface SidebarProps {
  user: User;
  onLogout: () => void;
  onNavigate?: () => void;
}

export function Sidebar({ user, onLogout, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const isAdmin = canViewAllStats(user.role);

  const navItems: NavItem[] = [
    {
      label: "Tổng quan",
      href: "/",
      icon: LayoutDashboard,
      visible: isAdmin,
    },
    {
      label: "Trò chuyện",
      href: "/chat",
      icon: MessageSquare,
      visible: true,
    },
    {
      label: "Người dùng",
      href: "/users",
      icon: Users,
      visible: canManageUsers(user.role),
    },
    {
      label: "Tri thức",
      href: "/knowledge",
      icon: BookOpen,
      visible: isAdmin,
    },
    {
      label: "Lịch sử",
      href: "/logs",
      icon: FileText,
      visible: isAdmin,
    },
  ];

  const visibleItems = navItems.filter((item) => item.visible);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center px-4">
        <div className="rounded-lg bg-white px-3 py-1.5">
          <Image
            src="/vihat-logo.png"
            alt="ViHAT Group"
            width={130}
            height={73}
            priority
          />
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* User info + Logout */}
      <div className="flex items-center gap-3 p-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-sidebar-foreground">
            {user.name}
          </span>
          <span className="truncate text-[11px] text-muted-foreground">
            {user.role}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={onLogout}
          title="Đăng xuất"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </div>
  );
}
