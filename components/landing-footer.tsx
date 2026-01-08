import Link from "next/link";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="mb-4 font-semibold text-lg">SOMAS</h3>
            <p className="text-muted-foreground text-sm">
              The modern platform for club management and athlete coordination.
            </p>
          </div>
          <div>
            <h4 className="mb-4 font-semibold text-sm">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href="#features"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href="#about"
                >
                  About
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-semibold text-sm">Account</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href="/login"
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  href="/register"
                >
                  Get Started
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t pt-8 text-center text-muted-foreground text-sm">
          <p>© {currentYear} SOMAS. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
