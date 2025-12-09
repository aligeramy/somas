import {
  Button,
  Heading,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface EventReminderEmailProps {
  gymName: string;
  gymLogoUrl?: string | null;
  athleteName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation?: string;
  reminderType: string; // "7_day", "1_day", "30_min"
  rsvpUrl: string;
}

export function EventReminderEmail({
  gymName,
  gymLogoUrl,
  athleteName,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  reminderType,
  rsvpUrl,
}: EventReminderEmailProps) {
  const reminderText = getReminderText(reminderType);

  return (
    <BaseLayout
      preview={`${eventTitle} - ${reminderText}`}
      gymName={gymName}
      gymLogoUrl={gymLogoUrl}
    >
      <Heading style={heading}>
        {reminderText}
      </Heading>

      <Text style={greeting}>
        Hey {athleteName.split(" ")[0] || "there"},
      </Text>

      <Text style={paragraph}>
        Just a friendly reminder about your upcoming session.
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
          {eventLocation && (
            <Text style={eventMeta}>{eventLocation}</Text>
          )}
        </div>
      </Section>

      <Text style={paragraph}>
        Let us know if you're coming!
      </Text>

      <Section style={buttonContainer}>
        <Button style={primaryButton} href={rsvpUrl}>
          Confirm Attendance
        </Button>
      </Section>

      <Text style={smallText}>
        Can't make it? Update your RSVP to let the coach know.
      </Text>
    </BaseLayout>
  );
}

function getReminderText(type: string): string {
  switch (type) {
    case "7_day":
      return "1 Week Away!";
    case "3_day":
      return "3 Days to Go!";
    case "1_day":
      return "Tomorrow!";
    case "30_min":
      return "Starting Soon!";
    case "canceled":
      return "Session Canceled";
    default:
      return "Reminder";
  }
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
  backgroundColor: "#f9fafb",
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "24px",
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const dateBox = {
  backgroundColor: "#18181b",
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
  color: "#a1a1aa",
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
  padding: "14px 28px",
};

const smallText = {
  fontSize: "13px",
  color: "#9ca3af",
  textAlign: "center" as const,
  margin: "0",
};

export default EventReminderEmail;

