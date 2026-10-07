"use client"

/**
 * App icon set: lucide line icons, exported under the names used across the app
 * (lucide names plus a few legacy Carbon names). Every icon defaults to 16px with
 * a 1.75 stroke for the light, refined look of the design system; a size-* class
 * or the size prop still overrides it.
 */
import * as React from "react"
import type { LucideProps } from "lucide-react"
import {
  Activity as LActivity,
  Archive as LArchive,
  ArrowDown as LArrowDown,
  ArrowLeft as LArrowLeft,
  ArrowLeftRight as LArrowLeftRight,
  ArrowRight as LArrowRight,
  ArrowUp as LArrowUp,
  ArrowUpRight as LArrowUpRight,
  BadgeCheck as LBadgeCheck,
  Ban as LBan,
  Bell as LBell,
  BrushCleaning as LBrushCleaning,
  Bug as LBug,
  Briefcase as LBriefcase,
  CalendarDays as LCalendarDays,
  ChartGantt as LChartGantt,
  Gauge as LGauge,
  Building2 as LBuilding2,
  Handshake as LHandshake,
  Calendar as LCalendar,
  ChartLine as LChartLine,
  ChartNoAxesCombined as LChartNoAxesCombined,
  ChartSpline as LChartSpline,
  Check as LCheck,
  ChevronDown as LChevronDown,
  ChevronLeft as LChevronLeft,
  ChevronRight as LChevronRight,
  ChevronUp as LChevronUp,
  ChevronsLeft as LChevronsLeft,
  ChevronsRight as LChevronsRight,
  ChevronsUpDown as LChevronsUpDown,
  CircleAlert as LCircleAlert,
  CircleArrowUp as LCircleArrowUp,
  CircleCheck as LCircleCheck,
  CircleHelp as LCircleHelp,
  CirclePlus as LCirclePlus,
  CircleUser as LCircleUser,
  CircleX as LCircleX,
  ClipboardCheck as LClipboardCheck,
  Clock as LClock,
  Cloud as LCloud,
  CloudFog as LCloudFog,
  Code as LCode,
  Copy as LCopy,
  CreditCard as LCreditCard,
  Crown as LCrown,
  Delete as LDelete,
  Diamond as LDiamond,
  DollarSign as LDollarSign,
  Download as LDownload,
  Droplet as LDroplet,
  Ellipsis as LEllipsis,
  ExternalLink as LExternalLink,
  Eye as LEye,
  EyeOff as LEyeOff,
  File as LFile,
  FileAudio as LFileAudio,
  FileCode as LFileCode,
  FileImage as LFileImage,
  FileSpreadsheet as LFileSpreadsheet,
  FileText as LFileText,
  FileType as LFileType,
  FileUp as LFileUp,
  FileVideo as LFileVideo,
  Files as LFiles,
  Flag as LFlag,
  Flame as LFlame,
  Folder as LFolder,
  FolderArchive as LFolderArchive,
  FolderKanban as LFolderKanban,
  FolderOpen as LFolderOpen,
  Gem as LGem,
  Ghost as LGhost,
  Globe as LGlobe,
  HardDrive as LHardDrive,
  Heart as LHeart,
  History as LHistory,
  Image as LImage,
  Info as LInfo,
  Key as LKey,
  KeyRound as LKeyRound,
  Languages as LLanguages,
  LayoutDashboard as LLayoutDashboard,
  Leaf as LLeaf,
  ListFilter as LListFilter,
  LoaderCircle as LLoaderCircle,
  Lock as LLock,
  LockKeyhole as LLockKeyhole,
  LockKeyholeOpen as LLockKeyholeOpen,
  LogOut as LLogOut,
  Mail as LMail,
  MailCheck as LMailCheck,
  Megaphone as LMegaphone,
  Menu as LMenu,
  MessagesSquare as LMessagesSquare,
  Minus as LMinus,
  Monitor as LMonitor,
  MonitorSmartphone as LMonitorSmartphone,
  Moon as LMoon,
  Music as LMusic,
  Network as LNetwork,
  OctagonX as LOctagonX,
  Palette as LPalette,
  PanelLeft as LPanelLeft,
  Pencil as LPencil,
  Percent as LPercent,
  Plus as LPlus,
  Power as LPower,
  PowerOff as LPowerOff,
  Printer as LPrinter,
  QrCode as LQrCode,
  Receipt as LReceipt,
  RefreshCw as LRefreshCw,
  Rocket as LRocket,
  RotateCcw as LRotateCcw,
  RotateCcwKey as LRotateCcwKey,
  RotateCw as LRotateCw,
  Scan as LScan,
  Search as LSearch,
  Send as LSend,
  Server as LServer,
  Settings as LSettings,
  Share2 as LShare2,
  Shield as LShield,
  ShieldAlert as LShieldAlert,
  ShieldCheck as LShieldCheck,
  ShieldQuestion as LShieldQuestion,
  ShieldUser as LShieldUser,
  SlidersHorizontal as LSlidersHorizontal,
  Smartphone as LSmartphone,
  Snowflake as LSnowflake,
  Sparkles as LSparkles,
  Star as LStar,
  Sun as LSun,
  Tablet as LTablet,
  Terminal as LTerminal,
  Trash as LTrash,
  Trash2 as LTrash2,
  TreePalm as LTreePalm,
  FileBadge as LFileBadge,
  FileSignature as LFileSignature,
  TrendingDown as LTrendingDown,
  TrendingUp as LTrendingUp,
  TriangleAlert as LTriangleAlert,
  Trophy as LTrophy,
  Upload as LUpload,
  User as LUser,
  UserPlus as LUserPlus,
  UserRoundKey as LUserRoundKey,
  UserX as LUserX,
  Users as LUsers,
  Video as LVideo,
  Volleyball as LVolleyball,
  Webhook as LWebhook,
  X as LX,
  Play as LPlay,
  Square as LSquare,
  Zap as LZap,
  FileChartColumn as LFileChartColumn,
  IdCard as LIdCard,
  ChartColumnStacked as LChartColumnStacked,
  Truck as LTruck,
  ReceiptText as LReceiptText,
  HandCoins as LHandCoins,
  Wallet as LWallet,
  BadgeDollarSign as LBadgeDollarSign,
  UsersRound as LUsersRound,
  CalendarRange as LCalendarRange,
  Funnel as LFunnel,
  Landmark as LLandmark,
} from "lucide-react"

