import Image from "next/image";
import Link from "next/link";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-white border-gray-200">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/somas.png"
                alt="SOMAS Logo"
                width={40}
                height={40}
                className="rounded-full"
              />
              <h3 className="text-lg font-semibold text-gray-900">SOMAS</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Special Olympics Mississauga Alpine Skiing - The modern platform for club management and athlete coordination.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4 text-gray-900">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="#features"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#about"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  About
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-4 text-gray-900">Account</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Get Started
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>© {currentYear} SOMAS - Special Olympics Mississauga Alpine Skiing. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
