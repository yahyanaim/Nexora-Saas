"use client"
import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { z } from "zod"
import { useLogout } from "../auth/use-logout"
import { useMutation } from "@tanstack/react-query"
import { changeProfileInfApi } from "@/lib/api/auth-apis"
import { uploadFile } from "@/lib/api/upload-apis"
import { AvatarUploaderHandle } from "@/components/ui/avatar-uploader"
import { ChangeProfilePayload } from "@/types/auth"

export const profileSchema = z.object({
  name: z.string().max(50, "Name cannot exceed 50 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and underscores allowed"),
  bio: z.string().max(200, "Bio cannot exceed 200 characters").optional(),
  email: z.string().email("Invalid email address"),
  birthday: z.string().optional(),
  profileColor: z.string().optional(),
  avatarFile: z.any().optional(),
  avatarUrl: z.string().optional(),
})

export type ProfileFormValues = z.infer<typeof profileSchema>

export function useMyProfile() {
  const { authedUser, myEmail, updatedUser } = useAuthGuard()
  const fileInputRef = useRef<AvatarUploaderHandle>(null)
  const [loadingUploadingAvatar, setLoadingUploadingAvatar] = useState(false)
  const {
    mutation: logoutMutation,
    showLogoutDialog,
    setShowLogoutDialog,
  } = useLogout()

  const changeProfileInfo = useMutation({
    mutationFn: async (payload: ChangeProfilePayload) => {
      return await changeProfileInfApi(payload)
    },
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: myEmail || "",
      name: authedUser?.name || "",
      bio: authedUser?.bio || "",
      username: authedUser?.username || "",
      birthday: authedUser?.dateOfBirth || "",
      profileColor: authedUser?.profileColor || "",
      avatarUrl: authedUser?.avatar || "",
      avatarFile: null,
    },
  })

  const hasChanges = isDirty
  const handleRemoveImage = () => {
    setValue("avatarUrl", "", { shouldDirty: true })
    setValue("avatarFile", null, { shouldDirty: true })
  }

  const handleImageChange = (file: File, previewUrl: string) => {
    if (!file) return
    setValue("avatarFile", file, { shouldDirty: true })
    setValue("avatarUrl", previewUrl, { shouldDirty: true })
  }

  const onSubmit = async (values: ProfileFormValues) => {
    setLoadingUploadingAvatar(true)
    let newAvatar = ""
    if (values?.avatarFile) {
      const { url } = await uploadFile(values?.avatarFile)
      newAvatar = url
    } else if (values?.avatarUrl) {
      newAvatar = values?.avatarUrl
    }

    await changeProfileInfo.mutateAsync(
      {
        name: values.name,
        bio: values.bio,
        dateOfBirth: values.birthday,
        profileColor: values.profileColor,
        username: values.username,
        avatar: newAvatar,
      },
      {
        onSuccess: (data) => {
          updatedUser(data)
          reset({
            ...values,
            avatarUrl: newAvatar || values.avatarUrl,
            avatarFile: null,
          })
        },
        onSettled: () => {
          setLoadingUploadingAvatar(false)
        },
      }
    )
  }
  const discardChanges = () => {
    reset()
    fileInputRef.current = null
  }
  return {
    authedUser,
    fileInputRef,
    loading: changeProfileInfo.isPending,
    register,
    handleSubmit,
    errors,
    handleRemoveImage,
    handleImageChange,
    onSubmit,
    logoutMutation,
    showLogoutDialog,
    setShowLogoutDialog,
    watch,
    setValue,
    loadingUploadingAvatar,
    setLoadingUploadingAvatar,
    hasChanges,
    discardChanges,
  }
}
