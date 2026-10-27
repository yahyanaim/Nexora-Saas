"use client"

import { useCallback } from "react"
import { useTranslations } from "next-intl"
import { pipelineOf, stageOf } from "@/lib/workforce/deals"
import { useWorkspaceSettings } from "./use-settings"
import type { DealStageId, PipelineSettings } from "@/types/work-sales"

/**
 * The company's pipeline (CRM step 8) and the name of any stage: its own name,
 * or the translated label of a default stage, won or lost.
 */
export function usePipeline(): { pipeline: PipelineSettings; stageLabel: (stage: DealStageId) => string } {
  const t = useTranslations()
  const { data: settings } = useWorkspaceSettings()
  const pipeline = pipelineOf(settings)
  const stageLabel = useCallback(
    (stage: DealStageId) => {
      const named = stageOf(stage, pipeline)?.name
      if (named) return named
      return t.has(`dealStage_${stage}`) ? t(`dealStage_${stage}`) : stage
    },
    [pipeline, t]
  )
  return { pipeline, stageLabel }
}
