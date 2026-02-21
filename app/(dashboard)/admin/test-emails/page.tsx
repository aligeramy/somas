"use client";

import {
  IconCheck,
  IconLoader2,
  IconMail,
  IconMailForward,
  IconX,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  altEmail?: string | null;
}

interface Event {
  id: string;
  title: string;
  occurrences: Array<{ id: string; date: string; status: string }>;
}

type EmailType =
  | "welcome"
  | "login-credentials"
  | "invitation"
  | "event-reminder"
  | "event-cancellation"
  | "rsvp-reminder"
  | "notice";

export default function TestEmailsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Form state
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [emailType, setEmailType] = useState<EmailType | "">("");
  const [eventId, setEventId] = useState<string>("");
  const [occurrenceId, setOccurrenceId] = useState<string>("");
  const [password, setPassword] = useState<string>("test-password-123");
  const [role, setRole] = useState<"coach" | "athlete">("athlete");
  const [inviterName, setInviterName] = useState<string>("");
  const [noticeTitle, setNoticeTitle] = useState<string>("Test Notice");
  const [noticeContent, setNoticeContent] = useState<string>(
    "This is a test notice to verify the email template."
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, eventsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/events"),
      ]);

      if (!(usersRes.ok && eventsRes.ok)) {
        throw new Error("Failed to fetch data");
      }

      const usersData = await usersRes.json();
      const eventsData = await eventsRes.json();

      setUsers(usersData.users || []);
      setEvents(eventsData.events || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function sendTestEmail() {
    if (!(selectedUserId && emailType)) {
      setResult({
        success: false,
        message: "Please select a user and email type",
      });
      return;
    }

    // Validate required fields based on email type
    if (
      (emailType === "event-reminder" ||
        emailType === "event-cancellation" ||
        emailType === "rsvp-reminder") &&
      !(eventId && occurrenceId)
    ) {
      setResult({
        success: false,
        message: "Please select an event and occurrence",
      });
      return;
    }

    if (emailType === "invitation" && !inviterName) {
      setResult({
        success: false,
        message: "Please enter inviter name",
      });
      return;
    }

    if (emailType === "notice" && !(noticeTitle && noticeContent)) {
      setResult({
        success: false,
        message: "Please enter notice title and content",
      });
      return;
    }

    try {
      setSending(true);
      setResult(null);

      const response = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          emailType,
          eventId: eventId || undefined,
          occurrenceId: occurrenceId || undefined,
          password: emailType === "login-credentials" ? password : undefined,
          role: emailType === "invitation" ? role : undefined,
          inviterName: emailType === "invitation" ? inviterName : undefined,
          noticeTitle: emailType === "notice" ? noticeTitle : undefined,
          noticeContent: emailType === "notice" ? noticeContent : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setResult({
        success: true,
        message: data.message || "Email sent successfully!",
      });
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to send email",
      });
    } finally {
      setSending(false);
    }
  }

  const selectedEvent = events.find((e) => e.id === eventId);
  const availableOccurrences =
    selectedEvent?.occurrences.filter((o) => o.status === "scheduled") || [];

  const selectedUser = users.find((u) => u.id === selectedUserId);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 pb-24 md:p-6 lg:pb-6">
        <PageHeader title="Test Emails" />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <IconLoader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 md:p-6 lg:pb-6">
      <PageHeader title="Test Emails" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconMail className="h-5 w-5" />
            Send Test Email
          </CardTitle>
          <CardDescription>
            Test various email templates by sending them to a user of your
            choice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="user">Select User</Label>
            <Select onValueChange={setSelectedUserId} value={selectedUserId}>
              <SelectTrigger id="user">
                <SelectValue placeholder="Choose a user to send test email to" />
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

          {/* Email Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="emailType">Email Type</Label>
            <Select
              onValueChange={(v) => setEmailType(v as EmailType)}
              value={emailType}
            >
              <SelectTrigger id="emailType">
                <SelectValue placeholder="Select email template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="welcome">Welcome Email</SelectItem>
                <SelectItem value="login-credentials">
                  Login Credentials
                </SelectItem>
                <SelectItem value="invitation">Invitation</SelectItem>
                <SelectItem value="event-reminder">Event Reminder</SelectItem>
                <SelectItem value="event-cancellation">
                  Event Cancellation
                </SelectItem>
                <SelectItem value="rsvp-reminder">RSVP Reminder</SelectItem>
                <SelectItem value="notice">Notice</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Event Selection (for event-related emails) */}
          {(emailType === "event-reminder" ||
            emailType === "event-cancellation" ||
            emailType === "rsvp-reminder") && (
            <>
              <div className="space-y-2">
                <Label htmlFor="event">Select Event</Label>
                <Select
                  onValueChange={(value) => {
                    setEventId(value);
                    setOccurrenceId(""); // Reset occurrence when event changes
                  }}
                  value={eventId}
                >
                  <SelectTrigger id="event">
                    <SelectValue placeholder="Choose an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {eventId && (
                <div className="space-y-2">
                  <Label htmlFor="occurrence">Select Occurrence</Label>
                  <Select onValueChange={setOccurrenceId} value={occurrenceId}>
                    <SelectTrigger id="occurrence">
                      <SelectValue placeholder="Choose an occurrence" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOccurrences.map((occ) => {
                        const date = new Date(occ.date);
                        const dateStr = date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                        return (
                          <SelectItem key={occ.id} value={occ.id}>
                            {dateStr}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* Login Credentials Fields */}
          {emailType === "login-credentials" && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="test-password-123"
                type="text"
                value={password}
              />
            </div>
          )}

          {/* Invitation Fields */}
          {emailType === "invitation" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  onValueChange={(v) => setRole(v as "coach" | "athlete")}
                  value={role}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="athlete">Athlete</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviterName">Inviter Name</Label>
                <Input
                  id="inviterName"
                  onChange={(e) => setInviterName(e.target.value)}
                  placeholder="Coach Name"
                  value={inviterName}
                />
              </div>
            </>
          )}

          {/* Notice Fields */}
          {emailType === "notice" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="noticeTitle">Notice Title</Label>
                <Input
                  id="noticeTitle"
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="Test Notice"
                  value={noticeTitle}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noticeContent">Notice Content</Label>
                <Textarea
                  id="noticeContent"
                  onChange={(e) => setNoticeContent(e.target.value)}
                  placeholder="This is a test notice..."
                  rows={5}
                  value={noticeContent}
                />
              </div>
            </>
          )}

          {/* Result Message */}
          {result && (
            <div
              className={`flex items-center gap-2 rounded-lg p-4 ${
                result.success
                  ? "border border-green-200 bg-green-50 text-green-900"
                  : "border border-red-200 bg-red-50 text-red-900"
              }`}
            >
              {result.success ? (
                <IconCheck className="h-5 w-5" />
              ) : (
                <IconX className="h-5 w-5" />
              )}
              <span>{result.message}</span>
            </div>
          )}

          {/* Send Button */}
          <Button
            className="w-full"
            disabled={sending || !selectedUserId || !emailType}
            onClick={sendTestEmail}
          >
            {sending ? (
              <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <IconMailForward className="mr-2 h-4 w-4" />
                Send Test Email
              </>
            )}
          </Button>

          {/* Info */}
          {selectedUser && (
            <p className="text-muted-foreground text-sm">
              Email will be sent to:{" "}
              <strong>
                {selectedUser.email}
                {selectedUser.altEmail && ` and ${selectedUser.altEmail}`}
              </strong>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
