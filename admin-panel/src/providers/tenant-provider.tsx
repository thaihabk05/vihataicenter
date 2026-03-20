"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { Tenant } from "@/lib/types";

interface TenantContextType {
  tenant: Tenant | null;
  tenantSlug: string;
  loading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  tenantSlug: "",
  loading: true,
  error: null,
});

/**
 * Read tenant slug from cookie set by middleware.
 */
function getTenantSlugFromCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)tenant-slug=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantSlug, setTenantSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const slug = getTenantSlugFromCookie();
    setTenantSlug(slug);

    if (!slug) {
      // No subdomain → load default tenant
      fetch(`${API_URL}/tenant`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load tenant");
          return res.json();
        })
        .then((data) => setTenant(data))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
      return;
    }

    // Resolve tenant by slug (public endpoint, no auth needed)
    fetch(`${API_URL}/tenant/by-slug/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Tenant "${slug}" not found`);
        return res.json();
      })
      .then((data) => setTenant(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, tenantSlug, loading, error }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
