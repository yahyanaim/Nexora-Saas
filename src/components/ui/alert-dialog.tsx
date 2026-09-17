"use client"

import * as React from "react"
import {
  Dialog as AlertDialog,
  DialogTrigger as AlertDialogTrigger,
  DialogContent as AlertDialogContent,
  DialogHeader as AlertDialogHeader,
  DialogFooter as AlertDialogFooter,
  DialogTitle as AlertDialogTitle,
  DialogDescription as AlertDialogDescription,
  DialogClose as AlertDialogCancel,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
}

export function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return <Button variant="primary" className={className} {...props} />
}
