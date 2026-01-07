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
import { MobileMemberActions } from "@/components/mobile-member-actions";

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
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl sm:rounded-xl sm:size-auto sm:px-4 sm:gap-2"
            >
              <IconUpload className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Import</span>
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
        >
          <DialogTrigger asChild>
            <Button
              size="icon"
              className="rounded-xl sm:rounded-xl sm:size-auto sm:px-4 sm:gap-2"
            >
              <IconPlus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Member</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="!rounded-none !max-w-none !w-screen !h-screen !max-h-screen !m-0 !p-0 !inset-0 !translate-x-0 !translate-y-0 !top-0 !left-0 flex flex-col">
            <div className="flex-1 min-h-0 flex flex-col">
              <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b dark:border-border/70 bg-background">
                <DialogTitle className="text-2xl">Add New Member</DialogTitle>
                <DialogDescription>
                  Invite a single coach or athlete by email.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-6 pb-24 max-w-5xl mx-auto">
                  <form
                    id="add-member-form"
                    onSubmit={handleManualInvite}
                    className="space-y-8"
                  >
                    {error && (
                      <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-sm">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="bg-green-500/10 text-green-600 rounded-xl p-4 text-sm">
                        {success}
                      </div>
                    )}

                    {/* Basic Information */}
                    <div className="bg-muted/30 rounded-xl p-6">
                      <h3 className="font-semibold text-lg mb-6 text-foreground">
                        Basic Information
                      </h3>
                      <div className="grid grid-cols-2 gap-6">
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
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-muted/30 rounded-xl p-6">
                      <h3 className="font-semibold text-lg mb-6 text-foreground">
                        Contact Information
                      </h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Primary Phone</Label>
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
                            ref={addressInputRef}
                            id="address"
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Street address"
                            className="h-11 rounded-xl"
                            autoComplete="off"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cellPhone">Cell Phone</Label>
                          <Input
                            id="cellPhone"
                            type="tel"
                            value={cellPhone}
                            onChange={(e) => setCellPhone(e.target.value)}
                            placeholder="Cell phone"
                            className="h-11 rounded-xl"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="homePhone">Home Phone</Label>
                          <Input
                            id="homePhone"
                            type="tel"
                            value={homePhone}
                            onChange={(e) => setHomePhone(e.target.value)}
                            placeholder="Home phone"
                            className="h-11 rounded-xl"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="workPhone">Work Phone</Label>
                          <Input
                            id="workPhone"
                            type="tel"
                            value={workPhone}
                            onChange={(e) => setWorkPhone(e.target.value)}
                            placeholder="Work phone"
                            className="h-11 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="bg-muted/30 rounded-xl p-6">
                      <h3 className="font-semibold text-lg mb-6 text-foreground">
                        Emergency Contact
                      </h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="emergencyContactName">Name</Label>
                          <Input
                            id="emergencyContactName"
                            type="text"
                            value={emergencyContactName}
                            onChange={(e) =>
                              setEmergencyContactName(e.target.value)
                            }
                            placeholder="Emergency contact name"
                            className="h-11 rounded-xl"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="emergencyContactRelationship">
                            Relationship
                          </Label>
                          <Input
                            id="emergencyContactRelationship"
                            type="text"
                            value={emergencyContactRelationship}
                            onChange={(e) =>
                              setEmergencyContactRelationship(e.target.value)
                            }
                            placeholder="e.g., Parent, Spouse"
                            className="h-11 rounded-xl"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="emergencyContactPhone">Phone</Label>
                          <Input
                            id="emergencyContactPhone"
                            type="tel"
                            value={emergencyContactPhone}
                            onChange={(e) =>
                              setEmergencyContactPhone(e.target.value)
                            }
                            placeholder="Emergency contact phone"
                            className="h-11 rounded-xl"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="emergencyContactEmail">Email</Label>
                          <Input
                            id="emergencyContactEmail"
                            type="email"
                            value={emergencyContactEmail}
                            onChange={(e) =>
                              setEmergencyContactEmail(e.target.value)
                            }
                            placeholder="Emergency contact email"
                            className="h-11 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
              <div className="shrink-0 px-6 py-4 border-t dark:border-border/70 bg-background sticky bottom-0 z-10">
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddMemberDialogOpen(false)}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    form="add-member-form"
                    disabled={loading || !email}
                    className="rounded-xl"
                  >
                    {loading ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex-1 overflow-hidden min-h-0">
        <div className="h-full overflow-auto">
          <div className="space-y-4">
            {loading && roster.length === 0 ? (
              <Card className="rounded-none sm:rounded-xl">
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
              <Card className="rounded-none sm:rounded-xl">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No members in your gym yet. Add one to get started!
                </CardContent>
              </Card>
            ) : (
              <div className="w-full h-full flex flex-col">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div>
                      {/* Coaches Section */}
                      {roster.filter(
                        (m) => m.role === "coach" || m.role === "owner",
                      ).length > 0 && (
                        <div className="my-8 lg:mb-6">
                          <div className="flex items-center gap-3 px-4 lg:px-6 mb-5 lg:mb-3">
                            <h3 className="font-semibold text-base text-foreground lg:text-sm lg:text-muted-foreground shrink-0">
                            Coaches (
                            {
                              roster.filter(
                                (m) => m.role === "coach" || m.role === "owner",
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
                                (m) => m.role === "coach" || m.role === "owner",
                              )
                              .map((member) => (
                                <button
                                  key={member.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setIsMemberDrawerOpen(true);
                                  }}
                                  className="w-full px-4 py-3 flex items-center gap-3 active:bg-muted/50 transition-colors border-b border-border/50 dark:border-border/70 last:border-b-0"
                                >
                                  <Avatar className="h-11 w-11 rounded-full shrink-0">
                                            <AvatarImage
                                      src={member.avatarUrl || undefined}
                                              alt={member.name || member.email}
                                            />
                                    <AvatarFallback className="rounded-full text-sm font-medium">
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
                                  <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="font-medium text-sm truncate">
                                              {member.name || "Unnamed"}
                                      </span>
                                              <Badge
                                                variant={
                                                  member.role === "owner"
                                                    ? "default"
                                                    : "secondary"
                                                }
                                        className="rounded-full text-[9px] px-1.5 py-0 shrink-0 font-medium h-4"
                                              >
                                                {formatRoleDisplay(member.role)}
                                              </Badge>
                                            </div>
                                    <p className="text-xs text-muted-foreground truncate">
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
                                      m.role === "coach" || m.role === "owner",
                                  )
                                  .map((member) => (
                                    <TableRow key={member.id} className="group">
                                      <TableCell>
                                        <Link
                                          href={`/roster/${member.id}`}
                                          className="flex items-center gap-3 hover:underline"
                                        >
                                          <Avatar className="h-8 w-8 rounded-lg shrink-0">
                                            <AvatarImage
                                              src={
                                                member.avatarUrl || undefined
                                              }
                                              alt={member.name || member.email}
                                            />
                                            <AvatarFallback className="rounded-lg text-xs font-semibold">
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
                                            <div className="font-medium text-sm flex items-center gap-2">
                                              {member.name || "Unnamed"}
                                              <Badge
                                                variant={
                                                  member.role === "owner"
                                                    ? "default"
                                                    : "secondary"
                                                }
                                                className="rounded-md text-[10px] px-1.5 py-0"
                                              >
                                                {formatRoleDisplay(member.role)}
                                              </Badge>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.location.href = `mailto:${member.email}`;
                                              }}
                                              className="text-xs text-muted-foreground hover:text-foreground hover:underline truncate block cursor-pointer text-left bg-transparent border-0 p-0 m-0"
                                            >
                                              {member.email}
                                            </button>
                                            {member.altEmail && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  window.location.href = `mailto:${member.altEmail}`;
                                                }}
                                                className="text-xs text-muted-foreground/70 hover:text-foreground hover:underline truncate block cursor-pointer text-left bg-transparent border-0 p-0 m-0"
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
                                            href={`tel:${member.phone.replace(/\D/g, "")}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
                                          >
                                            <IconPhone className="h-3.5 w-3.5 shrink-0" />
                                            <span>{member.phone}</span>
                                          </a>
                                        ) : (
                                          <span className="text-sm text-muted-foreground">
                                            —
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <a
                                            href={`mailto:${member.email}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-8 w-8 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors"
                                            title="Email"
                                          >
                                            <IconMail className="h-4 w-4 text-muted-foreground" />
                                          </a>
                                          {member.phone && (
                                            <a
                                              href={`tel:${member.phone.replace(/\D/g, "")}`}
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="h-8 w-8 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors"
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
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8"
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
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
                                                {isOwner &&
                                                  member.role !== "owner" && (
                                                    <>
                                                      <DropdownMenuSeparator />
                                                      <DropdownMenuItem
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openDeleteDialog(
                                                            member,
                                                          );
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
                          <div className="flex items-center gap-3 px-4 lg:px-6 mb-5 lg:mb-3">
                            <h3 className="font-semibold text-base text-foreground lg:text-sm lg:text-muted-foreground shrink-0">
                            Athletes (
                            {roster.filter((m) => m.role === "athlete").length})
                          </h3>
                            <hr className="flex-1 border-border/50 dark:border-border/70" />
                          </div>
                          {/* Mobile List View */}
                          <div className="lg:hidden">
                            {roster
                              .filter((m) => m.role === "athlete")
                              .map((member) => (
                                <button
                                  key={member.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setIsMemberDrawerOpen(true);
                                  }}
                                  className="w-full px-4 py-3 flex items-center gap-3 active:bg-muted/50 transition-colors border-b border-border/50 dark:border-border/70 last:border-b-0"
                                >
                                  <Avatar className="h-11 w-11 rounded-full shrink-0">
                                            <AvatarImage
                                      src={member.avatarUrl || undefined}
                                              alt={member.name || member.email}
                                            />
                                    <AvatarFallback className="rounded-full text-sm font-medium">
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
                                  <div className="flex-1 min-w-0 text-left">
                                    <span className="font-medium text-sm truncate block mb-0.5">
                                              {member.name || "Unnamed"}
                                    </span>
                                    <p className="text-xs text-muted-foreground truncate">
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
                                    <TableRow key={member.id} className="group">
                                      <TableCell>
                                        <Link
                                          href={`/roster/${member.id}`}
                                          className="flex items-center gap-3 hover:underline"
                                        >
                                          <Avatar className="h-8 w-8 rounded-lg shrink-0">
                                            <AvatarImage
                                              src={
                                                member.avatarUrl || undefined
                                              }
                                              alt={member.name || member.email}
                                            />
                                            <AvatarFallback className="rounded-lg text-xs font-semibold">
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
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.location.href = `mailto:${member.email}`;
                                              }}
                                              className="text-xs text-muted-foreground hover:text-foreground hover:underline truncate block cursor-pointer text-left bg-transparent border-0 p-0 m-0"
                                            >
                                              {member.email}
                                            </button>
                                            {member.altEmail && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  window.location.href = `mailto:${member.altEmail}`;
                                                }}
                                                className="text-xs text-muted-foreground/70 hover:text-foreground hover:underline truncate block cursor-pointer text-left bg-transparent border-0 p-0 m-0"
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
                                              href={`tel:${member.cellPhone.replace(/\D/g, "")}`}
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                                            >
                                              <IconPhone className="h-3 w-3 shrink-0" />
                                              <span>
                                                Cell: {member.cellPhone}
                                              </span>
                                            </a>
                                          )}
                                          {member.homePhone && (
                                            <a
                                              href={`tel:${member.homePhone.replace(/\D/g, "")}`}
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                                            >
                                              <IconPhone className="h-3 w-3 shrink-0" />
                                              <span>
                                                Home: {member.homePhone}
                                              </span>
                                            </a>
                                          )}
                                          {member.workPhone && (
                                            <a
                                              href={`tel:${member.workPhone.replace(/\D/g, "")}`}
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
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
                                                href={`tel:${member.phone.replace(/\D/g, "")}`}
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                                className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                                              >
                                                <IconPhone className="h-3 w-3 shrink-0" />
                                                <span>{member.phone}</span>
                                              </a>
                                            )}
                                          {!member.cellPhone &&
                                            !member.homePhone &&
                                            !member.workPhone &&
                                            !member.phone && (
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
                                                href={`tel:${member.emergencyContactPhone.replace(/\D/g, "")}`}
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                                className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                                              >
                                                <IconPhone className="h-3 w-3 shrink-0" />
                                                <span>
                                                  {member.emergencyContactPhone}
                                                </span>
                                              </a>
                                            )}
                                            {member.emergencyContactEmail && (
                                              <a
                                                href={`mailto:${member.emergencyContactEmail}`}
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                                className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                                              >
                                                <IconMail className="h-3 w-3 shrink-0" />
                                                <span className="truncate">
                                                  {member.emergencyContactEmail}
                                                </span>
                                              </a>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-sm text-muted-foreground">
                                            —
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <a
                                            href={`mailto:${member.email}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="h-8 w-8 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors"
                                            title="Email"
                                          >
                                            <IconMail className="h-4 w-4 text-muted-foreground" />
                                          </a>
                                          {(member.cellPhone ||
                                            member.phone) && (
                                            <a
                                              href={`tel:${(member.cellPhone || member.phone || "").replace(/\D/g, "")}`}
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="h-8 w-8 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors"
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
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8"
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
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
                                                {isOwner &&
                                                  member.role !== "owner" && (
                                                    <>
                                                      <DropdownMenuSeparator />
                                                      <DropdownMenuItem
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          openDeleteDialog(
                                                            member,
                                                          );
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
                  ref={editAddressInputRef}
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, address: e.target.value })
                  }
                  placeholder="Address"
                  className="h-11 rounded-xl"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label>Alternate Email</Label>
                <Input
                  type="email"
                  value={editForm.altEmail}
                  onChange={(e) =>
                    setEditForm({ ...editForm, altEmail: e.target.value })
                  }
                  placeholder="Alternate email address"
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
                    setEditForm({
                      ...editForm,
                      emergencyContactName: e.target.value,
                    })
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
                      setEditForm({
                        ...editForm,
                        emergencyContactPhone: e.target.value,
                      })
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
                      setEditForm({
                        ...editForm,
                        emergencyContactRelationship: e.target.value,
                      })
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
                    setEditForm({
                      ...editForm,
                      emergencyContactEmail: e.target.value,
                    })
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

      {/* Mobile Member Actions Drawer */}
      {selectedMember && (
        <MobileMemberActions
          member={selectedMember}
          userRole={currentUserRole}
          isOwner={isOwner}
          open={isMemberDrawerOpen}
          onOpenChange={setIsMemberDrawerOpen}
          onEdit={() => {
            setIsMemberDrawerOpen(false);
            openEditDialog(selectedMember);
          }}
          onDelete={() => {
            setIsMemberDrawerOpen(false);
            openDeleteDialog(selectedMember);
          }}
        />
      )}
    </div>
  );
}
