"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link className="flex items-center space-x-2" href="/">
            <span className="font-bold text-xl">SOMAS</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
              href="#features"
            >
              Features
            </Link>
            <Link
              className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
              href="#about"
            >
              About
            </Link>
          </nav>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <Button asChild size="sm">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
