import { cn } from "@/lib/utils"
import { BrowserName } from "@/lib/utils/parse-user-agent"
import { Globe, Monitor, Smartphone, Tablet } from "@/components/ui/carbon/icons"
import { useTranslations } from "next-intl"

const BROWSER_ICON_PATHS: Record<BrowserName, string> = {
  chrome: "/browsers/chrome.webp",
  firefox: "/browsers/firefox.webp",
  safari: "/browsers/safari.webp",
  edge: "/browsers/edge.webp",
  opera: "/browsers/opera.webp",
  brave: "/browsers/brave.webp",
  samsung: "/browsers/samsung.webp",
  unknown: "",
}

const DEVICE_ICONS = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
} as const

interface Props {
  browser: BrowserName
  deviceType?: "desktop" | "mobile" | "tablet"
  className?: string
  classNameContainer?: string
  size?: "sm" | "md" | "lg"
}

export function BrowserIcon({
  browser,
  deviceType = "desktop",
  className,
  size = "md",
  classNameContainer,
}: Props) {
  const t = useTranslations()

  const deviceLabels = {
    desktop: t("desktop"),
    mobile: t("mobile"),
    tablet: t("tablet"),
  } as const

  const browserLabels: Record<BrowserName, string> = {
    chrome: t("chrome"),
    firefox: t("firefox"),
    safari: t("safari"),
    edge: t("edge"),
    opera: t("opera"),
    brave: t("brave"),
    samsung: t("samsungInternet"),
    unknown: t("unknownBrowser"),
  }

  const iconPath = BROWSER_ICON_PATHS[browser]
  const isKnownBrowser = browser !== "unknown" && iconPath
  const DeviceIcon = DEVICE_ICONS[deviceType] || Monitor
  const deviceLabel = deviceLabels[deviceType]
  const browserLabel = browserLabels[browser]

  const sizes = {
    sm: {
      container: "h-9 w-9",
      deviceIcon: "h-5 w-5",
      browserBadge: "h-4 w-4",
      browserIcon: "h-3 w-3",
    },
    md: {
      container: "h-12 w-12",
      deviceIcon: "h-7 w-7",
      browserBadge: "h-7 w-7",
      browserIcon: "h-8 w-8",
    },
    lg: {
      container: "h-14 w-14",
      deviceIcon: "h-8 w-8",
      browserBadge: "h-6 w-6",
      browserIcon: "h-4.5 w-4.5",
    },
  }

  const currentSize = sizes[size]

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-md bg-primary/20",
          currentSize.container,
          classNameContainer
        )}
        title={deviceLabel}
      >
        <DeviceIcon className={currentSize.deviceIcon} strokeWidth={1.8} />

        <div
          className={cn(
            "absolute -right-1 -bottom-1 flex items-center justify-center rounded-full",
            currentSize.browserBadge
          )}
          title={browserLabel}
        >
          {isKnownBrowser ? (
            <img
              src={iconPath}
              alt={browserLabel}
              className={cn("object-contain", currentSize.browserIcon)}
            />
          ) : (
            <Globe
              className={cn("text-muted-foreground", currentSize.browserIcon)}
              strokeWidth={2}
            />
          )}
        </div>
      </div>
    </div>
  )
}
