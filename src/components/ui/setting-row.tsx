import { cn } from "@/lib/utils"

interface Props {
  icon: React.ReactNode
  label: string
  bio?: string
  children: React.ReactNode
  className?: string
  classNameChildren?: string
}

export function SettingRow({
  icon,
  label,
  bio,
  children,
  className,
  classNameChildren,
}: Props) {
  return (
    <div
      className={cn("flex items-center justify-between gap-2 py-2", className)}
    >
      <div className="flex min-w-0 items-start gap-3 pr-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="min-w-0">
          <p className="font-medium">{label}</p>
          {bio && <p className="-mt-3 text-muted-foreground">{bio}</p>}
        </div>
      </div>
      <div className={cn("shrink-0 pt-0.5", classNameChildren)}>{children}</div>
    </div>
  )
}
