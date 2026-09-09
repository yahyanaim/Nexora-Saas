"use client"
import { Button } from "@/components/ui/button"
import {
  PROFILE_PATTERNS,
  ProfilePattern,
} from "@/components/ui/profile-pattern"
import { useRef } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useLogout } from "@/hooks/auth/use-logout"
import { UseFormWatch } from "react-hook-form"
import { ProfileFormValues } from "@/hooks/my-profile/use-my-profile"
import AvatarUploader, {
  AvatarUploaderHandle,
} from "@/components/ui/avatar-uploader"
import { useTranslations } from "next-intl"

interface Props {
  handleRemoveImage: () => void
  handleImageChange: (file: File, previewUrl: string) => void
  watch: UseFormWatch<ProfileFormValues>
}

export const AccountHeader = ({
  handleRemoveImage,
  handleImageChange,
  watch,
}: Props) => {
  const t = useTranslations()
  const avatarUploaderRef = useRef<AvatarUploaderHandle>(null)
  const {
    mutation: logoutMutation,
    showLogoutDialog,
    setShowLogoutDialog,
  } = useLogout()

  const nameValue = watch("name")
  const profileColorValue = watch("profileColor")
  const avatarUrlValue = watch("avatarUrl")
  const currentColor = PROFILE_PATTERNS?.find(
    (el) => el?.color === profileColorValue
  )

  return (
    <>
      <div className="relative flex h-56 flex-col items-center justify-center pt-6 transition-all duration-500 sm:h-70 sm:pt-10">
        <ProfilePattern color={currentColor?.color} Icon={currentColor?.icon} />

        <AvatarUploader
          ref={avatarUploaderRef}
          imageUrl={avatarUrlValue}
          fallbackText={nameValue}
          borderColor={currentColor?.color}
          glowColor={currentColor?.color}
          size="lg"
          onImageChange={handleImageChange}
          onImageRemove={handleRemoveImage}
          className="px-4 sm:px-6"
        />

        <p className="mt-1.5 text-center text-lg font-bold sm:mt-2 sm:text-xl">
          {nameValue}
        </p>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="mx-auto max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">
              {t("logOutQuestion")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              {t("logOutDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => setShowLogoutDialog(false)}
              className="flex-1"
              variant={"outline"}
            >
              {t("cancel")}
            </Button>
            <Button
              className="flex-1"
              onClick={() => logoutMutation.mutate()}
              variant={"destructive"}
            >
              {logoutMutation.isPending ? t("loggingOut") : t("logOut")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
