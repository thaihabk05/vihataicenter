"use client";

import { usePathname } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/lib/types";

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onMenuToggle: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  "/": "Tổng quan",
  "/chat": "Trò chuyện",
  "/users": "Người dùng",
  "/knowledge": "Tri thức",
  "/logs": "Lịch sử",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  // Check prefix matches for nested routes
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (path !== "/" && pathname.startsWith(path)) return title;
  }

  return "ViHAT Knowledge System";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Header({ user, onLogout, onMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
      {/* Left: mobile menu + title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="size-5" />
          <span className="sr-only">Menu</span>
        </Button>
        <h1 className="text-base font-semibold">{title}</h1>
      </div>

      {/* Right: user dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar size="sm">
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium md:inline-block">
            {user.name}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8}>
          <DropdownMenuLabel>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{user.name}</span>
              <span className="text-xs text-muted-foreground">{user.role}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout}>
            <LogOut className="size-4" />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
