import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface InvitationEmailProps {
  gymName: string;
  inviteUrl: string;
  role: string;
}

export const InvitationEmail = ({
  gymName,
  inviteUrl,
  role,
}: InvitationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>You&apos;ve been invited to join {gymName} on TOM</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You&apos;ve been invited!</Heading>
          <Text style={text}>
            You&apos;ve been invited to join <strong>{gymName}</strong> on TOM
            as a <strong>{role}</strong>.
          </Text>
          <Section style={buttonContainer}>
            <Link style={button} href={inviteUrl}>
              Accept Invitation
            </Link>
          </Section>
          <Text style={text}>
            Or copy and paste this URL into your browser:
            <br />
            <Link href={inviteUrl} style={link}>
              {inviteUrl}
            </Link>
          </Text>
          <Text style={footer}>
            This invitation will expire in 7 days. If you didn&apos;t expect
            this invitation, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

InvitationEmail.PreviewProps = {
  gymName: "Titans of Mississauga",
  inviteUrl: "https://example.com/register?token=abc123&email=user@example.com",
  role: "athlete",
} as InvitationEmailProps;

export default InvitationEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
};

const buttonContainer = {
  padding: "27px 0 27px",
};

const button = {
  backgroundColor: "#000",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
};

const link = {
  color: "#2754C5",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
};

const footer = {
  color: "#898989",
  fontSize: "12px",
  lineHeight: "22px",
  marginTop: "12px",
  textAlign: "center" as const,
};

