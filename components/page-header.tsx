"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

interface PageHeaderProps {
  title: string | React.ReactNode;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="sticky -top-1 z-10 md:hidden">
      <header className="flex h-14 shrink-0 items-center gap-2 border bg-card px-4 shadow-sm sm:rounded-none sm:px-6 md:rounded-md md:px-6 lg:px-8">
        <SidebarTrigger className="-ml-1 md:hidden" />
        <div className="flex flex-1 items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-semibold text-lg tracking-tight">{title}</h1>
            </div>
          </div>
          {children && (
            <>
              <style global jsx>{`
                @media (max-width: 767px) {
                  [data-page-header] button:not([data-show-text-mobile]) {
                    font-size: 0 !important;
                    width: 2rem !important;
                    height: 2rem !important;
                    padding: 0.5rem !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                  }
                  [data-page-header] button:not([data-show-text-mobile]) svg {
                    font-size: 1rem !important;
                    width: 1rem !important;
                    height: 1rem !important;
                    margin: 0 !important;
                  }
                  [data-page-header] button:not([data-show-text-mobile]) > *:not(svg) {
                    display: none !important;
                  }
                  [data-page-header] button[data-show-text-mobile] {
                    padding: 0.5rem 0.75rem !important;
                    height: 2rem !important;
                    font-size: 0.875rem !important;
                  }
                }
              `}</style>
              <div
                className="flex items-center gap-2 md:gap-3 [&_button]:md:size-auto [&_button]:md:h-8 [&_button]:md:w-auto [&_button]:md:gap-2 [&_button]:md:px-3 [&_button_svg]:md:mr-2"
                data-page-header
              >
                {children}
              </div>
            </>
          )}
        </div>
      </header>
    </div>
  );
}
