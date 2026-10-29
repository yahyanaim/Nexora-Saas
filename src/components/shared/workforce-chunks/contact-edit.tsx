"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { withContact, withoutContact } from "@/lib/workforce/contacts"
import { isWebUrl } from "@/lib/utils/url"
import { ContactRole, type Client, type ClientContact } from "@/types/workforce"

export const blankContact = (): ClientContact => ({ id: "", name: "", email: "", phone: "", position: "", role: undefined, isPrimary: false })

const splitList = (text: string) => [...new Set(text.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean))]
const isEmail = (x: string) => /^\S+@\S+\.\S+$/.test(x)

export { withContact, withoutContact }

interface DialogProps {
  /** The contact to change, a blank one to add, or null when closed */
  contact: ClientContact | null
  onClose: () => void
  onSave: (contact: ClientContact, clientId?: string) => void
  saving: boolean
  /** Adding from the Contacts page: pick which client the person works for */
  clients?: Client[]
}

/**
 * Add or change a contact (CRM steps 4 and 6): name, main e-mail and phone,
 * more e-mails and phones, position, LinkedIn, role and main contact.
 */
export function ContactDialog({ contact, onClose, onSave, saving, clients }: DialogProps) {
  const t = useTranslations()
  const [draft, setDraft] = React.useState<ClientContact>(blankContact())
  const [otherEmails, setOtherEmails] = React.useState("")
  const [otherPhones, setOtherPhones] = React.useState("")
  const [clientId, setClientId] = React.useState("")
  const [shown, setShown] = React.useState<ClientContact | null>(null)
  if (contact !== shown) {
    setShown(contact)
    if (contact) {
      setDraft(contact)
      setOtherEmails((contact.otherEmails ?? []).join(", "))
      setOtherPhones((contact.otherPhones ?? []).join(", "))
      setClientId("")
    }
  }
  const extraEmails = splitList(otherEmails)
  const pickClient = !!clients && !contact?.id
  const linkedinOk = !draft.linkedin?.trim() || isWebUrl(draft.linkedin)
  const valid = !!draft.name.trim() && isEmail(draft.email.trim()) && extraEmails.every(isEmail) && linkedinOk && (!pickClient || !!clientId)
  const set = (patch: Partial<ClientContact>) => setDraft((d) => ({ ...d, ...patch }))
  const pickedClient = clients?.find((c) => c.id === clientId)

  return (
    <Dialog open={!!contact} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!valid) return
            const email = draft.email.trim()
            onSave({ ...draft, name: draft.name.trim(), email, otherEmails: extraEmails.filter((x) => x !== email), otherPhones: splitList(otherPhones) }, pickClient ? clientId : undefined)
          }}
        >
          <DialogHeader>
            <DialogTitle>{contact?.id ? t("cpEditContact", { name: contact.name }) : t("cpAddContact")}</DialogTitle>
            <DialogDescription>{t("cpContactHint")}</DialogDescription>
          </DialogHeader>
          {pickClient && (
            <div className="space-y-1.5">
              <Label htmlFor="cp-client">{t("client")}</Label>
              <Select value={clientId || undefined} onValueChange={setClientId}>
                <SelectTrigger id="cp-client"><SelectValue placeholder={t("fuPickClient")}>{pickedClient?.name}</SelectValue></SelectTrigger>
                <SelectContent>{clients!.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="cp-name">{t("name")}</Label>
            <Input id="cp-name" value={draft.name} onChange={(e) => set({ name: e.target.value })} autoFocus required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cp-email">{t("email")}</Label>
              <Input id="cp-email" type="email" value={draft.email} onChange={(e) => set({ email: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-phone">{t("phone")}</Label>
              <Input id="cp-phone" type="tel" dir="ltr" value={draft.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-emails">{t("ctOtherEmails")}</Label>
              <Input id="cp-emails" value={otherEmails} onChange={(e) => setOtherEmails(e.target.value)} placeholder={t("ctListHint")} aria-invalid={!extraEmails.every(isEmail)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-phones">{t("ctOtherPhones")}</Label>
              <Input id="cp-phones" dir="ltr" value={otherPhones} onChange={(e) => setOtherPhones(e.target.value)} placeholder={t("ctListHint")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-position">{t("cpPosition")}</Label>
              <Input id="cp-position" value={draft.position ?? ""} onChange={(e) => set({ position: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-role">{t("cpRole")}</Label>
              <Select value={draft.role ?? "none"} onValueChange={(v) => set({ role: v === "none" ? undefined : (v as ContactRole) })}>
                <SelectTrigger id="cp-role"><SelectValue>{draft.role ? t(`ctRole_${draft.role}`) : "—"}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {Object.values(ContactRole).map((r) => <SelectItem key={r} value={r}>{t(`ctRole_${r}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-linkedin">LinkedIn</Label>
            <Input id="cp-linkedin" type="url" dir="ltr" value={draft.linkedin ?? ""} onChange={(e) => set({ linkedin: e.target.value })} placeholder="https://www.linkedin.com/in/…" aria-invalid={!linkedinOk} aria-describedby={linkedinOk ? undefined : "cp-linkedin-error"} />
            {!linkedinOk && <p id="cp-linkedin-error" className="text-sm text-destructive">{t("err_badUrl")}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={draft.isPrimary} onCheckedChange={(v) => set({ isPrimary: !!v })} />
            {t("cpMakePrimary")}
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button type="submit" disabled={!valid || saving}>{t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
