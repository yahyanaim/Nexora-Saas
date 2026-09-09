import { Controller, useFormContext } from "react-hook-form"
import { SettingRow } from "./setting-row"
import { Switch } from "@/components/ui/switch"

interface Props {
  name: `settings.${string}`
  label: string
  bio?: string
  icon: React.ReactNode
  disabled?: boolean
}
export function SwitchSetting({ name, label, bio, icon, disabled }: Props) {
  const { control } = useFormContext()

  return (
    <SettingRow classNameChildren="flex-0" icon={icon} label={label} bio={bio}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Switch
            checked={field.value}
            onChange={field.onChange}
            disabled={disabled}
          />
        )}
      />
    </SettingRow>
  )
}
