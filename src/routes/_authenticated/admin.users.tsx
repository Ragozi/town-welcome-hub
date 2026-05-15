import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  adminInviteUser,
  adminListUsers,
  adminResendInvite,
  adminResetPassword,
  adminSetRole,
  adminSetUserActive,
  adminDeleteUser,
} from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  MoreHorizontal,
  Mail,
  KeyRound,
  UserX,
  UserCheck,
  Trash2,
  ShieldAlert,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: IamPage,
});

const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin" },
  { value: "realtor_admin", label: "Realtor Admin" },
  { value: "realtor_agent", label: "Realtor Agent" },
  { value: "sponsor_user", label: "Sponsor User" },
] as const;
type AssignableRole = (typeof ROLE_OPTIONS)[number]["value"];

function roleLabel(role: string): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

function pickPrimaryRole(roles: string[]): AssignableRole | "" {
  for (const r of ["super_admin", "realtor_admin", "realtor_agent", "sponsor_user"] as const) {
    if (roles.includes(r)) return r;
  }
  return "";
}

type UserRow = Awaited<ReturnType<typeof adminListUsers>>[number];

type Status = "Disabled" | "Pending Invitation" | "Pending Verification" | "Active";
function statusOf(u: UserRow): Status {
  if (u.banned_until && new Date(u.banned_until) > new Date()) return "Disabled";
  if (u.invited_at && !u.confirmed) return "Pending Invitation";
  if (!u.confirmed) return "Pending Verification";
  return "Active";
}

