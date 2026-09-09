"use client"
import { useState } from "react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Check, Languages } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { usePathname, useRouter } from "@/i18n/navigation"

export const ChangeLanguage = () => {
  const t = useTranslations()
  const currentLocale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const languages = [
    { code: "en", name: t("english"), native: "English" },
    { code: "ar", name: t("arabic"), native: "العربية" },
    { code: "fr", name: t("french"), native: "Français" },
    { code: "de", name: t("german"), native: "Deutsch" },
    { code: "es", name: t("spanish"), native: "Español" },
    { code: "ru", name: t("russian"), native: "Русский" },
    { code: "hi", name: t("hindi"), native: "हिन्दी" },
    { code: "ur", name: t("urdu"), native: "اردو" },
    { code: "zh", name: t("chinese"), native: "中文" },
  ]

  function handleSelect(code: string) {
    if (code !== currentLocale) {
      router.replace(pathname, { locale: code })
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Languages />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("changeLanguage")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-3 pt-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-start transition-colors hover:bg-accent"
            >
              <p className="min-w-0 flex-1 text-base font-medium">
                {lang.native}
              </p>
              <span className="text-muted-foreground">{lang.name}</span>
              {currentLocale === lang.code && (
                <Check className="size-5 text-primary" />
              )}
            </button>
          ))}
        </div>
        <DialogFooter>
          <DialogClose
            className="flex-1 rounded-md bg-destructive/20 p-3 text-destructive"
            type="button"
          >
            {t("close")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
