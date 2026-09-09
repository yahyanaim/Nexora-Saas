import { Controller, useFormContext } from "react-hook-form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SettingRow } from "@/components/ui/setting-row"
import { useTranslations } from "next-intl"

interface Props {
  name: `settings.${string}`
  label: string
  bio?: string
  options: readonly { value: string; label: string }[]
  icon: React.ReactNode
}

export function SelectSetting({ name, label, bio, options, icon }: Props) {
  const { control } = useFormContext()
  const t = useTranslations()
  return (
    <SettingRow
      icon={icon}
      label={label}
      bio={bio}
      className="flex w-full flex-1 justify-between"
    >
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt?.label?.toLowerCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </SettingRow>
  )
}
