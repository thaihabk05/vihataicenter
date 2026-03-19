"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen">
        {/* Sidebar skeleton */}
        <div className="hidden w-64 flex-col gap-4 border-r p-4 lg:flex">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
        {/* Main content skeleton */}
        <div className="flex flex-1 flex-col">
          <div className="flex h-14 items-center border-b px-4">
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="flex-1 space-y-4 p-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar user={user} onLogout={logout} />
      </div>

      {/* Mobile sidebar via Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-64 p-0">
          <SheetTitle className="sr-only">Menu dieu huong</SheetTitle>
          <Sidebar
            user={user}
            onLogout={logout}
            onNavigate={() => setSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          onLogout={logout}
          onMenuToggle={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
