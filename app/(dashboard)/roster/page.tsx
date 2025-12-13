"use client";

import {
  IconDotsVertical,
  IconEdit,
  IconMail,
  IconPhone,
  IconPlus,
  IconTrash,
  IconUpload,
  IconArrowRight,
} from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  homePhone?: string | null;
  workPhone?: string | null;
  cellPhone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactEmail?: string | null;
  role: "owner" | "coach" | "athlete";
  avatarUrl: string | null;
  onboarded: boolean;
  createdAt: string;
}

export default function RosterPage() {
  const formatRoleDisplay = (role: string) => {
    if (role === "owner") return "Head Coach";
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState<"coach" | "athlete">("athlete");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [roster, setRoster] = useState<User[]>([]);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isImportRosterDialogOpen, setIsImportRosterDialogOpen] =
    useState(false);

  // Edit member state
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    address: "",
    homePhone: "",
    workPhone: "",
    cellPhone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    emergencyContactEmail: "",
    role: "",
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete member state
  const [deletingMember, setDeletingMember] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Current user info
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await fetch("/api/user-info");
      if (response.ok) {
        const data = await response.json();
        setCurrentUserRole(data.role);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchRoster = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/roster");
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch roster");
      }
      setRoster(result.roster);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while fetching roster",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoster();
    fetchCurrentUser();
  }, [fetchRoster, fetchCurrentUser]);

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
    setLoading(true);

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
      setIsImportRosterDialogOpen(false);
      fetchRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleManualInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: [email],
          role,
          userInfo: {
            name: name.trim() || undefined,
            phone: phone.trim() || undefined,
            address: address.trim() || undefined,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send invitation");
      }

      setSuccess("Invitation sent successfully!");
      setEmail("");
      setName("");
      setPhone("");
      setAddress("");
      setIsAddMemberDialogOpen(false);
      fetchRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function openEditDialog(member: User) {
    setEditingMember(member);
    setEditForm({
      name: member.name || "",
      phone: member.phone || "",
      address: member.address || "",
      homePhone: member.homePhone || "",
      workPhone: member.workPhone || "",
      cellPhone: member.cellPhone || "",
      emergencyContactName: member.emergencyContactName || "",
      emergencyContactPhone: member.emergencyContactPhone || "",
      emergencyContactRelationship: member.emergencyContactRelationship || "",
      emergencyContactEmail: member.emergencyContactEmail || "",
      role: member.role,
    });
    setIsEditDialogOpen(true);
  }

  async function handleSaveEdit() {
    if (!editingMember) return;
    setSaving(true);
    setError(null);

    try {
      // Don't send role field if editing head coach (can't change head coach role)
      const { role, ...restForm } = editForm;
      const updateData = editingMember.role === "owner" 
        ? restForm 
        : { ...restForm, role };
      
      // Convert empty strings to null for optional fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === "") {
          updateData[key as keyof typeof updateData] = null as any;
        }
      });

      const response = await fetch(`/api/roster/${editingMember.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to update member");
      }

      setIsEditDialogOpen(false);
      setEditingMember(null);
      fetchRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  function openDeleteDialog(member: User) {
    setDeletingMember(member);
    setIsDeleteDialogOpen(true);
  }

  async function handleDeleteMember() {
    if (!deletingMember) return;
    setDeleting(true);

    try {
      const response = await fetch(`/api/roster/${deletingMember.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to remove member");
      }

      setIsDeleteDialogOpen(false);
      setDeletingMember(null);
      fetchRoster();
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setDeleting(false);
    }
  }

  const isOwner = currentUserRole === "owner";

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden">
      <PageHeader
        title="Roster Management"
        description="Manage your gym's coaches and athletes"
      >
        <Dialog
          open={isImportRosterDialogOpen}
          onOpenChange={setIsImportRosterDialogOpen}
        >
          <DialogTrigger asChild>
            <Button variant="outline" className="rounded-xl">
              <IconUpload className="mr-2 h-4 w-4" /> Import
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-xl">
            <DialogHeader>
              <DialogTitle>Import Roster</DialogTitle>
              <DialogDescription>
                Upload a CSV or JSON file to invite multiple users.
              </DialogDescription>
            </DialogHeader>
            <div
              {...getRootProps()}
              className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
            >
              <input {...getInputProps()} />
              <p className="text-sm text-muted-foreground">
                {isDragActive
                  ? "Drop the file here"
                  : "Drag & drop a CSV or JSON file here, or click to select"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                CSV/JSON files only. Include 'email' and 'role' columns.
              </p>
            </div>
            {loading && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Processing...
              </div>
            )}
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-500/10 text-green-600 rounded-xl p-3 text-sm">
                {success}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={isAddMemberDialogOpen}
          onOpenChange={setIsAddMemberDialogOpen}
        >
          <DialogTrigger asChild>
            <Button className="rounded-xl">
              <IconPlus className="mr-2 h-4 w-4" /> Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-xl">
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
              <DialogDescription>
                Invite a single coach or athlete by email.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleManualInvite} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-500/10 text-green-600 rounded-xl p-3 text-sm">
                  {success}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="h-11 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Address"
                  className="h-11 rounded-xl"
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
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="athlete">Athlete</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full h-11 rounded-xl"
              >
                {loading ? "Sending..." : "Send Invitation"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex-1 overflow-auto min-h-0">
        <div className="space-y-6">
        {loading && roster.length === 0 ? (
          <Card className="rounded-xl">
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-400px)] min-h-[300px]">
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-xl" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-16 rounded-lg" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : roster.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="pt-6 text-center text-muted-foreground">
              No members in your gym yet. Add one to get started!
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>Current Members</CardTitle>
              <CardDescription>
                {roster.length} member{roster.length !== 1 ? "s" : ""} in your
                gym
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-400px)] min-h-[300px]">
                <div className="space-y-2">
                  {roster.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                    >
                      <Link
                        href={`/roster/${member.id}`}
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                      >
                        <Avatar className="h-12 w-12 rounded-xl">
                          <AvatarImage
                            src={member.avatarUrl || undefined}
                            alt={member.name || member.email}
                          />
                          <AvatarFallback className="rounded-xl">
                            {member.name
                              ? member.name.charAt(0)
                              : member.email.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">
                            {member.name || "Unnamed"}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <IconMail className="h-3 w-3" />
                              {member.email}
                            </span>
                            {member.phone && (
                              <span className="hidden md:flex items-center gap-1">
                                <IconPhone className="h-3 w-3" />
                                {member.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        <IconArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            member.role === "owner"
                              ? "default"
                              : member.role === "coach"
                                ? "secondary"
                                : "outline"
                          }
                          className="rounded-lg"
                        >
                          {formatRoleDisplay(member.role)}
                        </Badge>
                        {!member.onboarded && (
                          <Badge variant="outline" className="rounded-lg">
                            Pending
                          </Badge>
                        )}

                        {/* Actions - Head coaches can edit anyone, coaches can edit athletes */}
                        {(isOwner ||
                          (currentUserRole === "coach" &&
                            member.role === "athlete")) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <IconDotsVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="rounded-xl"
                              >
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDialog(member);
                                  }}
                                  className="gap-2"
                                >
                                  <IconEdit className="h-4 w-4" />
                                  Edit Member
                                </DropdownMenuItem>
                                {isOwner && member.role !== "owner" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openDeleteDialog(member);
                                      }}
                                      className="gap-2 text-destructive focus:text-destructive"
                                    >
                                      <IconTrash className="h-4 w-4" />
                                      Remove from Gym
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
        </div>
      </div>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update {editingMember?.name || editingMember?.email}'s information
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4 py-4 pr-4">
              {error && (
                <div className="bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label>Athlete Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  placeholder="Full name"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Athlete Address</Label>
                <Input
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, address: e.target.value })
                  }
                  placeholder="Address"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Home Phone Number</Label>
                  <Input
                    value={editForm.homePhone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, homePhone: e.target.value })
                    }
                    placeholder="Home phone"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Work Phone Number</Label>
                  <Input
                    value={editForm.workPhone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, workPhone: e.target.value })
                    }
                    placeholder="Work phone"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cell Number</Label>
                <Input
                  value={editForm.cellPhone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, cellPhone: e.target.value })
                  }
                  placeholder="Cell phone"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact Name</Label>
                <Input
                  value={editForm.emergencyContactName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, emergencyContactName: e.target.value })
                  }
                  placeholder="Emergency contact name"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Emergency Contact Phone</Label>
                  <Input
                    value={editForm.emergencyContactPhone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, emergencyContactPhone: e.target.value })
                    }
                    placeholder="Emergency contact phone"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relationship to Athlete</Label>
                  <Input
                    value={editForm.emergencyContactRelationship}
                    onChange={(e) =>
                      setEditForm({ ...editForm, emergencyContactRelationship: e.target.value })
                    }
                    placeholder="Parent, Guardian, etc."
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact Email Address</Label>
                <Input
                  type="email"
                  value={editForm.emergencyContactEmail}
                  onChange={(e) =>
                    setEditForm({ ...editForm, emergencyContactEmail: e.target.value })
                  }
                  placeholder="Emergency contact email"
                  className="h-11 rounded-xl"
                />
              </div>
              {isOwner && editingMember?.role !== "owner" && (
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, role: value })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="athlete">Athlete</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editingMember?.role === "owner" && (
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    value="Head Coach"
                    disabled
                    className="h-11 rounded-xl bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Head Coach role cannot be changed
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={saving}
              className="rounded-xl"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Member Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Remove Member
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              {deletingMember?.name || deletingMember?.email} from your gym?
              They will no longer have access to events or team communications.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMember}
              disabled={deleting}
              className="rounded-xl"
            >
              {deleting ? "Removing..." : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
