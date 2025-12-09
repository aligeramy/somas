import { SidebarTrigger } from "@/components/ui/sidebar"

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="sticky z-10 -top-1 mb-4">
      <header className="flex h-14 shrink-0 items-center gap-2 bg-card border rounded-xl shadow-sm px-4 lg:px-6">
        <SidebarTrigger className="-ml-1 lg:hidden" />
        <div className="flex flex-1 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            </div>
          </div>
          {children && <div className="flex items-center gap-2">{children}</div>}
        </div>
      </header>
    </div>
  )
}

