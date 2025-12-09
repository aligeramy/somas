import { Button, Heading, Section, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface InvitationEmailProps {
  gymName: string;
  gymLogoUrl?: string | null;
  inviterName: string;
  role: "coach" | "athlete";
  inviteUrl: string;
}

export function InvitationEmail({
  gymName,
  gymLogoUrl,
  inviterName,
  role,
  inviteUrl,
}: InvitationEmailProps) {
  return (
    <BaseLayout
      preview={`You're invited to join ${gymName}`}
      gymName={gymName}
      gymLogoUrl={gymLogoUrl}
    >
      <Heading style={heading}>You're Invited!</Heading>

      <Text style={greeting}>Hello,</Text>

      <Text style={paragraph}>
        <strong>{inviterName}</strong> has invited you to join{" "}
        <strong>{gymName}</strong> as{" "}
        {role === "coach" ? "a coach" : "an athlete"}.
      </Text>

      <Section style={highlightBox}>
        <Text style={highlightText}>
          {role === "coach"
            ? "As a coach, you'll be able to create and manage events, track RSVPs, and communicate with athletes."
            : "As an athlete, you'll be able to RSVP to training sessions, receive reminders, and stay connected with your team."}
        </Text>
      </Section>

      <Text style={paragraph}>
        Click the button below to set up your account and get started.
      </Text>

      <Section style={buttonContainer}>
        <Button style={primaryButton} href={inviteUrl}>
          Accept Invitation
        </Button>
      </Section>

      <Text style={smallText}>This invitation link will expire in 7 days.</Text>
    </BaseLayout>
  );
}

const heading = {
  fontSize: "28px",
  fontWeight: "700" as const,
  color: "#18181b",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const greeting = {
  fontSize: "16px",
  color: "#18181b",
  margin: "0 0 16px",
};

const paragraph = {
  fontSize: "15px",
  color: "#4b5563",
  lineHeight: "24px",
  margin: "0 0 24px",
};

const highlightBox = {
  backgroundColor: "#f0fdf4",
  borderLeft: "4px solid #22c55e",
  borderRadius: "0 8px 8px 0",
  padding: "16px",
  marginBottom: "24px",
};

const highlightText = {
  fontSize: "14px",
  color: "#166534",
  margin: "0",
  lineHeight: "22px",
};

const buttonContainer = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const primaryButton = {
  backgroundColor: "#18181b",
  borderRadius: "10px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "14px 32px",
};

const smallText = {
  fontSize: "13px",
  color: "#9ca3af",
  textAlign: "center" as const,
  margin: "0",
};

export default InvitationEmail;
