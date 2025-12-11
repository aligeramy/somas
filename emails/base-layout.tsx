import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface BaseLayoutProps {
  preview: string;
  gymName: string;
  gymLogoUrl?: string | null;
  children: React.ReactNode;
}

export function BaseLayout({ preview, gymName, gymLogoUrl, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            {gymLogoUrl ? (
              <Img
                src={gymLogoUrl}
                width="48"
                height="48"
                alt={gymName}
                style={logo}
              />
            ) : (
              <div style={logoPlaceholder}>
                {gymName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
            )}
            <Text style={gymNameStyle}>{gymName}</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Sent by {gymName} via Titans of Mississauga
            </Text>
            <Text style={footerSubtext}>
              Titans of Mississauga
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "40px auto",
  borderRadius: "16px",
  overflow: "hidden" as const,
  maxWidth: "480px",
};

const header = {
  backgroundColor: "#18181b",
  padding: "24px",
  textAlign: "center" as const,
};

const logo = {
  borderRadius: "12px",
  margin: "0 auto",
};

const logoPlaceholder = {
  width: "48px",
  height: "48px",
  borderRadius: "12px",
  backgroundColor: "#ffffff",
  color: "#18181b",
  fontSize: "18px",
  fontWeight: "600" as const,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto",
  lineHeight: "48px",
  textAlign: "center" as const,
};

const gymNameStyle = {
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "600" as const,
  margin: "12px 0 0",
};

const content = {
  padding: "32px 24px",
};

const footer = {
  backgroundColor: "#f6f9fc",
  padding: "24px",
  textAlign: "center" as const,
};

const footerText = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "0",
};

const footerSubtext = {
  color: "#9ca3af",
  fontSize: "11px",
  margin: "4px 0 0",
};

export default BaseLayout;




