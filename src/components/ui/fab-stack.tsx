"use client"

import { AnimatePresence, motion, type Variants } from "motion/react"
import { cn } from "@/lib/utils"

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  exit: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.4, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 500, damping: 22, mass: 0.6 },
  },
  exit: { opacity: 0, scale: 0.4, y: 8, transition: { duration: 0.15 } },
}

interface FabStackProps {
  show?: boolean
  className?: string
  children: React.ReactNode
}

export function FabStack({ show = true, className, children }: FabStackProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn("flex flex-col items-center gap-2", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function FabStackItem({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  )
}
