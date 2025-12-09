import { SidebarTrigger } from "@/components/ui/sidebar"

interface SiteHeaderProps {
  gymName?: string | null
}

export function SiteHeader({ gymName }: SiteHeaderProps) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-3 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
      </div>
    </header>
  )
}
