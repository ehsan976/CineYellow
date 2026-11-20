"use client";

import type { AdminSession, AdminUser } from "@/lib/auth/admin-client";
import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogIn,
  LogOut,
  Monitor,
  MoreHorizontal,
  RotateCcw,
  Search,
  Shield,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { adminAuth } from "@/lib/auth/admin-client";
import { useSession } from "@/lib/auth/client";
import { plans } from "@/lib/stores/account-store";
import { PageHeading } from "@/components/account/settings-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 20;

type Filter = "all" | "admin" | "banned";
type SearchField = "email" | "name";
type ApiError = { message?: string; status?: number } | null | undefined;

const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const formatDateTime = (d: Date | string) =>
  new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** Toast the error (if any) and say whether the call worked. */
function report(error: ApiError, success?: string) {
  if (error) {
    toast.error(error.status === 403 ? "You don't have permission to do that." : error.message || "Something went wrong.");
    return false;
  }
  if (success) toast.success(success);
  return true;
}

function initial(user: Pick<AdminUser, "name" | "email">) {
  return ((user.name || user.email).trim()[0] ?? "?").toUpperCase();
}

/** `billing`: payments are on, so the user row's demo plan field means nothing (plans come from payments). */
export function AdminPage({ billing = false }: { billing?: boolean }) {
  const { data: session } = useSession();
  const me = session?.user.id;

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [field, setField] = useState<SearchField>("email");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [sessionsTarget, setSessionsTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Wait until typing pauses before searching.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(query.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    let live = true;
    adminAuth.admin
      .listUsers({
        query: {
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          sortBy: "createdAt",
          sortDirection: "desc",
          ...(search ? { searchValue: search, searchField: field, searchOperator: "contains" as const } : {}),
          ...(filter === "admin" ? { filterField: "role", filterValue: "admin", filterOperator: "eq" as const } : {}),
          ...(filter === "banned" ? { filterField: "banned", filterValue: true, filterOperator: "eq" as const } : {}),
        },
      })
      .then(({ data, error }) => {
        if (!live) return;
        if (error || !data) {
          setLoadError(true);
          report(error);
          return;
        }
        setLoadError(false);
        setUsers(data.users as AdminUser[]);
        setTotal(data.total);
      });
    return () => {
      live = false;
    };
  }, [search, field, filter, page, reloadKey]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const setRole = async (user: AdminUser, role: "admin" | "user") => {
    const { error } = await adminAuth.admin.setRole({ userId: user.id, role });
    if (report(error, role === "admin" ? `${user.email} is now an admin` : `${user.email} is no longer an admin`)) reload();
  };

  const unban = async (user: AdminUser) => {
    const { error } = await adminAuth.admin.unbanUser({ userId: user.id });
    if (report(error, `${user.email} can sign in again`)) reload();
  };

  const impersonate = async (user: AdminUser) => {
    const { error } = await adminAuth.admin.impersonateUser({ userId: user.id });
    if (!report(error)) return;
    // Full reload: every store must pick up the other user's session and data.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload swaps the session everywhere
    window.location.assign("/");
  };

  return (
    <>
      <PageHeading title="Admin" description="Manage accounts: roles, bans, devices and support sign-ins." />

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={field === "email" ? "Search by email" : "Search by name"}
              aria-label="Search users"
              className="pl-9"
            />
          </div>
          <div className="flex gap-3">
            <Select value={field} onValueChange={(v) => setField(v as SearchField)}>
              <SelectTrigger className="w-28" aria-label="Search in">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filter}
              onValueChange={(v) => {
                setFilter(v as Filter);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-36" aria-label="Filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>{users ? `${total} ${total === 1 ? "user" : "users"}` : "Loading users…"}</span>
            {loadError && (
              <Button variant="ghost" size="sm" onClick={reload}>
                <RotateCcw /> Retry
              </Button>
            )}
          </div>

          {!users && !loadError && (
            <div className="space-y-3" aria-busy="true">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          )}

          {users && users.length === 0 && (
            <p className="py-10 text-center text-muted-foreground">No users match.</p>
          )}

          <ul className="divide-y divide-border">
            {users?.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isMe={user.id === me}
                showPlan={!billing}
                onMakeAdmin={() => setRole(user, "admin")}
                onRemoveAdmin={() => setRole(user, "user")}
                onBan={() => setBanTarget(user)}
                onUnban={() => unban(user)}
                onSessions={() => setSessionsTarget(user)}
                onImpersonate={() => impersonate(user)}
                onDelete={() => setDeleteTarget(user)}
              />
            ))}
          </ul>

          {pages > 1 && (
            <div className="mt-4 flex items-center justify-end gap-2 text-sm">
              <span className="mr-2 text-muted-foreground">
                Page {page + 1} of {pages}
              </span>
              <Button variant="outline" size="icon" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft />
              </Button>
              <Button variant="outline" size="icon" aria-label="Next page" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <BanDialog user={banTarget} onClose={() => setBanTarget(null)} onDone={reload} />
      <SessionsDialog user={sessionsTarget} onClose={() => setSessionsTarget(null)} />
      <DeleteDialog user={deleteTarget} onClose={() => setDeleteTarget(null)} onDone={reload} />
    </>
  );
}

function UserRow({
  user,
  isMe,
  showPlan,
  onMakeAdmin,
  onRemoveAdmin,
  onBan,
  onUnban,
  onSessions,
  onImpersonate,
  onDelete,
}: {
  user: AdminUser;
  isMe: boolean;
  showPlan: boolean;
  onMakeAdmin: () => void;
  onRemoveAdmin: () => void;
  onBan: () => void;
  onUnban: () => void;
  onSessions: () => void;
  onImpersonate: () => void;
  onDelete: () => void;
}) {
  const isAdmin = user.role === "admin";
  const plan = showPlan ? plans[user.plan as keyof typeof plans]?.name : undefined;

  return (
    <li className="flex items-center gap-3 py-3">
      <span
        aria-hidden
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full font-bold",
          user.banned ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
        )}
      >
        {initial(user)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-semibold">{user.name || "—"}</span>
          {isMe && <Badge variant="outline" className="rounded-md text-[10px]">You</Badge>}
          {isAdmin && (
            <Badge className="rounded-md text-[10px]">
              <Shield /> Admin
            </Badge>
          )}
          {user.banned && (
            <Badge variant="destructive" className="rounded-md text-[10px]">
              Banned{user.banExpires ? ` until ${formatDate(user.banExpires)}` : ""}
            </Badge>
          )}
        </p>
        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        <p className="text-xs text-muted-foreground">
          {plan ? `${plan} plan · ` : ""}Joined {formatDate(user.createdAt)}
          {user.banned && user.banReason ? ` · ${user.banReason}` : ""}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${user.email}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={onSessions}>
            <Monitor /> Devices
          </DropdownMenuItem>
          {!isMe && !isAdmin && !user.banned && (
            <DropdownMenuItem onSelect={onImpersonate}>
              <LogIn /> Sign in as user
            </DropdownMenuItem>
          )}
          {!isMe && (
            <>
              <DropdownMenuSeparator />
              {isAdmin ? (
                <DropdownMenuItem onSelect={onRemoveAdmin}>
                  <ShieldOff /> Remove admin
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={onMakeAdmin}>
                  <Shield /> Make admin
                </DropdownMenuItem>
              )}
              {user.banned ? (
                <DropdownMenuItem onSelect={onUnban}>
                  <RotateCcw /> Unban
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={onBan}>
                  <Ban /> Ban…
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 /> Delete account…
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

const banDurations: Record<string, { label: string; seconds?: number }> = {
  "1d": { label: "1 day", seconds: 60 * 60 * 24 },
  "7d": { label: "7 days", seconds: 60 * 60 * 24 * 7 },
  "30d": { label: "30 days", seconds: 60 * 60 * 24 * 30 },
  forever: { label: "Permanently" },
};

function BanDialog({ user, onClose, onDone }: { user: AdminUser | null; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("7d");
  const [busy, setBusy] = useState(false);

  const close = () => {
    onClose();
    setReason("");
    setDuration("7d");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await adminAuth.admin.banUser({
      userId: user.id,
      banReason: reason.trim() || undefined,
      banExpiresIn: banDurations[duration].seconds,
    });
    setBusy(false);
    if (report(error, `${user.email} is banned and signed out everywhere`)) {
      close();
      onDone();
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban {user?.email}?</DialogTitle>
          <DialogDescription>They&apos;ll be signed out on every device and can&apos;t sign in until the ban ends.</DialogDescription>
        </DialogHeader>
        <form id="ban-form" onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="ban-reason" className="text-sm font-medium">
              Reason (only admins see this)
            </label>
            <Input id="ban-reason" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Sharing the account" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ban-duration" className="text-sm font-medium">
              Duration
            </label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="ban-duration" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(banDurations).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button type="submit" form="ban-form" variant="destructive" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Ban
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Short device name from a user agent, e.g. "Chrome on Windows". */
function deviceName(ua = "") {
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : ua ? "Browser" : "Unknown device";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS"
    : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

function SessionsDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const [sessions, setSessions] = useState<AdminSession[] | null>(null);
  const [busy, setBusy] = useState(false);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let live = true;
    adminAuth.admin.listUserSessions({ userId }).then(({ data, error }) => {
      if (!live) return;
      if (report(error)) setSessions((data?.sessions ?? []) as AdminSession[]);
    });
    return () => {
      live = false;
      setSessions(null);
    };
  }, [userId]);

  const revoke = async (s: AdminSession) => {
    const { error } = await adminAuth.admin.revokeUserSession({ sessionToken: s.token });
    if (report(error, "Device signed out")) setSessions((list) => list?.filter((x) => x.id !== s.id) ?? null);
  };

  const revokeAll = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await adminAuth.admin.revokeUserSessions({ userId: user.id });
    setBusy(false);
    if (report(error, `${user.email} was signed out everywhere`)) setSessions([]);
  };

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Devices</DialogTitle>
          <DialogDescription>Where {user?.email} is signed in.</DialogDescription>
        </DialogHeader>
        {!sessions && <Skeleton className="h-24 w-full" />}
        {sessions?.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Not signed in anywhere.</p>}
        {sessions && sessions.length > 0 && (
          <ul className="max-h-72 divide-y divide-border overflow-y-auto">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <Monitor className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {deviceName(s.userAgent ?? "")}
                    {s.impersonatedBy && <span className="ml-2 text-xs text-primary">(admin sign-in)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">Last active {formatDateTime(s.updatedAt)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => revoke(s)}>
                  <LogOut /> Sign out
                </Button>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Close</Button>
          </DialogClose>
          <Button variant="destructive" disabled={busy || !sessions?.length} onClick={revokeAll}>
            {busy && <Loader2 className="animate-spin" />} Sign out everywhere
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ user, onClose, onDone }: { user: AdminUser | null; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await adminAuth.admin.removeUser({ userId: user.id });
    setBusy(false);
    if (report(error, `${user.email} was deleted`)) {
      onClose();
      onDone();
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {user?.email}?</DialogTitle>
          <DialogDescription>
            This permanently deletes the account with its profiles, My List and watch history. It can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" disabled={busy} onClick={remove}>
            {busy && <Loader2 className="animate-spin" />} Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
