import {
  Button,
  Heading,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface RsvpReminderEmailProps {
  gymName: string;
  gymLogoUrl?: string | null;
  athleteName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  rsvpUrl: string;
}

export function RsvpReminderEmail({
  gymName,
  gymLogoUrl,
  athleteName,
  eventTitle,
  eventDate,
  eventTime,
  rsvpUrl,
}: RsvpReminderEmailProps) {
  return (
    <BaseLayout
      preview={`RSVP needed for ${eventTitle}`}
      gymName={gymName}
      gymLogoUrl={gymLogoUrl}
    >
      <Heading style={heading}>
        We need your RSVP! 🙋
      </Heading>

      <Text style={greeting}>
        Hey {athleteName.split(" ")[0] || "there"},
      </Text>

      <Text style={paragraph}>
        You haven't responded to an upcoming event yet. Your coach would love to know if you're coming!
      </Text>

      {/* Event Card */}
      <Section style={eventCard}>
        <div style={dateBox}>
          <Text style={dateDay}>{eventDate.split(" ")[0]}</Text>
          <Text style={dateMonth}>{eventDate.split(" ")[1]}</Text>
        </div>
        <div style={eventDetails}>
          <Text style={eventTitle_style}>{eventTitle}</Text>
          <Text style={eventMeta}>{eventTime}</Text>
        </div>
      </Section>

      <Section style={buttonGroup}>
        <Button style={goingButton} href={`${rsvpUrl}?status=going`}>
          ✓ I'm Going
        </Button>
        <Button style={notGoingButton} href={`${rsvpUrl}?status=not_going`}>
          ✗ Can't Make It
        </Button>
      </Section>

      <Text style={smallText}>
        It only takes a second to let us know!
      </Text>
    </BaseLayout>
  );
}

const heading = {
  fontSize: "24px",
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

const eventCard = {
  backgroundColor: "#fef3c7",
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "24px",
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const dateBox = {
  backgroundColor: "#f59e0b",
  borderRadius: "10px",
  padding: "12px 16px",
  textAlign: "center" as const,
  minWidth: "60px",
};

const dateDay = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "700" as const,
  margin: "0",
  lineHeight: "1",
};

const dateMonth = {
  color: "rgba(255,255,255,0.8)",
  fontSize: "12px",
  fontWeight: "500" as const,
  margin: "4px 0 0",
  textTransform: "uppercase" as const,
};

const eventDetails = {
  flex: "1",
};

const eventTitle_style = {
  fontSize: "16px",
  fontWeight: "600" as const,
  color: "#18181b",
  margin: "0 0 4px",
};

const eventMeta = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0",
};

const buttonGroup = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const goingButton = {
  backgroundColor: "#10b981",
  borderRadius: "10px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 20px",
  marginRight: "8px",
};

const notGoingButton = {
  backgroundColor: "#f3f4f6",
  borderRadius: "10px",
  color: "#4b5563",
  fontSize: "14px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 20px",
};

const smallText = {
  fontSize: "13px",
  color: "#9ca3af",
  textAlign: "center" as const,
  margin: "0",
};

export default RsvpReminderEmail;






