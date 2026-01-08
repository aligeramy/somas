"use client";

import {
  IconCheck,
  IconFilter,
  IconLoader2,
  IconMail,
  IconMailForward,
  IconSearch,
  IconTestPipe,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testUserId, setTestUserId] = useState<string>("");
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<EmailResult | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      // Filter to only non-onboarded users
      const nonOnboardedUsers = data.users.filter((u: User) => !u.onboarded);
      setUsers(nonOnboardedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
    if (selectedUsers.size === 0) {
      return;
    }

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

  async function sendTestEmail() {
    if (!(testUserId && testEmail)) {
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/admin/send-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: [testUserId],
          testEmail,
        }),
      });

      const data = await response.json();
      if (data.results && data.results.length > 0) {
        setTestResult(data.results[0]);
        if (data.results[0].success) {
          // Clear form on success
          setTestEmail("");
          setTestUserId("");
        }
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      setTestResult({
        email: testEmail,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setTesting(false);
    }
  }

  const selectedCount = selectedUsers.size;
  const successCount = results?.filter((r) => r.success).length || 0;
  const failCount = results?.filter((r) => !r.success).length || 0;

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 md:p-6 lg:pb-6">
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
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="flex-1 sm:flex-none"
              disabled={sending || selectedCount === 0}
              onClick={sendCredentials}
            >
              {sending ? (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IconMailForward className="mr-2 h-4 w-4" />
              )}
              Send Credentials ({selectedCount})
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              disabled={sending || users.length === 0}
              onClick={() => setTestDialogOpen(true)}
              variant="outline"
            >
              <IconTestPipe className="mr-2 h-4 w-4" />
              Test Email
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

      {/* Test Email Dialog */}
      <Dialog onOpenChange={setTestDialogOpen} open={testDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Select a user's credentials and enter a test email address to
              preview the email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-user">Select User</Label>
              <Select onValueChange={setTestUserId} value={testUserId}>
                <SelectTrigger id="test-user">
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-email">Test Email Address</Label>
              <Input
                id="test-email"
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                type="email"
                value={testEmail}
              />
            </div>
            {testResult && (
              <div
                className={`rounded-lg p-4 ${
                  testResult.success
                    ? "border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20"
                    : "border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <>
                      <IconCheck className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-600">
                        Test email sent successfully!
                      </span>
                    </>
                  ) : (
                    <>
                      <IconX className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-600">
                        Failed to send test email
                      </span>
                    </>
                  )}
                </div>
                {testResult.error && (
                  <p className="mt-2 text-red-600 text-sm">
                    {testResult.error}
                  </p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setTestDialogOpen(false);
                  setTestResult(null);
                  setTestEmail("");
                  setTestUserId("");
                }}
                variant="outline"
              >
                Close
              </Button>
              <Button
                disabled={testing || !testUserId || !testEmail}
                onClick={sendTestEmail}
              >
                {testing ? (
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <IconMailForward className="mr-2 h-4 w-4" />
                )}
                Send Test Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell className="py-8 text-center" colSpan={5}>
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
                        className="bg-amber-50/50 dark:bg-amber-950/20"
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
