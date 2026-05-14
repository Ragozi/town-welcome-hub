import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  adminCreateUser,
  adminListUsers,
  adminResetPassword,
  adminSetRole,
  adminDeleteUser,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Plus, Shield, Key, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminRealtors,
});

function AdminRealtors() {
  const qc = useQueryClient();
  const list = useServerFn(adminListUsers);
  const create = useServerFn(adminCreateUser);
  const setRole = useServerFn(adminSetRole);
  const reset = useServerFn(adminResetPassword);
  const del = useServerFn(adminDeleteUser);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => list(),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const onToggleAdmin = async (user_id: string, enable: boolean) => {
    try {
      await setRole({ data: { user_id, role: "admin", enable } });
      toast.success(enable ? "Admin granted" : "Admin removed");
      refresh();
    } catch (e) {
      toast.error("Could not update role", { description: (e as Error).message });
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

  const onDelete = async (user_id: string, email: string) => {
    if (!confirm(`Delete ${email}? This permanently removes their account and packets stay attributed.`)) return;
    try {
      await del({ data: { user_id } });
      toast.success("User deleted");
      refresh();
    } catch (e) {
      toast.error("Could not delete", { description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data?.length ?? 0} {data?.length === 1 ? "user" : "users"}
        </p>
        <NewUserDialog onCreated={refresh} create={create} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Brokerage</th>
                <th className="px-5 py-3">Packets</th>
                <th className="px-5 py-3">Last sign-in</th>
                <th className="px-5 py-3">Admin</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((u) => (
                <tr key={u.id} className="border-t border-border/60">
                  <td className="px-5 py-4">
                    <p className="font-medium">{u.profile?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-5 py-4 text-foreground/70">{u.profile?.brokerage_name ?? "—"}</td>
                  <td className="px-5 py-4">{u.packet_count}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-5 py-4">
                    <Switch
                      checked={u.roles.includes("admin")}
                      onCheckedChange={(c) => onToggleAdmin(u.id, c)}
                    />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => onResetPw(u.id)} title="Reset password">
                      <Key className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(u.id, u.email)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NewUserDialog({
  onCreated,
  create,
}: {
  onCreated: () => void;
  create: ReturnType<typeof useServerFn<typeof adminCreateUser>>;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("WelcomeHome!2026");
  const [admin, setAdmin] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await create({ data: { email, full_name: name, password, is_admin: admin } });
      toast.success("User created", { description: `Share password: ${password}` });
      setOpen(false);
      setEmail(""); setName(""); setPassword("WelcomeHome!2026"); setAdmin(false);
      onCreated();
    } catch (e) {
      toast.error("Could not create", { description: (e as Error).message });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-1 h-4 w-4" /> New user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Provision a new user</DialogTitle></DialogHeader>
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
            <Label>Temporary password</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={admin} onCheckedChange={setAdmin} />
            <Label className="m-0 inline-flex items-center gap-1.5"><Shield className="h-4 w-4" /> Grant admin</Label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy || !email || !name || password.length < 8}>
            {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
