"use client";

import { MobileBottomNav } from "./mobile-bottom-nav";

interface MobileBottomNavWrapperProps {
  userRole: string;
}

export function MobileBottomNavWrapper({ userRole }: MobileBottomNavWrapperProps) {
  return <MobileBottomNav userRole={userRole} />;
}

