"use client";

import { useState, useEffect } from "react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import {
  IconPlus,
  IconUsers,
  IconMail,
  IconUpload,
  IconPhone,
  IconSearch,
} from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";

interface RosterMember {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "owner" | "coach" | "athlete";
  avatarUrl: string | null;
  onboarded: boolean;
  createdAt: string;
}

export default function RosterPage() {
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [filteredRoster, setFilteredRoster] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"coach" | "athlete">("athlete");
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    loadRoster();
  }, []);

  useEffect(() => {
    let filtered = roster;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name?.toLowerCase().includes(query) ||
          m.email.toLowerCase().includes(query)
      );
    }
    if (roleFilter !== "all") {
      filtered = filtered.filter((m) => m.role === roleFilter);
    }
    setFilteredRoster(filtered);
  }, [roster, searchQuery, roleFilter]);

  async function loadRoster() {
    try {
      setLoading(true);
      const response = await fetch("/api/roster");
      if (!response.ok) throw new Error("Failed to load roster");
      const data = await response.json();
      setRoster(data.roster || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roster");
    } finally {
      setLoading(false);
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "text/csv": [".csv"], "application/json": [".json"] },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) await handleFileUpload(acceptedFiles[0]);
    },
  });

  async function handleFileUpload(file: File) {
    setError(null);
    setSuccess(null);
    setInviteLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/roster/import", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to import");
      setSuccess(`Sent ${result.invitations} invitation(s)`);
      setImportDialogOpen(false);
      await loadRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleManualInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setInviteLoading(true);

    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: [email], role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to send invitation");
      setSuccess("Invitation sent!");
      setEmail("");
      setInviteDialogOpen(false);
      await loadRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setInviteLoading(false);
    }
  }

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email[0].toUpperCase();
  }

  const stats = {
    total: roster.length,
    coaches: roster.filter((m) => m.role === "coach").length,
    athletes: roster.filter((m) => m.role === "athlete").length,
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="Roster" />
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-var(--header-height))]">
      <PageHeader title="Roster" description={`${stats.total} members • ${stats.coaches} coaches • ${stats.athletes} athletes`}>
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 rounded-xl">
              <IconUpload className="h-4 w-4" />
              Import
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Import Roster</DialogTitle>
              <DialogDescription>
                Upload CSV or JSON with email and role columns
              </DialogDescription>
            </DialogHeader>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragActive ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/50"
              }`}
            >
              <input {...getInputProps()} />
              <IconUpload className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {isDragActive ? "Drop file here" : "Drag & drop or click to select"}
              </p>
            </div>
            {inviteLoading && <p className="text-center text-sm text-muted-foreground">Processing...</p>}
            {error && <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">{error}</div>}
          </DialogContent>
        </Dialog>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 rounded-xl">
              <IconPlus className="h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Invite Member</DialogTitle>
              <DialogDescription>Send an invitation email</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleManualInvite} className="space-y-4 pt-4">
              {error && <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">{error}</div>}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="athlete@example.com"
                  className="h-11 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as any)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="athlete">Athlete</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl" disabled={inviteLoading || !email}>
                {inviteLoading ? "Sending..." : "Send Invitation"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Search & Filter */}
      <div className="flex gap-3 p-4 lg:px-6 border-b">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-32 h-10 rounded-xl">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="owner">Owners</SelectItem>
            <SelectItem value="coach">Coaches</SelectItem>
            <SelectItem value="athlete">Athletes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Success Message */}
      {success && !inviteDialogOpen && !importDialogOpen && (
        <div className="mx-4 lg:mx-6 mt-4 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-xl p-3 text-sm">
          {success}
        </div>
      )}

      {/* Roster List */}
      <ScrollArea className="flex-1">
        <div className="p-4 lg:px-6">
          {filteredRoster.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <IconUsers className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-sm">
                {roster.length === 0 ? "No members yet" : "No results found"}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border overflow-hidden">
              <div className="divide-y">
                {filteredRoster.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                  >
                    <Avatar className="h-11 w-11 rounded-xl border-2 border-background shadow-sm">
                      <AvatarImage src={member.avatarUrl || undefined} />
                      <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 font-medium">
                        {getInitials(member.name, member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {member.name || "Unnamed"}
                        </p>
                        <Badge
                          variant={
                            member.role === "owner"
                              ? "default"
                              : member.role === "coach"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-[10px] px-1.5 py-0 rounded-md"
                        >
                          {member.role}
                        </Badge>
                        {!member.onboarded && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300 rounded-md">
                            Pending
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <IconMail className="h-3 w-3" />
                          <span className="truncate">{member.email}</span>
                        </span>
                        {member.phone && (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <IconPhone className="h-3 w-3" />
                            <span>{member.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
