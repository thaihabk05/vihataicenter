"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  MessageSquareWarning,
  Users,
  BookOpen,
  FileText,
  LogOut,
  Presentation,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { canManageUsers, canViewAllStats } from "@/lib/permissions";
import { feedbackApi } from "@/lib/api-client";
import { useTenant } from "@/providers/tenant-provider";
import type { User } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  visible: boolean;
  badge?: number;
}

interface SidebarProps {
  user: User;
  onLogout: () => void;
  onNavigate?: () => void;
}

export function Sidebar({ user, onLogout, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);
  const { tenant } = useTenant();

  const isAdmin = canViewAllStats(user.role);

  // Fetch new feedback count for admins
  useEffect(() => {
    if (!isAdmin) return;

    const fetchCount = () => {
      feedbackApi
        .list({ status: "new", limit: 1 })
        .then((res) => setNewFeedbackCount(res.data.total ?? 0))
        .catch(() => {});
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [isAdmin]);

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
      label: "Tạo Proposal",
      href: "/proposals",
      icon: Presentation,
      visible: true,
    },
    {
      label: "Lịch sử",
      href: "/logs",
      icon: FileText,
      visible: isAdmin,
    },
    {
      label: "Cấu hình Proposal",
      href: "/proposals/settings",
      icon: Settings2,
      visible: isAdmin,
    },
    {
      label: "Góp ý nội dung",
      href: "/feedback",
      icon: MessageSquareWarning,
      visible: isAdmin,
      badge: newFeedbackCount,
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
      {/* Logo / Tenant branding */}
      <div className="flex h-16 items-center justify-center px-4">
        {tenant?.logo_url ? (
          <div className="rounded-lg bg-white px-3 py-1.5">
            <Image
              src={tenant.logo_url}
              alt={tenant.name}
              width={130}
              height={73}
              priority
            />
          </div>
        ) : tenant?.name ? (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 font-bold text-lg"
            style={{ color: tenant.primary_color || undefined }}
          >
            {tenant.name}
          </div>
        ) : (
          <div className="rounded-lg bg-white px-3 py-1.5">
            <Image
              src="/vihat-logo.png"
              alt="Knowledge System"
              width={130}
              height={73}
              priority
            />
          </div>
        )}
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
              <span className="flex-1">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <Badge
                  variant="destructive"
                  className="h-5 min-w-[20px] px-1.5 text-[10px] font-semibold"
                >
                  {item.badge}
                </Badge>
              )}
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
