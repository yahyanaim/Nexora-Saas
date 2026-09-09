import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PREVIEW_GRADIENTS, WALLPAPER_NAMES } from "@/contexts/theme-provider"
import { useTheme } from "@/hooks/use-theme"
import { cn } from "@/lib/utils"
import { Check, Palette } from "lucide-react"
import { useTranslations } from "next-intl"

export const ChangeTheme = () => {
  const t = useTranslations()
  const { theme, wallpaper: activeWallpaper, setWallpaper } = useTheme()
  return (
    <Dialog>
      <DialogTrigger>
        <Palette />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("changeTheme")}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-1 p-3 pt-2 md:gap-2">
          {WALLPAPER_NAMES.map((name) => {
            const gradient =
              theme === "dark"
                ? PREVIEW_GRADIENTS[name].dark
                : PREVIEW_GRADIENTS[name].light

            const isActive = activeWallpaper === name

            return (
              <button
                key={name}
                onClick={() => setWallpaper(name)}
                className={cn(
                  "group relative flex aspect-square cursor-pointer overflow-hidden rounded-xl border-2 transition-all",
                  isActive
                    ? "border-primary"
                    : "border-transparent hover:border-primary/50"
                )}
              >
                <div
                  className="relative flex h-full w-full items-center justify-center overflow-hidden"
                  style={{ background: gradient }}
                >
                  <img
                    src={`/images/wallpapers/${theme}/${name}.png`}
                    alt={name}
                    className="absolute inset-0 h-full w-full scale-[7] object-cover mix-blend-overlay"
                  />
                </div>

                {isActive && (
                  <div className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                    <Check className="size-4" strokeWidth={3} />
                  </div>
                )}
              </button>
            )
          })}
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
