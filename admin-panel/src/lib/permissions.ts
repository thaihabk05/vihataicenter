const PERMISSIONS: Record<string, Set<string>> = {
  super_admin: new Set([
    "query_all_kb", "query_own_kb", "query_general",
    "upload_document", "delete_document",
    "manage_users", "view_all_stats", "view_own_stats",
    "configure_system",
  ]),
  admin: new Set([
    "query_all_kb", "query_own_kb", "query_general",
    "upload_document", "delete_document",
    "manage_users", "view_all_stats", "view_own_stats",
  ]),
  lead: new Set(["query_own_kb", "query_general", "upload_document", "view_own_stats"]),
  member: new Set(["query_own_kb", "query_general", "view_own_stats"]),
  viewer: new Set(["query_own_kb", "query_general"]),
};

export function hasPermission(role: string, permission: string): boolean {
  return PERMISSIONS[role]?.has(permission) ?? false;
}

export function canManageUsers(role: string) { return hasPermission(role, "manage_users"); }
export function canUploadKnowledge(role: string) { return hasPermission(role, "upload_document"); }
export function canDeleteKnowledge(role: string) { return hasPermission(role, "delete_document"); }
export function canViewAllStats(role: string) { return hasPermission(role, "view_all_stats"); }
export function canViewLogs(role: string) { return hasPermission(role, "view_all_stats"); }
