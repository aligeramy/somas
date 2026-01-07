"use client";

import {
  IconCheck,
  IconFilter,
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

export default function EmailPasswordsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [results, setResults] = useState<EmailResult[] | null>(null);

  useEffect(() => {
    fetchUsers();
    // biome-ignore lint/correctness/useExhaustiveDependencies: fetchUsers should only run once on mount
  }, []);

  async function fetchUsers() {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      // Filter to only non-onboarded users
      const nonOnboardedUsers = data.users.filter((u: User) => !u.onboarded);
      setUsers(nonOnboardedUsers);
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
    return matchesSearch && matchesRole;
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

  async function sendCredentials() {
    if (selectedUsers.size === 0) return;

    setSending(true);
    setResults(null);

    try {
      const response = await fetch("/api/admin/send-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: Array.from(selectedUsers),
        }),
      });

      const data = await response.json();
      setResults(data.results);

      if (data.success) {
        // Clear selection after successful send
        setSelectedUsers(new Set());
        // Optionally refresh users
        fetchUsers();
      }
    } catch (error) {
      console.error("Error sending credentials:", error);
    } finally {
      setSending(false);
    }
  }

  const selectedCount = selectedUsers.size;
  const successCount = results?.filter((r) => r.success).length || 0;
  const failCount = results?.filter((r) => !r.success).length || 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 pb-24 lg:pb-6">
      <PageHeader title="Send Login Credentials" />

      {/* Action Bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <IconMail className="h-5 w-5" />
            Send Login Credentials
          </CardTitle>
          <CardDescription>
            Select users who haven't onboarded and send them their login
            credentials via email. Passwords are simple and easy to remember
            (e.g., gymtime, johncena, workout).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={sendCredentials}
              disabled={sending || selectedCount === 0}
              className="flex-1 sm:flex-none"
            >
              {sending ? (
                <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <IconMailForward className="h-4 w-4 mr-2" />
              )}
              Send Credentials ({selectedCount})
            </Button>
          </div>

          {/* Results */}
          {results && (
            <div className="mt-4 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-4 mb-2">
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
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-red-600 mb-1">
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
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <IconFilter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="athlete">Athlete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Non-Onboarded Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Select users to send login credentials. Only users who haven't
            completed onboarding are shown.
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
                        checked={
                          filteredUsers.length > 0 &&
                          selectedUsers.size === filteredUsers.length
                        }
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <p className="text-muted-foreground">
                          {users.length === 0
                            ? "No non-onboarded users found"
                            : "No users match your filters"}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        className="bg-amber-50/50 dark:bg-amber-950/20"
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => toggleUser(user.id)}
                            aria-label={`Select ${user.name || user.email}`}
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
