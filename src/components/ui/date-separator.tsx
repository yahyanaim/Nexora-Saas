import { Badge } from "@/components/ui/badge"

export const DateSeparator = ({ date }: { date: string }) => (
  <div className="flex items-center justify-center py-2 md:py-3">
    <Badge variant="secondary" className="text-xs shadow-sm md:text-sm">
      {date}
    </Badge>
  </div>
)
