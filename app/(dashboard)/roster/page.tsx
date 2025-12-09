"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { IconPlus, IconUsers, IconMail, IconUpload } from "@tabler/icons-react";
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
  const [loading, setLoading] = useState(true);
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

  async function loadRoster() {
    try {
      setLoading(true);
      const response = await fetch("/api/roster");
      if (!response.ok) {
        throw new Error("Failed to load roster");
      }
      const data = await response.json();
      setRoster(data.roster || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roster");
    } finally {
      setLoading(false);
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "text/csv": [".csv"],
      "application/json": [".json"],
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        await handleFileUpload(acceptedFiles[0]);
      }
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

      if (!response.ok) {
        throw new Error(result.error || "Failed to import roster");
      }

      setSuccess(
        `Successfully sent ${result.invitations} invitation(s). ${result.errors > 0 ? `${result.errors} error(s) occurred.` : ""}`,
      );
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
        body: JSON.stringify({
          emails: [email],
          role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send invitation");
      }

      setSuccess("Invitation sent successfully!");
      setEmail("");
      setInviteDialogOpen(false);
      await loadRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setInviteLoading(false);
    }
  }

  function getRoleBadgeVariant(role: string) {
    switch (role) {
      case "owner":
        return "default";
      case "coach":
        return "secondary";
      default:
        return "outline";
    }
  }

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
          <div className="text-center">Loading roster...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Roster</h1>
            <p className="text-muted-foreground">
              Manage your gym members and coaches
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <IconUpload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Roster</DialogTitle>
                  <DialogDescription>
                    Upload a CSV or JSON file to invite multiple users
                  </DialogDescription>
                </DialogHeader>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <IconUpload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {isDragActive
                      ? "Drop the file here"
                      : "Drag & drop a CSV or JSON file here, or click to select"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    CSV/JSON files only. Include email and role columns.
                  </p>
                </div>
                {inviteLoading && (
                  <div className="text-center text-sm text-muted-foreground">
                    Processing...
                  </div>
                )}
                {error && (
                  <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-green-500/10 text-green-600 rounded-md p-3 text-sm">
                    {success}
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <IconPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to a coach or athlete
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleManualInvite} className="space-y-4">
                  {error && (
                    <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="bg-green-500/10 text-green-600 rounded-md p-3 text-sm">
                      {success}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={role}
                      onValueChange={(value) =>
                        setRole(value as "coach" | "athlete")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="athlete">Athlete</SelectItem>
                        <SelectItem value="coach">Coach</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={inviteLoading || !email} className="w-full">
                    {inviteLoading ? "Sending..." : "Send Invitation"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {error && !inviteDialogOpen && !importDialogOpen && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3">
            {error}
          </div>
        )}

        {roster.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <IconUsers className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No members yet</p>
                <Button onClick={() => setInviteDialogOpen(true)}>
                  <IconPlus className="h-4 w-4 mr-2" />
                  Add Your First Member
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {roster.map((member) => (
              <Card key={member.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatarUrl || undefined} />
                        <AvatarFallback>
                          {getInitials(member.name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">
                            {member.name || "No name"}
                          </p>
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {member.role}
                          </Badge>
                          {!member.onboarded && (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <IconMail className="h-3 w-3" />
                          <span>{member.email}</span>
                        </div>
                        {member.phone && (
                          <p className="text-sm text-muted-foreground">
                            {member.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
