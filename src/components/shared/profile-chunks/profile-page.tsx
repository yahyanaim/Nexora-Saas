"use client"

import { useMyProfile } from "@/hooks/my-profile/use-my-profile"
import { YourInfo } from "./your-info/your-info"
import { ContactInfo } from "./contact-info/contact-info"
import { FabStack, FabStackItem } from "@/components/ui/fab-stack"
import { Button } from "@/components/ui/button"
import { Check, RotateCcw } from "@/components/ui/carbon/icons"
import { Spinner } from "@/components/ui/spinner"
import { AccountHeader } from "./account-header"
import { Security } from "./security/security"

export function ProfilePage() {
  const {
    register,
    loadingUploadingAvatar,
    loading,
    handleSubmit,
    errors,
    handleRemoveImage,
    handleImageChange,
    onSubmit,
    watch,
    setValue,
    hasChanges,
    discardChanges,
  } = useMyProfile()

  return (
    <div className="h-full w-full overflow-y-auto">
      {/* Profile Header with Color */}
      <AccountHeader
        handleRemoveImage={handleRemoveImage}
        handleImageChange={handleImageChange}
        watch={watch}
      />

      {/* Form with Glass Card Effect */}
      <form onSubmit={handleSubmit(onSubmit)} className="px-4 pb-60">
        <div className="space-y-4 rounded-md border-white/10 bg-background/50 py-2 backdrop-blur-sm md:py-3">
          <YourInfo
            setValue={setValue}
            errors={errors}
            register={register}
            watch={watch}
          />

          <ContactInfo errors={errors} register={register} />
          <Security />
        </div>
      </form>

      <FabStack className="absolute right-4 bottom-4">
        {hasChanges && (
          <FabStackItem>
            <Button
              variant="red"
              className="h-11 w-11 rounded-full"
              size="icon-lg"
              onClick={discardChanges}
            >
              <RotateCcw className="size-5" />
            </Button>
          </FabStackItem>
        )}
        <FabStackItem>
          <Button
            variant={"primary"}
            className="h-14 w-14 rounded-full"
            onClick={handleSubmit(onSubmit)}
            size={"icon-lg"}
            disabled={!hasChanges || loadingUploadingAvatar || loading}
          >
            {loadingUploadingAvatar || loading ? (
              <Spinner className="size-6" />
            ) : (
              <Check className="size-6" />
            )}
          </Button>
        </FabStackItem>
      </FabStack>
    </div>
  )
}
