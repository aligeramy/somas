"use client";

import {
  IconCheck,
  IconLoader2,
  IconMail,
  IconMailForward,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Recipient {
  id: string;
  name: string | null;
  email: string;
  altEmail: string | null;
  rsvpStatus?: "going" | "not_going" | null;
}

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
}

interface Occurrence {
  id: string;
  date: string;
  status: string;
}

interface CancelNotifyData {
  occurrence: Occurrence | null;
  event: Event | null;
  gym: { name: string } | null;
  recipients: Recipient[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":");
  const hour = Number.parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export default function CancelNotifyPage() {
  const [data, setData] = useState<CancelNotifyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [testEmail, setTestEmail] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/cancel-notify");
      if (!res.ok) {
        throw new Error("Failed to load");
      }
      const json = await res.json();
      setData(json);
      setSelectedIds(new Set());
    } catch {
      setMessage({ type: "error", text: "Failed to load cancellation data." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const recipients = data?.recipients ?? [];
  const occurrence = data?.occurrence;
  const event = data?.event;
  const allSelected =
    recipients.length > 0 && selectedIds.size === recipients.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(recipients.map((r) => r.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  async function sendToSelected() {
    if (!occurrence || selectedIds.size === 0) {
      return;
    }
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/cancel-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occurrenceId: occurrence.id,
          userIds: Array.from(selectedIds),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({
          type: "error",
          text: json.error ?? "Failed to send emails.",
        });
        return;
      }
      setMessage({
        type: "success",
        text: `Sent cancellation email to ${json.notified} recipient(s).`,
      });
    } catch {
      setMessage({ type: "error", text: "Failed to send emails." });
    } finally {
      setSending(false);
    }
  }

  async function sendTestEmail() {
    const email = testEmail.trim();
    if (!(email && occurrence)) {
      return;
    }
    setTestSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/cancel-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occurrenceId: occurrence.id,
          testEmail: email,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({
          type: "error",
          text: json.error ?? "Failed to send test email.",
        });
        return;
      }
      setMessage({
        type: "success",
        text: "Test email sent successfully.",
      });
    } catch {
      setMessage({ type: "error", text: "Failed to send test email." });
    } finally {
      setTestSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 pb-24 md:p-6 lg:pb-6">
        <PageHeader title="Send cancellation emails" />
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!(occurrence && event)) {
    return (
      <div className="flex flex-col gap-6 p-4 pb-24 md:p-6 lg:pb-6">
        <PageHeader title="Send cancellation emails" />
        <Card>
          <CardHeader>
            <CardTitle>No canceled session</CardTitle>
            <CardDescription>
              There is no canceled event occurrence to notify about. Cancel a
              session from Events or Calendar first, then return here to send
              cancellation emails.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 md:p-6 lg:pb-6">
      <PageHeader title="Send cancellation emails" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconMail className="h-5 w-5" />
            {event.title}
          </CardTitle>
          <CardDescription>
            {formatDate(occurrence.date)} · {formatTime(event.startTime)} –{" "}
            {formatTime(event.endTime)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {message && (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                message.type === "success"
                  ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200"
                  : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Recipients list */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-sm">
                Everyone in the club ({recipients.length})
              </span>
              {recipients.length > 0 && (
                <Button
                  aria-pressed={allSelected}
                  onClick={toggleSelectAll}
                  size="sm"
                  variant="outline"
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </Button>
              )}
            </div>
            {recipients.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No members in this club.
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          aria-label="Select all"
                          checked={allSelected}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-24 text-right font-normal text-muted-foreground text-xs">
                        RSVP
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipients.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Checkbox
                            aria-label={`Select ${r.name ?? r.email}`}
                            checked={selectedIds.has(r.id)}
                            onCheckedChange={() => toggleOne(r.id)}
                          />
                        </TableCell>
                        <TableCell>{r.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {r.email}
                          {r.altEmail ? `, ${r.altEmail}` : ""}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">
                          {r.rsvpStatus === "going" && "Going"}
                          {r.rsvpStatus === "not_going" && "Not going"}
                          {r.rsvpStatus !== "going" &&
                            r.rsvpStatus !== "not_going" &&
                            "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {recipients.length > 0 && (
              <Button
                className="mt-3"
                disabled={sending || selectedIds.size === 0}
                onClick={sendToSelected}
              >
                {sending ? (
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <IconMailForward className="mr-2 h-4 w-4" />
                )}
                Send to selected ({selectedIds.size})
              </Button>
            )}
          </div>

          {/* Test email */}
          <div className="border-t pt-6">
            <CardTitle className="mb-2 text-base">Send test email</CardTitle>
            <CardDescription className="mb-3">
              Send the same cancellation email to any address to preview it.
            </CardDescription>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[200px] flex-1 space-y-1">
                <Label htmlFor="test-email">Email address</Label>
                <Input
                  id="test-email"
                  onChange={(e) => setTestEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      sendTestEmail();
                    }
                  }}
                  placeholder="you@example.com"
                  type="email"
                  value={testEmail}
                />
              </div>
              <Button
                disabled={testSending || !testEmail.trim()}
                onClick={sendTestEmail}
                variant="secondary"
              >
                {testSending ? (
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <IconCheck className="mr-2 h-4 w-4" />
                )}
                Send test email
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
