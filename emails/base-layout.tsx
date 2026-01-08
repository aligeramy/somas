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
        <Body className="m-auto bg-[#f6f9fc] font-sans">
          <Container className="mx-auto my-10 max-w-[480px] overflow-hidden rounded-2xl bg-white">
            {/* Header */}
            <Section className="bg-zinc-900 p-6 text-center">
              {gymLogoUrl ? (
                <Img
                  alt={gymName || "SOMAS"}
                  className="mx-auto my-0 rounded-xl"
                  height="48"
                  src={gymLogoUrl}
                  width="48"
                />
              ) : (
                <div className="mx-auto my-0 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-center font-semibold text-lg text-zinc-900 leading-[48px]">
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
              <Text className="mt-3 mb-0 font-semibold text-lg text-white">
                {gymName || "SOMAS"}
              </Text>
            </Section>

            {/* Content */}
            <Section className="px-6 py-8">{children}</Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default BaseLayout;
