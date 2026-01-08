"use client";

import {
  IconDotsVertical,
  IconEdit,
  IconMail,
  IconPhone,
  IconPlus,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { MobileMemberActions } from "@/components/mobile-member-actions";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGooglePlacesAutocomplete } from "@/hooks/use-google-places-autocomplete";
import { useIsMobile } from "@/hooks/use-mobile";

interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  altEmail?: string | null;
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
  const [homePhone, setHomePhone] = useState("");
  const addressInputRef = useRef<HTMLInputElement>(null);

  useGooglePlacesAutocomplete(addressInputRef, (address) => {
    setAddress(address);
  });
  const [workPhone, setWorkPhone] = useState("");
  const [cellPhone, setCellPhone] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [emergencyContactRelationship, setEmergencyContactRelationship] =
    useState("");
  const [emergencyContactEmail, setEmergencyContactEmail] = useState("");
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
    altEmail: "",
    homePhone: "",
    workPhone: "",
    cellPhone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    emergencyContactEmail: "",
    role: "",
  });
  const editAddressInputRef = useRef<HTMLInputElement>(null);

  useGooglePlacesAutocomplete(editAddressInputRef, (address) => {
    setEditForm({ ...editForm, address });
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete member state
  const [deletingMember, setDeletingMember] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Current user info
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const _isMobile = useIsMobile();

  // Mobile member actions drawer
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [isMemberDrawerOpen, setIsMemberDrawerOpen] = useState(false);

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
          : "An error occurred while fetching roster"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoster();
    fetchCurrentUser();
  }, [fetchRoster, fetchCurrentUser]);

  useEffect(() => {
    const handleOpenAddMember = () => {
      setIsAddMemberDialogOpen(true);
    };

    window.addEventListener("roster-open-add-member", handleOpenAddMember);
    return () => {
      window.removeEventListener("roster-open-add-member", handleOpenAddMember);
    };
  }, []);

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
        `Successfully sent ${result.invitations} invitation(s). ${result.errors > 0 ? `${result.errors} error(s) occurred.` : ""}`
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
            homePhone: homePhone.trim() || undefined,
            workPhone: workPhone.trim() || undefined,
            cellPhone: cellPhone.trim() || undefined,
            emergencyContactName: emergencyContactName.trim() || undefined,
            emergencyContactPhone: emergencyContactPhone.trim() || undefined,
            emergencyContactRelationship:
              emergencyContactRelationship.trim() || undefined,
            emergencyContactEmail: emergencyContactEmail.trim() || undefined,
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
      setHomePhone("");
      setWorkPhone("");
      setCellPhone("");
      setEmergencyContactName("");
      setEmergencyContactPhone("");
      setEmergencyContactRelationship("");
      setEmergencyContactEmail("");
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
      altEmail: member.altEmail || "",
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
      const updateData =
        editingMember.role === "owner" ? restForm : { ...restForm, role };

      // Convert empty strings to null for optional fields
      Object.keys(updateData).forEach((key) => {
        const typedKey = key as keyof typeof updateData;
        if (updateData[typedKey] === "") {
          (updateData[typedKey] as unknown) = null;
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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        description="Manage your gym's coaches and athletes"
        title="Roster Management"
      >
        <Dialog
          onOpenChange={setIsImportRosterDialogOpen}
          open={isImportRosterDialogOpen}
        >
          <DialogTrigger asChild>
            <Button
              className="gap-2 rounded-sm"
              data-show-text-mobile
              variant="outline"
            >
              <IconUpload className="h-4 w-4" />
              Import
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
              className={`cursor-pointer rounded-xl border border-dashed p-8 text-center transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
            >
              <input {...getInputProps()} />
              <p className="text-muted-foreground text-sm">
                {isDragActive
                  ? "Drop the file here"
                  : "Drag & drop a CSV or JSON file here, or click to select"}
              </p>
              <p className="mt-2 text-muted-foreground text-xs">
                CSV/JSON files only. Include 'email' and 'role' columns.
              </p>
            </div>
            {loading && (
              <div className="mt-4 text-center text-muted-foreground text-sm">
                Processing...
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-destructive/10 p-3 text-destructive text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl bg-green-500/10 p-3 text-green-600 text-sm">
                {success}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          onOpenChange={(open) => {
            setIsAddMemberDialogOpen(open);
            if (!open) {
              // Reset all fields when dialog closes
              setEmail("");
              setName("");
              setPhone("");
              setAddress("");
              setHomePhone("");
              setWorkPhone("");
              setCellPhone("");
              setEmergencyContactName("");
              setEmergencyContactPhone("");
              setEmergencyContactRelationship("");
              setEmergencyContactEmail("");
              setError(null);
              setSuccess(null);
            }
          }}
          open={isAddMemberDialogOpen}
        >
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-sm" data-show-text-mobile>
              <IconPlus className="h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="inset-0! top-0! left-0! m-0! flex h-screen! max-h-screen! w-screen! max-w-none! translate-x-0! translate-y-0! flex-col rounded-none! p-0!">
            <div className="flex min-h-0 flex-1 flex-col">
              <DialogHeader className="shrink-0 border-b bg-background px-6 pt-6 pb-4 dark:border-border/70">
                <DialogTitle className="text-2xl">Add New Member</DialogTitle>
                <DialogDescription>
                  Invite a single coach or athlete by email.
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto max-w-5xl p-6 pb-24">
                  <form
                    className="space-y-8"
                    id="add-member-form"
                    onSubmit={handleManualInvite}
                  >
                    {error && (
                      <div className="rounded-xl bg-destructive/10 p-4 text-destructive text-sm">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="rounded-xl bg-green-500/10 p-4 text-green-600 text-sm">
                        {success}
                      </div>
                    )}

                    {/* Basic Information */}
                    <div className="rounded-xl bg-muted/30 p-6">
                      <h3 className="mb-6 font-semibold text-foreground text-lg">
                        Basic Information
                      </h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            className="h-11 rounded-xl"
                            id="email"
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@example.com"
                            required
                            type="email"
                            value={email}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input
                            className="h-11 rounded-xl"
                            id="name"
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Full name"
                            type="text"
                            value={name}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="role">Role</Label>
                          <Select
                            onValueChange={(value) =>
                              setRole(value as "coach" | "athlete")
                            }
                            value={role}
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
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="rounded-xl bg-muted/30 p-6">
                      <h3 className="mb-6 font-semibold text-foreground text-lg">
                        Contact Information
                      </h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Primary Phone</Label>
                          <Input
                            className="h-11 rounded-xl"
                            id="phone"
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Phone number"
                            type="tel"
                            value={phone}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="address">Address</Label>
                          <Input
                            autoComplete="off"
                            className="h-11 rounded-xl"
                            id="address"
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Street address"
                            ref={addressInputRef}
                            type="text"
                            value={address}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cellPhone">Cell Phone</Label>
                          <Input
                            className="h-11 rounded-xl"
                            id="cellPhone"
                            onChange={(e) => setCellPhone(e.target.value)}
                            placeholder="Cell phone"
                            type="tel"
                            value={cellPhone}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="homePhone">Home Phone</Label>
                          <Input
                            className="h-11 rounded-xl"
                            id="homePhone"
                            onChange={(e) => setHomePhone(e.target.value)}
                            placeholder="Home phone"
                            type="tel"
                            value={homePhone}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="workPhone">Work Phone</Label>
                          <Input
                            className="h-11 rounded-xl"
                            id="workPhone"
                            onChange={(e) => setWorkPhone(e.target.value)}
                            placeholder="Work phone"
                            type="tel"
                            value={workPhone}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="rounded-xl bg-muted/30 p-6">
                      <h3 className="mb-6 font-semibold text-foreground text-lg">
                        Emergency Contact
                      </h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="emergencyContactName">Name</Label>
                          <Input
                            className="h-11 rounded-xl"
                            id="emergencyContactName"
                            onChange={(e) =>
                              setEmergencyContactName(e.target.value)
                            }
                            placeholder="Emergency contact name"
                            type="text"
                            value={emergencyContactName}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="emergencyContactRelationship">
                            Relationship
                          </Label>
                          <Input
                            className="h-11 rounded-xl"
                            id="emergencyContactRelationship"
                            onChange={(e) =>
                              setEmergencyContactRelationship(e.target.value)
                            }
                            placeholder="e.g., Parent, Spouse"
                            type="text"
                            value={emergencyContactRelationship}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="emergencyContactPhone">Phone</Label>
                          <Input
                            className="h-11 rounded-xl"
                            id="emergencyContactPhone"
                            onChange={(e) =>
                              setEmergencyContactPhone(e.target.value)
                            }
                            placeholder="Emergency contact phone"
                            type="tel"
                            value={emergencyContactPhone}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="emergencyContactEmail">Email</Label>
                          <Input
                            className="h-11 rounded-xl"
                            id="emergencyContactEmail"
                            onChange={(e) =>
                              setEmergencyContactEmail(e.target.value)
                            }
                            placeholder="Emergency contact email"
                            type="email"
                            value={emergencyContactEmail}
                          />
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
              <div className="sticky bottom-0 z-10 shrink-0 border-t bg-background px-6 py-4 dark:border-border/70">
                <div className="flex justify-end gap-3">
                  <Button
                    className="rounded-xl"
                    onClick={() => setIsAddMemberDialogOpen(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="rounded-xl"
                    disabled={loading || !email}
                    form="add-member-form"
                    type="submit"
                  >
                    {loading ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          <div className="space-y-4">
            {loading && roster.length === 0 ? (
              <Card className="rounded-none sm:rounded-xl">
                <CardHeader>
                  <Skeleton className="mb-2 h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-400px)] min-h-[300px]">
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          className="flex items-center justify-between rounded-xl p-3"
                          key={i}
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
              <Card className="rounded-none sm:rounded-xl">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No members in your gym yet. Add one to get started!
                </CardContent>
              </Card>
            ) : (
              <div className="flex h-full w-full flex-col">
                <div className="min-h-0 flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div>
                      {/* Coaches Section */}
                      {roster.filter(
                        (m) => m.role === "coach" || m.role === "owner"
                      ).length > 0 && (
                        <div className="my-8 lg:mb-6">
                          <div className="mb-5 flex items-center gap-3 px-4 lg:mb-3 lg:px-6">
                            <h3 className="shrink-0 font-semibold text-base text-foreground lg:text-muted-foreground lg:text-sm">
                              Coaches (
                              {
                                roster.filter(
                                  (m) =>
                                    m.role === "coach" || m.role === "owner"
                                ).length
                              }
                              )
                            </h3>
                            <hr className="flex-1 border-border/50 dark:border-border/70" />
                          </div>
                          {/* Mobile List View */}
                          <div className="lg:hidden">
                            {roster
                              .filter(
                                (m) => m.role === "coach" || m.role === "owner"
                              )
                              .map((member) => (
                                <button
                                  className="flex w-full items-center gap-3 border-border/50 border-b px-4 py-3 transition-colors last:border-b-0 active:bg-muted/50 dark:border-border/70"
                                  key={member.id}
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setIsMemberDrawerOpen(true);
                                  }}
                                  type="button"
                                >
                                  <Avatar className="h-11 w-11 shrink-0 rounded-full">
                                    <AvatarImage
                                      alt={member.name || member.email}
                                      src={member.avatarUrl || undefined}
                                    />
                                    <AvatarFallback className="rounded-full font-medium text-sm">
                                      {member.name
                                        ? member.name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase()
                                            .slice(0, 2)
                                        : member.email.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1 text-left">
                                    <div className="mb-0.5 flex items-center gap-2">
                                      <span className="truncate font-medium text-sm">
                                        {member.name || "Unnamed"}
                                      </span>
                                      <Badge
                                        className="h-4 shrink-0 rounded-full px-1.5 py-0 font-medium text-[9px]"
                                        variant={
                                          member.role === "owner"
                                            ? "default"
                                            : "secondary"
                                        }
                                      >
                                        {formatRoleDisplay(member.role)}
                                      </Badge>
                                    </div>
                                    <p className="truncate text-muted-foreground text-xs">
                                      {member.email}
                                    </p>
                                  </div>
                                </button>
                              ))}
                          </div>
                          {/* Desktop Table View */}
                          <div className="hidden lg:block">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[200px]">
                                    Name
                                  </TableHead>
                                  <TableHead className="w-[150px]">
                                    Phone
                                  </TableHead>
                                  <TableHead className="w-[100px] text-right">
                                    Actions
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {roster
                                  .filter(
                                    (m) =>
                                      m.role === "coach" || m.role === "owner"
                                  )
                                  .map((member) => (
                                    <TableRow className="group" key={member.id}>
                                      <TableCell>
                                        <Link
                                          className="flex items-center gap-3 hover:underline"
                                          href={`/roster/${member.id}`}
                                        >
                                          <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                                            <AvatarImage
                                              alt={member.name || member.email}
                                              src={
                                                member.avatarUrl || undefined
                                              }
                                            />
                                            <AvatarFallback className="rounded-lg font-semibold text-xs">
                                              {member.name
                                                ? member.name
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")
                                                    .toUpperCase()
                                                    .slice(0, 2)
                                                : member.email
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2 font-medium text-sm">
                                              {member.name || "Unnamed"}
                                              <Badge
                                                className="rounded-md px-1.5 py-0 text-[10px]"
                                                variant={
                                                  member.role === "owner"
                                                    ? "default"
                                                    : "secondary"
                                                }
                                              >
                                                {formatRoleDisplay(member.role)}
                                              </Badge>
                                            </div>
                                            <button
                                              className="m-0 block cursor-pointer truncate border-0 bg-transparent p-0 text-left text-muted-foreground text-xs hover:text-foreground hover:underline"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.location.href = `mailto:${member.email}`;
                                              }}
                                              type="button"
                                            >
                                              {member.email}
                                            </button>
                                            {member.altEmail && (
                                              <button
                                                className="m-0 block cursor-pointer truncate border-0 bg-transparent p-0 text-left text-muted-foreground/70 text-xs hover:text-foreground hover:underline"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  window.location.href = `mailto:${member.altEmail}`;
                                                }}
                                                type="button"
                                              >
                                                {member.altEmail}
                                              </button>
                                            )}
                                          </div>
                                        </Link>
                                      </TableCell>
                                      <TableCell>
                                        {member.phone ? (
                                          <a
                                            className="flex items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground hover:underline"
                                            href={`tel:${member.phone.replace(/\D/g, "")}`}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <IconPhone className="h-3.5 w-3.5 shrink-0" />
                                            <span>{member.phone}</span>
                                          </a>
                                        ) : (
                                          <span className="text-muted-foreground text-sm">
                                            —
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <a
                                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted transition-colors hover:bg-primary/10"
                                            href={`mailto:${member.email}`}
                                            onClick={(e) => e.stopPropagation()}
                                            title="Email"
                                          >
                                            <IconMail className="h-4 w-4 text-muted-foreground" />
                                          </a>
                                          {member.phone && (
                                            <a
                                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted transition-colors hover:bg-primary/10"
                                              href={`tel:${member.phone.replace(/\D/g, "")}`}
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              title="Call"
                                            >
                                              <IconPhone className="h-4 w-4 text-muted-foreground" />
                                            </a>
                                          )}
                                          {(isOwner ||
                                            (currentUserRole === "coach" &&
                                              member.role === "athlete")) && (
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  className="h-8 w-8"
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                  size="icon"
                                                  variant="ghost"
                                                >
                                                  <IconDotsVertical className="h-4 w-4" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent
                                                align="end"
                                                className="rounded-xl"
                                              >
                                                <DropdownMenuItem
                                                  className="gap-2"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditDialog(member);
                                                  }}
                                                >
                                                  <IconEdit className="h-4 w-4" />
                                                  Edit Member
                                                </DropdownMenuItem>
                                                {isOwner &&
                                                  member.role !== "owner" && (
                                                    <>
                                                      <DropdownMenuSeparator />
                                                      <DropdownMenuItem
                                                        className="gap-2 text-destructive focus:text-destructive"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openDeleteDialog(
                                                            member
                                                          );
                                                        }}
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
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

                      {/* Athletes Section */}
                      {roster.filter((m) => m.role === "athlete").length >
                        0 && (
                        <div>
                          <div className="mb-5 flex items-center gap-3 px-4 lg:mb-3 lg:px-6">
                            <h3 className="shrink-0 font-semibold text-base text-foreground lg:text-muted-foreground lg:text-sm">
                              Athletes (
                              {
                                roster.filter((m) => m.role === "athlete")
                                  .length
                              }
                              )
                            </h3>
                            <hr className="flex-1 border-border/50 dark:border-border/70" />
                          </div>
                          {/* Mobile List View */}
                          <div className="lg:hidden">
                            {roster
                              .filter((m) => m.role === "athlete")
                              .map((member) => (
                                <button
                                  className="flex w-full items-center gap-3 border-border/50 border-b px-4 py-3 transition-colors last:border-b-0 active:bg-muted/50 dark:border-border/70"
                                  key={member.id}
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setIsMemberDrawerOpen(true);
                                  }}
                                  type="button"
                                >
                                  <Avatar className="h-11 w-11 shrink-0 rounded-full">
                                    <AvatarImage
                                      alt={member.name || member.email}
                                      src={member.avatarUrl || undefined}
                                    />
                                    <AvatarFallback className="rounded-full font-medium text-sm">
                                      {member.name
                                        ? member.name
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase()
                                            .slice(0, 2)
                                        : member.email.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1 text-left">
                                    <span className="mb-0.5 block truncate font-medium text-sm">
                                      {member.name || "Unnamed"}
                                    </span>
                                    <p className="truncate text-muted-foreground text-xs">
                                      {member.email}
                                    </p>
                                  </div>
                                </button>
                              ))}
                          </div>
                          {/* Desktop Table View */}
                          <div className="hidden lg:block">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[200px]">
                                    Name
                                  </TableHead>
                                  <TableHead className="w-[180px]">
                                    Phone
                                  </TableHead>
                                  <TableHead className="w-[200px]">
                                    Emergency Contact
                                  </TableHead>
                                  <TableHead className="w-[120px] text-right">
                                    Actions
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {roster
                                  .filter((m) => m.role === "athlete")
                                  .map((member) => (
                                    <TableRow className="group" key={member.id}>
                                      <TableCell>
                                        <Link
                                          className="flex items-center gap-3 hover:underline"
                                          href={`/roster/${member.id}`}
                                        >
                                          <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                                            <AvatarImage
                                              alt={member.name || member.email}
                                              src={
                                                member.avatarUrl || undefined
                                              }
                                            />
                                            <AvatarFallback className="rounded-lg font-semibold text-xs">
                                              {member.name
                                                ? member.name
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")
                                                    .toUpperCase()
                                                    .slice(0, 2)
                                                : member.email
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="min-w-0">
                                            <div className="font-medium text-sm">
                                              {member.name || "Unnamed"}
                                            </div>
                                            <button
                                              className="m-0 block cursor-pointer truncate border-0 bg-transparent p-0 text-left text-muted-foreground text-xs hover:text-foreground hover:underline"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.location.href = `mailto:${member.email}`;
                                              }}
                                              type="button"
                                            >
                                              {member.email}
                                            </button>
                                            {member.altEmail && (
                                              <button
                                                className="m-0 block cursor-pointer truncate border-0 bg-transparent p-0 text-left text-muted-foreground/70 text-xs hover:text-foreground hover:underline"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  window.location.href = `mailto:${member.altEmail}`;
                                                }}
                                                type="button"
                                              >
                                                {member.altEmail}
                                              </button>
                                            )}
                                          </div>
                                        </Link>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex flex-col gap-1 text-sm">
                                          {member.cellPhone && (
                                            <a
                                              className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                                              href={`tel:${member.cellPhone.replace(/\D/g, "")}`}
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                            >
                                              <IconPhone className="h-3 w-3 shrink-0" />
                                              <span>
                                                Cell: {member.cellPhone}
                                              </span>
                                            </a>
                                          )}
                                          {member.homePhone && (
                                            <a
                                              className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                                              href={`tel:${member.homePhone.replace(/\D/g, "")}`}
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                            >
                                              <IconPhone className="h-3 w-3 shrink-0" />
                                              <span>
                                                Home: {member.homePhone}
                                              </span>
                                            </a>
                                          )}
                                          {member.workPhone && (
                                            <a
                                              className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                                              href={`tel:${member.workPhone.replace(/\D/g, "")}`}
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                            >
                                              <IconPhone className="h-3 w-3 shrink-0" />
                                              <span>
                                                Work: {member.workPhone}
                                              </span>
                                            </a>
                                          )}
                                          {member.phone &&
                                            !member.cellPhone &&
                                            !member.homePhone &&
                                            !member.workPhone && (
                                              <a
                                                className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                                                href={`tel:${member.phone.replace(/\D/g, "")}`}
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              >
                                                <IconPhone className="h-3 w-3 shrink-0" />
                                                <span>{member.phone}</span>
                                              </a>
                                            )}
                                          {!(
                                            member.cellPhone ||
                                            member.homePhone ||
                                            member.workPhone ||
                                            member.phone
                                          ) && (
                                            <span className="text-muted-foreground">
                                              —
                                            </span>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        {member.emergencyContactName ? (
                                          <div className="flex flex-col gap-1 text-sm">
                                            <span className="text-muted-foreground">
                                              {member.emergencyContactName}
                                              {member.emergencyContactRelationship && (
                                                <span className="text-muted-foreground/70">
                                                  {" "}
                                                  (
                                                  {
                                                    member.emergencyContactRelationship
                                                  }
                                                  )
                                                </span>
                                              )}
                                            </span>
                                            {member.emergencyContactPhone && (
                                              <a
                                                className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                                                href={`tel:${member.emergencyContactPhone.replace(/\D/g, "")}`}
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              >
                                                <IconPhone className="h-3 w-3 shrink-0" />
                                                <span>
                                                  {member.emergencyContactPhone}
                                                </span>
                                              </a>
                                            )}
                                            {member.emergencyContactEmail && (
                                              <a
                                                className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                                                href={`mailto:${member.emergencyContactEmail}`}
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              >
                                                <IconMail className="h-3 w-3 shrink-0" />
                                                <span className="truncate">
                                                  {member.emergencyContactEmail}
                                                </span>
                                              </a>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground text-sm">
                                            —
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <a
                                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted transition-colors hover:bg-primary/10"
                                            href={`mailto:${member.email}`}
                                            onClick={(e) => e.stopPropagation()}
                                            title="Email"
                                          >
                                            <IconMail className="h-4 w-4 text-muted-foreground" />
                                          </a>
                                          {(member.cellPhone ||
                                            member.phone) && (
                                            <a
                                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted transition-colors hover:bg-primary/10"
                                              href={`tel:${(member.cellPhone || member.phone || "").replace(/\D/g, "")}`}
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              title="Call"
                                            >
                                              <IconPhone className="h-4 w-4 text-muted-foreground" />
                                            </a>
                                          )}
                                          {(isOwner ||
                                            (currentUserRole === "coach" &&
                                              member.role === "athlete")) && (
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  className="h-8 w-8"
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                  size="icon"
                                                  variant="ghost"
                                                >
                                                  <IconDotsVertical className="h-4 w-4" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent
                                                align="end"
                                                className="rounded-xl"
                                              >
                                                <DropdownMenuItem
                                                  className="gap-2"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openEditDialog(member);
                                                  }}
                                                >
                                                  <IconEdit className="h-4 w-4" />
                                                  Edit Member
                                                </DropdownMenuItem>
                                                {isOwner &&
                                                  member.role !== "owner" && (
                                                    <>
                                                      <DropdownMenuSeparator />
                                                      <DropdownMenuItem
                                                        className="gap-2 text-destructive focus:text-destructive"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openDeleteDialog(
                                                            member
                                                          );
                                                        }}
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
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Member Dialog */}
      <Dialog onOpenChange={setIsEditDialogOpen} open={isEditDialogOpen}>
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
                <div className="rounded-xl bg-destructive/10 p-3 text-destructive text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label>Athlete Name</Label>
                <Input
                  className="h-11 rounded-xl"
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  placeholder="Full name"
                  value={editForm.name}
                />
              </div>
              <div className="space-y-2">
                <Label>Athlete Address</Label>
                <Input
                  autoComplete="off"
                  className="h-11 rounded-xl"
                  onChange={(e) =>
                    setEditForm({ ...editForm, address: e.target.value })
                  }
                  placeholder="Address"
                  ref={editAddressInputRef}
                  value={editForm.address}
                />
              </div>
              <div className="space-y-2">
                <Label>Alternate Email</Label>
                <Input
                  className="h-11 rounded-xl"
                  onChange={(e) =>
                    setEditForm({ ...editForm, altEmail: e.target.value })
                  }
                  placeholder="Alternate email address"
                  type="email"
                  value={editForm.altEmail}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Home Phone Number</Label>
                  <Input
                    className="h-11 rounded-xl"
                    onChange={(e) =>
                      setEditForm({ ...editForm, homePhone: e.target.value })
                    }
                    placeholder="Home phone"
                    value={editForm.homePhone}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Work Phone Number</Label>
                  <Input
                    className="h-11 rounded-xl"
                    onChange={(e) =>
                      setEditForm({ ...editForm, workPhone: e.target.value })
                    }
                    placeholder="Work phone"
                    value={editForm.workPhone}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cell Number</Label>
                <Input
                  className="h-11 rounded-xl"
                  onChange={(e) =>
                    setEditForm({ ...editForm, cellPhone: e.target.value })
                  }
                  placeholder="Cell phone"
                  value={editForm.cellPhone}
                />
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact Name</Label>
                <Input
                  className="h-11 rounded-xl"
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      emergencyContactName: e.target.value,
                    })
                  }
                  placeholder="Emergency contact name"
                  value={editForm.emergencyContactName}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Emergency Contact Phone</Label>
                  <Input
                    className="h-11 rounded-xl"
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        emergencyContactPhone: e.target.value,
                      })
                    }
                    placeholder="Emergency contact phone"
                    value={editForm.emergencyContactPhone}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relationship to Athlete</Label>
                  <Input
                    className="h-11 rounded-xl"
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        emergencyContactRelationship: e.target.value,
                      })
                    }
                    placeholder="Parent, Guardian, etc."
                    value={editForm.emergencyContactRelationship}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact Email Address</Label>
                <Input
                  className="h-11 rounded-xl"
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      emergencyContactEmail: e.target.value,
                    })
                  }
                  placeholder="Emergency contact email"
                  type="email"
                  value={editForm.emergencyContactEmail}
                />
              </div>
              {isOwner && editingMember?.role !== "owner" && (
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, role: value })
                    }
                    value={editForm.role}
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
                    className="h-11 rounded-xl bg-muted"
                    disabled
                    value="Head Coach"
                  />
                  <p className="text-muted-foreground text-xs">
                    Head Coach role cannot be changed
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              className="rounded-xl"
              onClick={() => setIsEditDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              disabled={saving}
              onClick={handleSaveEdit}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Member Dialog */}
      <Dialog onOpenChange={setIsDeleteDialogOpen} open={isDeleteDialogOpen}>
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
              className="rounded-xl"
              onClick={() => setIsDeleteDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl"
              disabled={deleting}
              onClick={handleDeleteMember}
              variant="destructive"
            >
              {deleting ? "Removing..." : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Member Actions Drawer */}
      {selectedMember && (
        <MobileMemberActions
          isOwner={isOwner}
          member={selectedMember}
          onDelete={() => {
            setIsMemberDrawerOpen(false);
            openDeleteDialog(selectedMember);
          }}
          onEdit={() => {
            setIsMemberDrawerOpen(false);
            openEditDialog(selectedMember);
          }}
          onOpenChange={setIsMemberDrawerOpen}
          open={isMemberDrawerOpen}
          userRole={currentUserRole}
        />
      )}
    </div>
  );
}
