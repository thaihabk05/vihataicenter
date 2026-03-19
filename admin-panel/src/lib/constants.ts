export const DEPARTMENTS = {
  sales: "Kinh doanh",
  hr: "Nhân sự",
  accounting: "Kế toán",
  general: "Chung",
  management: "Quản lý",
} as const;

export const ROLES = {
  super_admin: "Super Admin",
  admin: "Admin",
  lead: "Trưởng nhóm",
  member: "Nhân viên",
  viewer: "Xem",
} as const;

export const CHANNELS = {
  zalo_oa: "Zalo OA",
  telegram: "Telegram",
  web_admin: "Web Admin",
} as const;

export const DOC_STATUS = {
  processing: "Đang xử lý",
  ready: "Sẵn sàng",
  error: "Lỗi",
  deleted: "Đã xóa",
} as const;

export const KB_LIST = ["sales", "hr", "accounting", "general", "management"] as const;
