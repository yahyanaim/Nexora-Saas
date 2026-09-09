import { DatePicker } from "@/components/ui/date-picker"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { ProfileFormValues } from "@/hooks/my-profile/use-my-profile"
import { FieldErrors, UseFormRegister } from "react-hook-form"
import { useTranslations } from "next-intl"

interface Props {
  errors: FieldErrors<ProfileFormValues>
  register: UseFormRegister<ProfileFormValues>
}
export const ContactInfo = ({ errors, register }: Props) => {
  const t = useTranslations()

  return (
    <FieldGroup className="space-y-3">
      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center">
          <span className="md:text-md bg-background/50 px-2 text-sm text-muted-foreground backdrop-blur-sm">
            {t("contactInfo")}
          </span>
        </div>
      </div>

      {/* Email */}
      <Field data-invalid={!!errors.email}>
        <FieldLabel htmlFor="email" className="font-medium">
          {t("emailAddress")}
        </FieldLabel>
        <Input
          id="email"
          type="email"
          readOnly
          placeholder={t("emailPlaceholder")}
          className="border-white/10 bg-background/50 focus:border-primary/50"
          {...register("email")}
        />
        {errors.email && (
          <FieldDescription className="text-destructive">
            {errors.email.message}
          </FieldDescription>
        )}
      </Field>

      {/* Username */}
      <Field data-invalid={!!errors.username}>
        <FieldLabel htmlFor="username" className="font-medium">
          {t("username")}
        </FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText className="border-white/10 bg-background/50 text-lg">
              @
            </InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            id="username"
            placeholder={t("usernamePlaceholder")}
            className="border-white/10 bg-background/50 focus:border-primary/50"
            {...register("username")}
          />
        </InputGroup>
        {errors.username ? (
          <FieldDescription className="text-destructive">
            {errors.username.message}
          </FieldDescription>
        ) : (
          <FieldDescription>{t("usernameDescription")}</FieldDescription>
        )}
      </Field>

      <Field data-invalid={!!errors.birthday}>
        <FieldLabel htmlFor="birthday" className="font-medium">
          {t("birthday")}
        </FieldLabel>
        <DatePicker
          id="birthday"
          label={t("birthday")}
          className="w-full"
          defaultValue={new Date()}
          onDateChange={(date) => {
            // Convert to string format for form submission if needed
            if (date) {
              register("birthday").onChange({
                target: {
                  name: "birthday",
                  value: date.toISOString().split("T")[0], // YYYY-MM-DD format
                },
              })
            }
          }}
          maxDate={new Date()} // Prevent future dates
          required={true}
          placeholder={t("selectBirthday")}
        />
        {errors.birthday && (
          <FieldDescription className="text-destructive">
            {errors.birthday.message}
          </FieldDescription>
        )}
      </Field>
    </FieldGroup>
  )
}
