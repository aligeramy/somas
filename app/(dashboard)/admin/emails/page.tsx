"use client";

import {
  IconCheck,
  IconFilter,
  IconKey,
  IconLoader2,
  IconMail,
  IconMailForward,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  onboarded: boolean;
  createdAt: string;
}

interface EmailResult {
  email: string;
  success: boolean;
  error?: string;
}

export default function AdminEmailsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [onboardedFilter, setOnboardedFilter] = useState<string>("all");
  const [results, setResults] = useState<EmailResult[] | null>(null);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchUsers() {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.name?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesOnboarded =
      onboardedFilter === "all" ||
      (onboardedFilter === "yes" && user.onboarded) ||
      (onboardedFilter === "no" && !user.onboarded);
    return matchesSearch && matchesRole && matchesOnboarded;
  });

  function toggleSelectAll() {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.id)));
    }
  }

  function toggleUser(userId: string) {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  }

  async function sendEmails(type: "welcome" | "reset") {
    if (selectedUsers.size === 0) return;

    setSending(true);
    setResults(null);

    try {
      const response = await fetch("/api/admin/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: Array.from(selectedUsers),
          type,
        }),
      });

      const data = await response.json();
      setResults(data.results);

      if (data.success) {
        // Refresh users to update onboarded status if needed
        fetchUsers();
      }
    } catch (error) {
      console.error("Error sending emails:", error);
    } finally {
      setSending(false);
    }
  }

  const selectedCount = selectedUsers.size;
  const successCount = results?.filter((r) => r.success).length || 0;
  const failCount = results?.filter((r) => !r.success).length || 0;

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 md:p-6 lg:pb-6">
      <PageHeader title="Email Management" />

      {/* Action Bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <IconMail className="h-5 w-5" />
            Send Bulk Emails
          </CardTitle>
          <CardDescription>
            Select users from the table below and send welcome or password reset
            emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="flex-1 sm:flex-none"
              disabled={sending || selectedCount === 0}
              onClick={() => sendEmails("welcome")}
            >
              {sending ? (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IconMailForward className="mr-2 h-4 w-4" />
              )}
              Send Welcome Email ({selectedCount})
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              disabled={sending || selectedCount === 0}
              onClick={() => sendEmails("reset")}
              variant="outline"
            >
              {sending ? (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IconKey className="mr-2 h-4 w-4" />
              )}
              Send Password Reset ({selectedCount})
            </Button>
          </div>

          {/* Results */}
          {results && (
            <div className="mt-4 rounded-lg bg-muted/50 p-4">
              <div className="mb-2 flex items-center gap-4">
                {successCount > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <IconCheck className="h-4 w-4" />
                    {successCount} sent
                  </span>
                )}
                {failCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <IconX className="h-4 w-4" />
                    {failCount} failed
                  </span>
                )}
              </div>
              {failCount > 0 && (
                <div className="text-muted-foreground text-sm">
                  <p className="mb-1 font-medium text-red-600">
                    Failed emails:
                  </p>
                  {results
                    .filter((r) => !r.success)
                    .map((r) => (
                      <p key={r.email}>
                        {r.email}: {r.error}
                      </p>
                    ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <IconSearch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                value={searchQuery}
              />
            </div>
            <Select onValueChange={setRoleFilter} value={roleFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <IconFilter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="athlete">Athlete</SelectItem>
              </SelectContent>
            </Select>
            <Select onValueChange={setOnboardedFilter} value={onboardedFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Onboarded" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="yes">Onboarded</SelectItem>
                <SelectItem value="no">Not Onboarded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Select users to send emails. Users who haven't onboarded yet are
            highlighted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        aria-label="Select all"
                        checked={
                          filteredUsers.length > 0 &&
                          selectedUsers.size === filteredUsers.length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell className="py-8 text-center" colSpan={6}>
                        <p className="text-muted-foreground">No users found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow
                        className={
                          user.onboarded
                            ? ""
                            : "bg-amber-50/50 dark:bg-amber-950/20"
                        }
                        key={user.id}
                      >
                        <TableCell>
                          <Checkbox
                            aria-label={`Select ${user.name || user.email}`}
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => toggleUser(user.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {user.name || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "owner"
                                ? "default"
                                : user.role === "coach"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.onboarded ? (
                            <Badge
                              className="border-green-600 text-green-600"
                              variant="outline"
                            >
                              Onboarded
                            </Badge>
                          ) : (
                            <Badge
                              className="border-amber-600 text-amber-600"
                              variant="outline"
                            >
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
