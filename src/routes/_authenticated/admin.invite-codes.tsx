import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Loader2, Plus, Ban } from "lucide-react";
import { getPublicBaseUrl } from "@/lib/public-url";

export const Route = createFileRoute("/_authenticated/admin/invite-codes")({
  component: InviteCodesPage,
});

type InviteCode = {
  id: string;
  code: string;
  note: string | null;
  email_lock: string | null;
  expires_at: string | null;
  consumed_at: string | null;
  consumed_by: string | null;
  revoked_at: string | null;
  created_at: string;
};

function generateCode() {
  // Avoid 0/O/1/I/L
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `WH-${s}`;
}

function statusOf(c: InviteCode): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  if (c.revoked_at) return { label: "Revoked", variant: "destructive" };
  if (c.consumed_at) return { label: "Used", variant: "secondary" };
  if (c.expires_at && new Date(c.expires_at) <= new Date())
    return { label: "Expired", variant: "outline" };
  return { label: "Available", variant: "default" };
}

function InviteCodesPage() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState("");
  const [emailLock, setEmailLock] = useState("");
  const [expiresDays, setExpiresDays] = useState("30");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("realtor_invite_codes")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error(error.message);
    setCodes((data ?? []) as InviteCode[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const createCode = async () => {
    if (!user) return;
    setCreating(true);
    const days = parseInt(expiresDays, 10);
    const expires =
      Number.isFinite(days) && days > 0
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        : null;
    const { error } = await supabase.from("realtor_invite_codes").insert({
      code: generateCode(),
      created_by: user.id,
      note: note.trim() || null,
      email_lock: emailLock.trim() || null,
      expires_at: expires,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success("Invite code created.");
    setOpen(false);
    setNote("");
    setEmailLock("");
    setExpiresDays("30");
    void load();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase
      .from("realtor_invite_codes")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Code revoked.");
    void load();
  };

  const copyLink = (code: string) => {
    const url = `${getPublicBaseUrl()}/login?code=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied.");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-extrabold uppercase tracking-tight">
            Invitations
          </h2>
          <p className="text-sm text-muted-foreground">
            Generate single-use invite codes for new realtors.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full">
              <Plus className="mr-1.5 h-4 w-4" /> Generate code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New invite code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="note">Note (internal)</Label>
                <Input
                  id="note"
                  placeholder="e.g. Sarah at KW Madison"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="email-lock">Lock to email (optional)</Label>
                <Input
                  id="email-lock"
                  type="email"
                  placeholder="sarah@kw.com"
                  value={emailLock}
                  onChange={(e) => setEmailLock(e.target.value)}
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  If set, only this email can use the code.
                </p>
              </div>
              <div>
                <Label htmlFor="expires">Expires in (days, blank = never)</Label>
                <Input
                  id="expires"
                  type="number"
                  min={1}
                  value={expiresDays}
                  onChange={(e) => setExpiresDays(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <Button onClick={createCode} disabled={creating} className="w-full rounded-full">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create code"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : codes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          No invite codes yet. Generate one to onboard a new realtor.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Email lock</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const status = statusOf(c);
                const usable = status.label === "Available";
                return (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.note ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email_lock ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {usable && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => copyLink(c.code)}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => revoke(c.id)}>
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
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