export type LucideIcon = React.ComponentType<{ className?: string; size?: number | string; [key: string]: unknown }>

type BaseIcon = React.ForwardRefExoticComponent<LucideProps & React.RefAttributes<SVGSVGElement>>

function icon(Base: BaseIcon, name: string) {
  const Icon = React.forwardRef<SVGSVGElement, LucideProps>((props, ref) => (
    <Base ref={ref} size={16} strokeWidth={1.75} aria-hidden="true" {...props} />
  ))
  Icon.displayName = name
  return Icon
}

export const AlertCircle = icon(LCircleAlert, "AlertCircle")
export const ArrowLeftRight = icon(LArrowLeftRight, "ArrowLeftRight")
export const ArrowUpCircle = icon(LCircleArrowUp, "ArrowUpCircle")
export const BadgeCheck = icon(LBadgeCheck, "BadgeCheck")
export const Ban = icon(LBan, "Ban")
export const Bell = icon(LBell, "Bell")
export const BrushCleaning = icon(LBrushCleaning, "BrushCleaning")
export const Bug = icon(LBug, "Bug")
export const CalendarIcon = icon(LCalendar, "CalendarIcon")
export const ChartNoAxesCombined = icon(LChartNoAxesCombined, "ChartNoAxesCombined")
export const Check = icon(LCheck, "Check")
export const CheckCircle = icon(LCircleCheck, "CheckCircle")
export const CheckCircle2 = icon(LCircleCheck, "CheckCircle2")
export const CheckIcon = icon(LCheck, "CheckIcon")
export const ChevronDownIcon = icon(LChevronDown, "ChevronDownIcon")
export const ChevronLeftIcon = icon(LChevronLeft, "ChevronLeftIcon")
export const ChevronRightIcon = icon(LChevronRight, "ChevronRightIcon")
export const ChevronUpIcon = icon(LChevronUp, "ChevronUpIcon")
export const ChevronsLeft = icon(LChevronsLeft, "ChevronsLeft")
export const ChevronsRight = icon(LChevronsRight, "ChevronsRight")
export const ChevronsUpDown = icon(LChevronsUpDown, "ChevronsUpDown")
export const CircleCheckIcon = icon(LCircleCheck, "CircleCheckIcon")
export const ClipboardCheck = icon(LClipboardCheck, "ClipboardCheck")
export const Clock = icon(LClock, "Clock")
export const CloudFog = icon(LCloudFog, "CloudFog")
export const CreditCard = icon(LCreditCard, "CreditCard")
export const Crown = icon(LCrown, "Crown")
export const Diamond = icon(LDiamond, "Diamond")
export const DollarSign = icon(LDollarSign, "DollarSign")
export const Droplet = icon(LDroplet, "Droplet")
export const ExternalLink = icon(LExternalLink, "ExternalLink")
export const Eye = icon(LEye, "Eye")
export const EyeOff = icon(LEyeOff, "EyeOff")
export const File = icon(LFile, "File")
export const FileAudio = icon(LFileAudio, "FileAudio")
export const FileCode = icon(LFileCode, "FileCode")
export const FileImage = icon(LFileImage, "FileImage")
export const FileSpreadsheet = icon(LFileSpreadsheet, "FileSpreadsheet")
export const FileText = icon(LFileText, "FileText")
export const FileType = icon(LFileType, "FileType")
export const FileUp = icon(LFileUp, "FileUp")
export const FileVideo = icon(LFileVideo, "FileVideo")
export const Files = icon(LFiles, "Files")
export const Flame = icon(LFlame, "Flame")
export const FolderArchive = icon(LFolderArchive, "FolderArchive")
export const FolderKanban = icon(LFolderKanban, "FolderKanban")
export const Ghost = icon(LGhost, "Ghost")
export const Heart = icon(LHeart, "Heart")
export const Info = icon(LInfo, "Info")
export const InfoIcon = icon(LInfo, "InfoIcon")
export const KeyRound = icon(LKeyRound, "KeyRound")
export const Languages = icon(LLanguages, "Languages")
export const LayoutDashboard = icon(LLayoutDashboard, "LayoutDashboard")
export const Leaf = icon(LLeaf, "Leaf")
export const ListFilter = icon(LListFilter, "ListFilter")
export const Loader2 = icon(LLoaderCircle, "Loader2")
export const Loader2Icon = icon(LLoaderCircle, "Loader2Icon")
export const Lock = icon(LLock, "Lock")
export const LockKeyhole = icon(LLockKeyhole, "LockKeyhole")
export const LockKeyholeOpen = icon(LLockKeyholeOpen, "LockKeyholeOpen")
export const LogOut = icon(LLogOut, "LogOut")
export const Mail = icon(LMail, "Mail")
export const MailCheck = icon(LMailCheck, "MailCheck")
export const Megaphone = icon(LMegaphone, "Megaphone")
export const MessagesSquare = icon(LMessagesSquare, "MessagesSquare")
export const Monitor = icon(LMonitor, "Monitor")
export const MonitorSmartphone = icon(LMonitorSmartphone, "MonitorSmartphone")
export const MoreHorizontal = icon(LEllipsis, "MoreHorizontal")
export const MoreHorizontalIcon = icon(LEllipsis, "MoreHorizontalIcon")
export const Network = icon(LNetwork, "Network")
export const Server = icon(LServer, "Server")
export const HardDrive = icon(LHardDrive, "HardDrive")
export const OctagonXIcon = icon(LOctagonX, "OctagonXIcon")
export const Palette = icon(LPalette, "Palette")
export const Pencil = icon(LPencil, "Pencil")
export const Plus = icon(LPlus, "Plus")
export const PlusCircle = icon(LCirclePlus, "PlusCircle")
export const PowerOff = icon(LPowerOff, "PowerOff")
export const RefreshCw = icon(LRefreshCw, "RefreshCw")
export const RotateCcw = icon(LRotateCcw, "RotateCcw")
export const RotateCcwKey = icon(LRotateCcwKey, "RotateCcwKey")
export const RotateCw = icon(LRotateCw, "RotateCw")
export const SearchIcon = icon(LSearch, "SearchIcon")
export const Share2 = icon(LShare2, "Share2")
export const Shield = icon(LShield, "Shield")
export const ShieldCheck = icon(LShieldCheck, "ShieldCheck")
export const ShieldQuestion = icon(LShieldQuestion, "ShieldQuestion")
export const ShieldUser = icon(LShieldUser, "ShieldUser")
export const Smartphone = icon(LSmartphone, "Smartphone")
export const Sparkles = icon(LSparkles, "Sparkles")
export const Trash = icon(LTrash, "Trash")
export const Trash2 = icon(LTrash2, "Trash2")
export const TreePalm = icon(LTreePalm, "TreePalm")
export const FileBadge = icon(LFileBadge, "FileBadge")
export const FileSignature = icon(LFileSignature, "FileSignature")
export const TrendingDown = icon(LTrendingDown, "TrendingDown")
export const TrendingUp = icon(LTrendingUp, "TrendingUp")
export const TriangleAlertIcon = icon(LTriangleAlert, "TriangleAlertIcon")
export const AlertTriangle = icon(LTriangleAlert, "AlertTriangle")
export const UserPlus = icon(LUserPlus, "UserPlus")
export const UserRoundKey = icon(LUserRoundKey, "UserRoundKey")
export const UserX = icon(LUserX, "UserX")
export const Users = icon(LUsers, "Users")
export const Volleyball = icon(LVolleyball, "Volleyball")
export const X = icon(LX, "X")
export const Play = icon(LPlay, "Play")
export const Square = icon(LSquare, "Square")
export const XCircle = icon(LCircleX, "XCircle")
export const Zap = icon(LZap, "Zap")
export const DownloadIcon = icon(LDownload, "DownloadIcon")
export const HistoryIcon = icon(LHistory, "HistoryIcon")
export const TerminalIcon = icon(LTerminal, "TerminalIcon")
export const WebhookIcon = icon(LWebhook, "WebhookIcon")
export const Key = icon(LKey, "Key")
export const CopyIcon = icon(LCopy, "CopyIcon")
export const Activity = icon(LActivity, "Activity")
export const Add = icon(LPlus, "Add")
export const Archive = icon(LArchive, "Archive")
export const ArrowDown = icon(LArrowDown, "ArrowDown")
export const ArrowLeft = icon(LArrowLeft, "ArrowLeft")
export const ArrowRight = icon(LArrowRight, "ArrowRight")
export const ArrowUp = icon(LArrowUp, "ArrowUp")
export const ArrowUpRight = icon(LArrowUpRight, "ArrowUpRight")
export const Building = icon(LBuilding2, "Building")
export const Briefcase = icon(LBriefcase, "Briefcase")
export const CalendarDays = icon(LCalendarDays, "CalendarDays")
export const ChartGantt = icon(LChartGantt, "ChartGantt")
export const Gauge = icon(LGauge, "Gauge")
export const Handshake = icon(LHandshake, "Handshake")
export const Calendar = icon(LCalendar, "Calendar")
export const ChartLine = icon(LChartLine, "ChartLine")
export const ChartLineData = icon(LChartSpline, "ChartLineData")
export const Checkmark = icon(LCheck, "Checkmark")
export const ChevronDown = icon(LChevronDown, "ChevronDown")
export const ChevronLeft = icon(LChevronLeft, "ChevronLeft")
export const ChevronRight = icon(LChevronRight, "ChevronRight")
export const ChevronSort = icon(LChevronsUpDown, "ChevronSort")
export const Close = icon(LX, "Close")
export const Cloud = icon(LCloud, "Cloud")
export const Code = icon(LCode, "Code")
export const Copy = icon(LCopy, "Copy")
export const Delete = icon(LDelete, "Delete")
export const Download = icon(LDownload, "Download")
export const Flag = icon(LFlag, "Flag")
export const Folder = icon(LFolder, "Folder")
export const FolderOpen = icon(LFolderOpen, "FolderOpen")
export const Gem = icon(LGem, "Gem")
export const Globe = icon(LGlobe, "Globe")
export const History = icon(LHistory, "History")
export const Image = icon(LImage, "Image")
export const Information = icon(LInfo, "Information")
export const Misuse = icon(LBan, "Misuse")
export const Moon = icon(LMoon, "Moon")
export const Music = icon(LMusic, "Music")
export const Power = icon(LPower, "Power")
export const Printer = icon(LPrinter, "Printer")
export const QrCode = icon(LQrCode, "QrCode")
export const Receipt = icon(LReceipt, "Receipt")
export const Renew = icon(LRefreshCw, "Renew")
export const Rocket = icon(LRocket, "Rocket")
export const Scan = icon(LScan, "Scan")
export const Search = icon(LSearch, "Search")
export const Send = icon(LSend, "Send")
export const Settings = icon(LSettings, "Settings")
export const SettingsAdjust = icon(LSlidersHorizontal, "SettingsAdjust")
export const ShieldAlert = icon(LShieldAlert, "ShieldAlert")
export const SidePanelOpen = icon(LPanelLeft, "SidePanelOpen")
export const Snowflake = icon(LSnowflake, "Snowflake")
export const Star = icon(LStar, "Star")
export const Sun = icon(LSun, "Sun")
export const Tablet = icon(LTablet, "Tablet")
export const Terminal = icon(LTerminal, "Terminal")
export const Upload = icon(LUpload, "Upload")
export const User = icon(LUser, "User")
export const UserAvatar = icon(LCircleUser, "UserAvatar")
export const UserFollow = icon(LUserPlus, "UserFollow")
export const Video = icon(LVideo, "Video")
export const Warning = icon(LTriangleAlert, "Warning")
export const WarningAlt = icon(LTriangleAlert, "WarningAlt")
export const Webhook = icon(LWebhook, "Webhook")
export const Trophy = icon(LTrophy, "Trophy")
export const CircleHelp = icon(LCircleHelp, "CircleHelp")
export const Minus = icon(LMinus, "Minus")
export const Menu = icon(LMenu, "Menu")
export const Percent = icon(LPercent, "Percent")
export const PanelLeft = icon(LPanelLeft, "PanelLeft")
export const FileChartColumn = icon(LFileChartColumn, "FileChartColumn")
export const IdCard = icon(LIdCard, "IdCard")
export const ChartColumnStacked = icon(LChartColumnStacked, "ChartColumnStacked")
export const Truck = icon(LTruck, "Truck")
export const ReceiptText = icon(LReceiptText, "ReceiptText")
export const HandCoins = icon(LHandCoins, "HandCoins")
export const Wallet = icon(LWallet, "Wallet")
export const BadgeDollarSign = icon(LBadgeDollarSign, "BadgeDollarSign")
export const UsersRound = icon(LUsersRound, "UsersRound")
export const CalendarRange = icon(LCalendarRange, "CalendarRange")
export const Funnel = icon(LFunnel, "Funnel")
export const Landmark = icon(LLandmark, "Landmark")
