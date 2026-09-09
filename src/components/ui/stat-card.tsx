interface Props {
  label: string
  value: number | string
  isLoading: boolean
}
export const StatCard = ({ label, value, isLoading }: Props) => {
  return (
    <div className="flex flex-col rounded-md bg-background p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="mt-1 text-2xl font-bold tabular-nums">
        {isLoading ? "—" : value.toLocaleString()}
      </span>
    </div>
  )
}
