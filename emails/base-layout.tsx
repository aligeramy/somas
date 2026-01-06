import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import type * as React from "react";

interface BaseLayoutProps {
  preview: string;
  gymName: string | null;
  gymLogoUrl?: string | null;
  children: React.ReactNode;
}

export function BaseLayout({
  preview,
  gymName,
  gymLogoUrl,
  children,
}: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-[#f6f9fc] m-auto font-sans">
          <Container className="bg-white my-10 mx-auto rounded-2xl overflow-hidden max-w-[480px]">
            {/* Header */}
            <Section className="bg-zinc-900 p-6 text-center">
              {gymLogoUrl ? (
                <Img
                  src={gymLogoUrl}
                  width="48"
                  height="48"
                  alt={gymName || "SOMAS"}
                  className="rounded-xl my-0 mx-auto"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white text-zinc-900 text-lg font-semibold flex items-center justify-center my-0 mx-auto leading-[48px] text-center">
                  {gymName?.trim()
                    ? gymName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                        .slice(0, 5)
                    : "SOMAS"}
                </div>
              )}
              <Text className="text-white text-lg font-semibold mt-3 mb-0">
                {gymName || "SOMAS"}
              </Text>
            </Section>

            {/* Content */}
            <Section className="py-8 px-6">{children}</Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default BaseLayout;