function statusBadge(s: Status) {
  const map: Record<
    Status,
    { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
  > = {
    Active: { variant: "default" },
    "Pending Invitation": { variant: "secondary" },
    "Pending Verification": { variant: "outline" },
    Disabled: { variant: "destructive" },
  };
  const { variant, className } = map[s];
  return (
    <Badge variant={variant} className={className}>
      {s}
    </Badge>
  );
}

function lastSignInLabel(u: UserRow): string {
  if (!u.confirmed) return "Pending Verification";
  if (!u.last_sign_in_at) return "N/A";
  return new Date(u.last_sign_in_at).toLocaleString();
}

function IamPage() {
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  // Super Admin == any user with super_admin role. We get this from /users list itself
  // by checking the current user's roles, but for the gate we ask the server below.
  const list = useServerFn(adminListUsers);
  const invite = useServerFn(adminInviteUser);
  const setRole = useServerFn(adminSetRole);
  const reset = useServerFn(adminResetPassword);
  const del = useServerFn(adminDeleteUser);
  const setActive = useServerFn(adminSetUserActive);
  const resend = useServerFn(adminResendInvite);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => list(),
  });

  const me = (data ?? []).find((u) => u.id === user?.id);
  const isSuperAdmin = !!me?.roles.includes("super_admin");

  const inviteMut = useMutation({
    mutationFn: (input: { email: string; full_name: string; role: AssignableRole }) =>
      invite({ data: input }),
    onSuccess: (newUser) => {
      qc.setQueryData<UserRow[]>(["admin-users"], (prev) =>
        prev
          ? [newUser as UserRow, ...prev.filter((u) => u.id !== newUser.id)]
          : [newUser as UserRow],
      );
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Invitation sent", {
        description: `${newUser.email} will receive a setup link.`,
      });
    },
    onError: (e: Error) => toast.error("Could not invite user", { description: e.message }),
  });

  const onSetRole = async (user_id: string, role: AssignableRole) => {
    try {
      await setRole({ data: { user_id, role } });
      toast.success(`Role updated to ${roleLabel(role)}`);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast.error("Could not update role", { description: (e as Error).message });
    }
  };

  const onResend = async (user_id: string, email: string) => {
    try {
      await resend({ data: { user_id } });
      toast.success("Invitation resent", { description: `Sent a fresh link to ${email}.` });
    } catch (e) {
      toast.error("Could not resend invitation", { description: (e as Error).message });
    }
  };

  const onResetPw = async (user_id: string) => {
    const pw = prompt("New password (min 8 chars):");
    if (!pw || pw.length < 8) return;
    try {
      await reset({ data: { user_id, password: pw } });
      toast.success("Password reset");
    } catch (e) {
      toast.error("Could not reset", { description: (e as Error).message });
    }
  };

  const onSetActive = async (user_id: string, active: boolean, email: string) => {
    if (
      !active &&
      !confirm(`Deactivate ${email}? They will not be able to sign in until reactivated.`)
    )
      return;
    try {
      await setActive({ data: { user_id, active } });
      toast.success(active ? "User reactivated" : "User deactivated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast.error("Could not update", { description: (e as Error).message });
    }
  };

  const onDelete = async (user_id: string, email: string) => {
    if (!confirm(`Delete ${email}? This permanently removes their account.`)) return;
    try {
      await del({ data: { user_id } });
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast.error("Could not delete", { description: (e as Error).message });
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">
            Identity & Access Management
          </h2>
          <p className="text-sm text-muted-foreground">
            {data?.length ?? 0} {data?.length === 1 ? "user" : "users"} ·{" "}
            {isSuperAdmin
              ? "You can invite, role-manage, and deactivate users."
              : "Read-only — only Super Admins can modify users."}
          </p>
        </div>
        {isSuperAdmin && (
          <NewUserDialog
            busy={inviteMut.isPending}
            onSubmit={(input) => inviteMut.mutateAsync(input)}
          />
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Last sign-in</th>
                <th className="px-5 py-3">Packets</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((u) => {
                const status = statusOf(u);
                const primary = pickPrimaryRole(u.roles);
                const isMe = u.id === user?.id;
                return (
                  <tr key={u.id} className="border-t border-border/60 align-middle">
                    <td className="px-5 py-4">
                      <p className="font-medium">{u.profile?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      {isSuperAdmin ? (
                        <Select
                          value={primary || undefined}
                          onValueChange={(v) => onSetRole(u.id, v as AssignableRole)}
                        >
                          <SelectTrigger className="h-8 w-[160px] rounded-full text-xs">
                            <SelectValue placeholder="Assign role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-foreground/70">
                          {primary ? roleLabel(primary) : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">{statusBadge(status)}</td>
                    <td className="px-5 py-4 text-muted-foreground">{lastSignInLabel(u)}</td>
                    <td className="px-5 py-4">{u.packet_count}</td>
                    <td className="px-5 py-4 text-right">
                      {isSuperAdmin ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(status === "Pending Invitation" ||
                              status === "Pending Verification") && (
                              <DropdownMenuItem onClick={() => onResend(u.id, u.email)}>
                                <Mail className="mr-2 h-4 w-4" /> Resend invitation
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => onResetPw(u.id)}>
                              <KeyRound className="mr-2 h-4 w-4" /> Reset password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {status === "Disabled" ? (
                              <DropdownMenuItem onClick={() => onSetActive(u.id, true, u.email)}>
                                <UserCheck className="mr-2 h-4 w-4" /> Reactivate user
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                disabled={isMe}
                                onClick={() => onSetActive(u.id, false, u.email)}
                              >
                                <UserX className="mr-2 h-4 w-4" /> Deactivate user
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={isMe}
                              onClick={() => onDelete(u.id, u.email)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete user
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <ShieldAlert className="ml-auto h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NewUserDialog({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (input: { email: string; full_name: string; role: AssignableRole }) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AssignableRole | "">("");

  const reset = () => {
    setEmail("");
    setName("");
    setRole("");
  };

  const submit = async () => {
    if (!email || !name || !role) return;
    try {
      await onSubmit({ email, full_name: name, role: role as AssignableRole });
      setOpen(false);
      reset();
    } catch {
      // toast handled by mutation
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-1 h-4 w-4" /> New user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a new user</DialogTitle>
          <DialogDescription>
            We'll email them a setup link so they can verify and choose a password.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AssignableRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy || !email || !name || !role}>
            {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Send invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
