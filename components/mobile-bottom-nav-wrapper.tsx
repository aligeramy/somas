"use client";

import { MobileBottomNav } from "./mobile-bottom-nav";

interface MobileBottomNavWrapperProps {
  userRole: string;
  gymWebsite: string | null;
}

export function MobileBottomNavWrapper({
  userRole,
  gymWebsite,
}: MobileBottomNavWrapperProps) {
  return <MobileBottomNav gymWebsite={gymWebsite} userRole={userRole} />;
}
