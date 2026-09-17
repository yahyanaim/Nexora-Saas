import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PROFILE_PATTERNS } from "@/components/ui/profile-pattern"
import { Textarea } from "@/components/ui/textarea"
import { Check } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import {
  UseFormRegister,
  FieldErrors,
  UseFormWatch,
  UseFormSetValue,
} from "react-hook-form"
import { ProfileFormValues } from "@/hooks/my-profile/use-my-profile"
import { useTranslations } from "next-intl"

interface Props {
  errors: FieldErrors<ProfileFormValues>
  register: UseFormRegister<ProfileFormValues>
  watch?: UseFormWatch<ProfileFormValues>
  setValue?: UseFormSetValue<ProfileFormValues>
}

export const YourInfo = ({ errors, setValue, register, watch }: Props) => {
  const t = useTranslations()
  // Get bio value from watch if provided
  const bioValue = watch ? watch("bio") : ""
  const profileColorValue = watch ? watch("profileColor") : ""
  const handleColorSelect = (color: string) => {
    if (setValue) {
      setValue("profileColor", color, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      })
    }
  }
  return (
    <FieldGroup className="space-y-3">
      <Field>
        <FieldLabel>{t("chooseProfileColor")}</FieldLabel>
        <div className="grid grid-cols-6 gap-2">
          {PROFILE_PATTERNS.map(({ color, name }) => {
            const isActive = profileColorValue === color
            return (
              <button
                type="button"
                key={color}
                className={cn(
                  "relative h-10 w-full rounded-md border-2 md:h-12",
                  isActive && "border-primary"
                )}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                title={name}
              >
                {isActive && (
                  <Check className="absolute inset-0 m-auto size-5 text-white drop-shadow-lg md:size-6" />
                )}
              </button>
            )
          })}
        </div>
      </Field>

      {/* Name */}
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="name">{t("name")}</FieldLabel>
        <Input
          id="name"
          placeholder={t("enterFullName")}
          className="border-white/10 bg-background/50 focus:border-primary/50"
          {...register("name")}
        />
        {errors.name && (
          <FieldDescription className="text-destructive">
            {errors.name.message}
          </FieldDescription>
        )}
      </Field>

      {/* Bio */}
      <Field data-invalid={!!errors.bio}>
        <FieldLabel htmlFor="bio">{t("bio")}</FieldLabel>
        <Textarea
          id="bio"
          rows={3}
          maxLength={200}
          placeholder={t("writeSomethingAboutYourself")}
          className="resize-none border-white/10 bg-background/50 focus:border-primary/50"
          {...register("bio")}
        />
        <div className="flex justify-between">
          <FieldDescription>
            {errors.bio?.message ||
              `${bioValue?.length || 0}/200 ${t("characters")}`}
          </FieldDescription>
        </div>
      </Field>
    </FieldGroup>
  )
}
