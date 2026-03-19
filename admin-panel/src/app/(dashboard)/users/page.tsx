"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, Plus } from "lucide-react";
import { usersApi } from "@/lib/api-client";
import { DEPARTMENTS, ROLES, KB_LIST } from "@/lib/constants";
import type { User } from "@/lib/types";

const DEPT_COLORS: Record<string, string> = {
  sales: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  hr: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  accounting:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  general:
    "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  management:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  admin:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  lead: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  member: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  viewer: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

interface UserForm {
  name: string;
  email: string;
  department: string;
  role: string;
  password: string;
  knowledge_access: string[];
  zalo_id: string;
  telegram_id: string;
}

const emptyForm: UserForm = {
  name: "",
  email: "",
  department: "general",
  role: "member",
  password: "",
  knowledge_access: [],
  zalo_id: "",
  telegram_id: "",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    usersApi
      .list()
      .then((res) => setUsers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers =
    filterDept === "all"
      ? users
      : users.filter((u) => u.department === filterDept);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email ?? "",
      department: user.department,
      role: user.role,
      password: "",
      knowledge_access: user.knowledge_access,
      zalo_id: user.zalo_id ?? "",
      telegram_id: user.telegram_id ? String(user.telegram_id) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email || null,
        department: form.department,
        role: form.role,
        knowledge_access: form.knowledge_access,
        zalo_id: form.zalo_id || null,
        telegram_id: form.telegram_id ? Number(form.telegram_id) : null,
      };
      if (form.password) payload.password = form.password;

      if (editingUser) {
        await usersApi.update(editingUser.id, payload);
      } else {
        await usersApi.create(payload);
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await usersApi.delete(id);
      fetchUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const toggleKbAccess = (kb: string) => {
    setForm((prev) => ({
      ...prev,
      knowledge_access: prev.knowledge_access.includes(kb)
        ? prev.knowledge_access.filter((k) => k !== kb)
        : [...prev.knowledge_access, kb],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Người dùng</h1>
        <div className="flex items-center gap-3">
          <Select value={filterDept} onValueChange={(v) => setFilterDept(v ?? "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Phòng ban" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phòng ban</SelectItem>
              {Object.entries(DEPARTMENTS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Thêm người dùng
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phòng ban</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Không có người dùng nào
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email ?? "-"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          DEPT_COLORS[user.department] ?? DEPT_COLORS.general
                        }
                      >
                        {DEPARTMENTS[
                          user.department as keyof typeof DEPARTMENTS
                        ] ?? user.department}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          ROLE_COLORS[user.role] ?? ROLE_COLORS.member
                        }
                      >
                        {ROLES[user.role as keyof typeof ROLES] ?? user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Hoạt động
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          Vô hiệu
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(user)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        {deleteConfirmId === user.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="destructive"
                              size="xs"
                              onClick={() => handleDelete(user.id)}
                            >
                              Xác nhận
                            </Button>
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              Hủy
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteConfirmId(user.id)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Cập nhật thông tin người dùng"
                : "Điền thông tin để tạo người dùng mới"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Tên</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Nguyen Van A"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="email@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Phòng ban</Label>
                <Select
                  value={form.department}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, department: v ?? "" }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEPARTMENTS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Vai trò</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v ?? "" }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">
                Mật khẩu {editingUser && "(để trống nếu không đổi)"}
              </Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder={editingUser ? "******" : "Nhập mật khẩu"}
              />
            </div>

            <div className="grid gap-2">
              <Label>Quyền truy cập Knowledge Base</Label>
              <div className="flex flex-wrap gap-2">
                {KB_LIST.map((kb) => (
                  <label
                    key={kb}
                    className="flex items-center gap-1.5 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.knowledge_access.includes(kb)}
                      onChange={() => toggleKbAccess(kb)}
                      className="rounded border-input"
                    />
                    {DEPARTMENTS[kb as keyof typeof DEPARTMENTS] ?? kb}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="zalo_id">Zalo ID</Label>
                <Input
                  id="zalo_id"
                  value={form.zalo_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, zalo_id: e.target.value }))
                  }
                  placeholder="Zalo user ID"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="telegram_id">Telegram ID</Label>
                <Input
                  id="telegram_id"
                  value={form.telegram_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, telegram_id: e.target.value }))
                  }
                  placeholder="Telegram user ID"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? "Đang lưu..."
                : editingUser
                  ? "Cập nhật"
                  : "Tạo mới"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
