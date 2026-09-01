"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUsers, useCreateUser, useToggleUserStatus, AppUser } from "@/hooks/useUsers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  ArrowLeft,
  Users,
  Plus,
  Loader2,
  Edit2,
  UserX,
} from "lucide-react";

export default function UserManagementPage() {
  const router = useRouter();
  const { data: users = [], isLoading } = useUsers();
  const createUserMutation = useCreateUser();
  const toggleUserStatusMutation = useToggleUserStatus();

  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<
    "ADMIN" | "MANAGER" | "RESTOCKER" | "FIELD_AGENT"
  >("FIELD_AGENT");

  const handleOpenAdd = () => {
    setEditingUserId(null);
    setUserName("");
    setUserEmail("");
    setUserRole("FIELD_AGENT");
    setIsAddDrawerOpen(true);
  };

  const handleOpenEdit = (u: AppUser) => {
    setEditingUserId(u.id);
    setUserName(u.name);
    setUserEmail(u.email);
    setUserRole(u.role);
    setIsAddDrawerOpen(true);
  };

  const handleToggleDeactivate = (userId: string) => {
    toggleUserStatusMutation.mutate(userId);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) {
      toast.error("Please enter a valid name and email");
      return;
    }

    createUserMutation.mutate(
      {
        name: userName.trim(),
        email: userEmail.trim(),
        role: userRole,
      },
      {
        onSuccess: () => {
          setIsAddDrawerOpen(false);
        },
      }
    );
  };

  return (
    <div className="w-full px-4 py-4 space-y-4">
      {/* Top Header with Back Navigation */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => router.push("/settings")}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>More & Settings</span>
        </button>

        <Button
          onClick={handleOpenAdd}
          className="h-9 px-3 rounded-2xl font-bold gap-1 shadow-xs shadow-primary/30 active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>+ Add User</span>
        </Button>
      </div>

      {/* Screen 10: Header */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-1">
        <h1 className="text-xl font-black tracking-tight text-foreground">
          User Management
        </h1>
        <p className="text-xs text-muted-foreground">
          Manage roles, credentials, and access permissions for your organization.
        </p>
      </div>

      {/* Users List */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-20 w-full bg-card/60 border border-border/40 rounded-2xl p-4 animate-pulse"
              />
            ))}
          </div>
        ) : (
          users.map((user) => {
            const isAdmin = user.role === "ADMIN";
            const isManager = user.role === "MANAGER";
            const isInactive = user.status === "INACTIVE";

            return (
              <Card
                key={user.id}
                className={`border-border/50 bg-card shadow-xs transition-all ${
                  isInactive ? "opacity-60" : ""
                }`}
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-11 w-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                        isAdmin
                          ? "bg-primary/20 text-foreground"
                          : isManager
                          ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                          : "bg-secondary/15 text-secondary"
                      }`}
                    >
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-foreground truncate">
                          {user.name}
                        </h3>
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isAdmin
                              ? "bg-primary/20 text-foreground"
                              : isManager
                              ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                              : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Edit & Deactivate */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(user)}
                      className="h-8 w-8 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                      title="Edit User"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleDeactivate(user.id)}
                      className={`h-8 w-8 rounded-xl flex items-center justify-center transition-colors ${
                        isInactive
                          ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                      }`}
                      title={isInactive ? "Activate User" : "Deactivate User"}
                    >
                      <UserX className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Vaul Bottom Drawer: Add / Edit User */}
      <Drawer open={isAddDrawerOpen} onOpenChange={setIsAddDrawerOpen}>
        <DrawerContent className="max-w-md mx-auto rounded-t-[28px] p-6 space-y-4">
          <DrawerHeader className="p-0 text-left">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <Users className="h-4 w-4" />
              </div>
              <DrawerTitle className="text-lg font-bold text-foreground">
                {editingUserId ? "Edit User Account" : "Add Team Member"}
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground">
              Configure system access credentials and tenant role permissions.
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleSaveUser} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Full Name
              </label>
              <Input
                placeholder="e.g. Marcus Vance"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="h-11 rounded-xl bg-muted/40 border-border/60 text-xs focus-visible:ring-primary shadow-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="name@company.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="h-11 rounded-xl bg-muted/40 border-border/60 text-xs focus-visible:ring-primary shadow-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Role Assignment
              </label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as any)}
                className="w-full h-11 rounded-xl bg-muted/40 border-border/60 text-xs font-medium px-3 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
              >
                <option value="RESTOCKER">Restocker / Field Agent</option>
                <option value="MANAGER">Store Manager</option>
                <option value="ADMIN">Tenant Administrator</option>
              </select>
            </div>

            <DrawerFooter className="p-0 pt-3 gap-2">
              <Button
                type="submit"
                className="w-full h-12 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-sm shadow-md active:scale-[0.97]"
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingUserId ? (
                  "Save Changes"
                ) : (
                  "Create Account"
                )}
              </Button>
              <DrawerClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
