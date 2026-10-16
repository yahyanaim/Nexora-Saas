"use client"

import { useTranslations } from "next-intl"
import { VictorAssistant } from "@/components/shared/victor-assistant"
import { consoleTopicOf, consoleVictorAnswer, type ConsoleTopic, type Translate, type VictorInput } from "./console-victor-model"

/** Victor on the console home, answering from the figures the page shows (A11 step 6). */
export function ConsoleVictor(props: VictorInput) {
  const t = useTranslations()
  const translate = t as unknown as Translate
  const prompts: { text: string; topic: ConsoleTopic }[] = [
    { text: t("cvPromptMrr"), topic: "mrr" },
    { text: t("cvPromptOwed"), topic: "owed" },
    { text: t("cvPromptToday"), topic: "today" },
  ]
  return (
    <VictorAssistant
      description={t("cvDescription")}
      placeholder={t("cvPlaceholder")}
      prompts={prompts}
      topicOf={consoleTopicOf}
      answer={(topic) => consoleVictorAnswer(topic, props, translate)}
    />
  )
}
