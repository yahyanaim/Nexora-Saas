export type BrowserName =
  | "chrome"
  | "firefox"
  | "safari"
  | "edge"
  | "opera"
  | "brave"
  | "samsung"
  | "unknown"

export type OsName =
  "windows" | "macos" | "ios" | "android" | "linux" | "unknown"

export interface ParsedUserAgent {
  browserName: BrowserName
  browserLabel: string
  browserVersion: string
  osName: OsName
  osLabel: string
  osVersion: string
  deviceType: "desktop" | "mobile" | "tablet"
  displayName: string
}

export function parseUserAgent(
  ua: string,
  t: (key: string, values?: Record<string, string | number>) => string
): ParsedUserAgent {
  const s = ua || ""

  let browserName: BrowserName = "unknown"
  let browserLabel = t("unknownBrowser")
  let browserVersion = ""

  // Detect browser
  if (/edg\//i.test(s)) {
    browserName = "edge"
    browserLabel = t("edge")
    browserVersion = s.match(/edg\/([\d.]+)/i)?.[1] ?? ""
  } else if (/opr\//i.test(s) || /opera/i.test(s)) {
    browserName = "opera"
    browserLabel = t("opera")
    browserVersion = s.match(/(?:opr|opera)\/([\d.]+)/i)?.[1] ?? ""
  } else if (/brave/i.test(s)) {
    browserName = "brave"
    browserLabel = t("brave")
    browserVersion = s.match(/chrome\/([\d.]+)/i)?.[1] ?? ""
  } else if (/samsungbrowser/i.test(s)) {
    browserName = "samsung"
    browserLabel = t("samsungInternet")
    browserVersion = s.match(/samsungbrowser\/([\d.]+)/i)?.[1] ?? ""
  } else if (/chrome|crios/i.test(s)) {
    browserName = "chrome"
    browserLabel = t("chrome")
    browserVersion = s.match(/(?:chrome|crios)\/([\d.]+)/i)?.[1] ?? ""
  } else if (/firefox|fxios/i.test(s)) {
    browserName = "firefox"
    browserLabel = t("firefox")
    browserVersion = s.match(/(?:firefox|fxios)\/([\d.]+)/i)?.[1] ?? ""
  } else if (/safari/i.test(s)) {
    browserName = "safari"
    browserLabel = t("safari")
    browserVersion = s.match(/version\/([\d.]+)/i)?.[1] ?? ""
  }

  // Detect operating system
  let osName: OsName = "unknown"
  let osLabel = t("unknownOs")
  let osVersion = ""

  if (/windows nt/i.test(s)) {
    osName = "windows"
    const ver = s.match(/windows nt ([\d.]+)/i)?.[1] ?? ""
    const map: Record<string, string> = {
      "10.0": "10/11",
      "6.3": "8.1",
      "6.2": "8",
      "6.1": "7",
    }
    osLabel = t("windows")
    osVersion = map[ver] ?? ver
  } else if (/iphone|ipad|ipod/i.test(s)) {
    osName = "ios"
    osLabel = /ipad/i.test(s) ? t("ipados") : t("ios")
    osVersion = s.match(/os ([\d_]+)/i)?.[1]?.replace(/_/g, ".") ?? ""
  } else if (/mac os x/i.test(s)) {
    osName = "macos"
    osLabel = t("macos")
    osVersion = s.match(/mac os x ([\d_]+)/i)?.[1]?.replace(/_/g, ".") ?? ""
  } else if (/android/i.test(s)) {
    osName = "android"
    osLabel = t("android")
    osVersion = s.match(/android ([\d.]+)/i)?.[1] ?? ""
  } else if (/linux/i.test(s)) {
    osName = "linux"
    osLabel = t("linux")
  }

  // Detect device type
  let deviceType: ParsedUserAgent["deviceType"] = "desktop"
  if (/ipad|tablet/i.test(s)) deviceType = "tablet"
  else if (/mobi|iphone|android/i.test(s)) deviceType = "mobile"

  // Build display name
  const displayName = t("browserOnOs", {
    browser: browserLabel,
    os: osLabel,
  })

  return {
    browserName,
    browserLabel,
    browserVersion,
    osName,
    osLabel,
    osVersion,
    deviceType,
    displayName,
  }
}
