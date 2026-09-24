"use client"

import { useState, useEffect, useCallback } from "react"
import {
  TaxRate,
  MoroccanFiscalConfig,
} from "@/types/taxes"
import {
  getTaxRates,
  addTaxRate,
  updateTaxRate,
  deleteTaxRate,
  getMoroccanFiscalConfig,
  updateMoroccanFiscalConfig,
  calculateMoroccanTax,
} from "@/lib/demo-data/taxes"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/lib/utils/toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Check, Trash2, Edit3, Calculator, ShieldCheck, Landmark, Percent } from "lucide-react"

export default function TaxesPage() {
  const [rates, setRates] = useState<TaxRate[]>(() => getTaxRates())
  const [fiscalConfig, setFiscalConfig] = useState<MoroccanFiscalConfig | null>(() => getMoroccanFiscalConfig())
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null)

  // Rate Form state
  const [formName, setFormName] = useState("")
  const [formCode, setFormCode] = useState("")
  const [formRate, setFormRate] = useState("20")
  const [formDescription, setFormDescription] = useState("")
  const [formIsDefault, setFormIsDefault] = useState(false)

  // Fiscal Config Form state
  const [ice, setIce] = useState(() => getMoroccanFiscalConfig().ice || "")
  const [ifNumber, setIfNumber] = useState(() => getMoroccanFiscalConfig().ifNumber || "")
  const [rcNumber, setRcNumber] = useState(() => getMoroccanFiscalConfig().rcNumber || "")
  const [patente, setPatente] = useState(() => getMoroccanFiscalConfig().patente || "")
  const [companyName, setCompanyName] = useState(() => getMoroccanFiscalConfig().companyName || "")
  const [address, setAddress] = useState(() => getMoroccanFiscalConfig().address || "")

  // Simulator state
  const [simAmount, setSimAmount] = useState<number>(1000)
  const [selectedSimRateId, setSelectedSimRateId] = useState<string>(() => {
    const loadedRates = getTaxRates()
    const defaultRate = loadedRates.find((r) => r.isDefault) || loadedRates[0]
    return defaultRate ? defaultRate.id : ""
  })

  const loadData = useCallback(() => {
    const loadedRates = getTaxRates()
    const loadedFiscal = getMoroccanFiscalConfig()
    setRates(loadedRates)
    setFiscalConfig(loadedFiscal)

    setIce(loadedFiscal.ice || "")
    setIfNumber(loadedFiscal.ifNumber || "")
    setRcNumber(loadedFiscal.rcNumber || "")
    setPatente(loadedFiscal.patente || "")
    setCompanyName(loadedFiscal.companyName || "")
    setAddress(loadedFiscal.address || "")

    const defaultRate = loadedRates.find((r) => r.isDefault) || loadedRates[0]
    if (defaultRate) {
      setSelectedSimRateId(defaultRate.id)
    }
  }, [])

  useEffect(() => {
    const handleUpdate = () => {
      loadData()
    }
    window.addEventListener("nexora_taxes_updated", handleUpdate)
    return () => {
      window.removeEventListener("nexora_taxes_updated", handleUpdate)
    }
  }, [loadData])

  const handleOpenAddDialog = () => {
    setEditingRate(null)
    setFormName("")
    setFormCode("")
    setFormRate("20")
    setFormDescription("")
    setFormIsDefault(false)
    setIsRateDialogOpen(true)
  }

  const handleOpenEditDialog = (rate: TaxRate) => {
    setEditingRate(rate)
    setFormName(rate.name)
    setFormCode(rate.code)
    setFormRate(String(rate.rate))
    setFormDescription(rate.description)
    setFormIsDefault(Boolean(rate.isDefault))
    setIsRateDialogOpen(true)
  }

  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault()
    const numRate = parseFloat(formRate)
    if (isNaN(numRate) || numRate < 0) {
      toast.error("Please provide a valid tax rate percentage (0 - 100).")
      return
    }

    if (!formName.trim() || !formCode.trim()) {
      toast.error("Tax Name and Tax Code are required.")
      return
    }

    if (editingRate) {
      updateTaxRate(editingRate.id, {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        rate: numRate,
        description: formDescription.trim(),
        isDefault: formIsDefault,
      })
      toast.success("Tax rate updated successfully.")
    } else {
      addTaxRate({
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        rate: numRate,
        type: "percentage",
        category: numRate === 20 ? "standard" : numRate === 0 ? "zero" : "reduced",
        isMoroccanTva: true,
        description: formDescription.trim() || "Custom Moroccan VAT rate.",
        isDefault: formIsDefault,
      })
      toast.success("New tax rate created successfully.")
    }

    setIsRateDialogOpen(false)
    loadData()
  }

  const handleSetDefault = (id: string) => {
    updateTaxRate(id, { isDefault: true })
    toast.success("Default tax rate updated for all billing, invoices & receipts.")
    loadData()
  }

  const handleDelete = (id: string) => {
    const rate = rates.find((r) => r.id === id)
    if (rate?.isDefault) {
      toast.error("Cannot delete the default active tax rate.")
      return
    }
    deleteTaxRate(id)
    toast.success("Tax rate deleted.")
    loadData()
  }

  const handleSaveFiscal = (e: React.FormEvent) => {
    e.preventDefault()
    updateMoroccanFiscalConfig({
      ice: ice.trim(),
      ifNumber: ifNumber.trim(),
      rcNumber: rcNumber.trim(),
      patente: patente.trim(),
      companyName: companyName.trim(),
      address: address.trim(),
    })
    toast.success("Moroccan Fiscal Identifiers saved. Applied to all invoices and receipts.")
    loadData()
  }

  const defaultActiveRate = rates.find((r) => r.isDefault) || rates[0]
  const simResult = calculateMoroccanTax(simAmount || 0, selectedSimRateId)

  return (
    <div className="space-y-8 p-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Taxes &amp; Moroccan TVA Management</h1>
            <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400">
              🇲🇦 CGI Maroc
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configure Moroccan Tax (TVA) rates, manage enterprise fiscal identifiers (ICE, IF, RC, Patente), and set tax rules that dynamically apply to billing, invoices, and receipts.
          </p>
        </div>

        <Button onClick={handleOpenAddDialog} className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Tax Rate
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active TVA Rate</CardTitle>
            <Percent className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{defaultActiveRate?.rate ?? 20}%</div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {defaultActiveRate?.name || "TVA Normale"} (Default)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enterprise ICE</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold font-mono tracking-tight">{fiscalConfig?.ice || "002847192000084"}</div>
            <p className="text-xs text-muted-foreground mt-1">15-digit verified fiscal code</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Configured Regimes</CardTitle>
            <Landmark className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rates.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Standard, Reduced &amp; Zero-rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Billing Effect</CardTitle>
            <Calculator className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">HT / TVA / TTC</div>
            <p className="text-xs text-muted-foreground mt-1">Automated on Invoices &amp; Receipts</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main: Tax Rates Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Moroccan VAT (TVA) Rates</CardTitle>
                  <CardDescription>
                    Rates configured here automatically govern the tax calculations across the Billing, Invoices, and Receipts modules.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3">Tax Name &amp; Code</th>
                      <th className="px-4 py-3">Rate</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rates.map((rate) => (
                      <tr key={rate.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {rate.name}
                            {rate.isDefault && (
                              <Badge variant="default" className="text-[10px] h-5 bg-blue-600">
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs font-mono text-muted-foreground mt-0.5">{rate.code}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1 mt-1">{rate.description}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-base font-mono">
                          {rate.rate}%
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize text-xs font-medium px-2 py-0.5 rounded-full bg-muted border">
                            {rate.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {rate.isDefault ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              <Check className="h-3.5 w-3.5" /> Active for Invoicing
                            </span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleSetDefault(rate.id)}
                            >
                              Set as Default
                            </Button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleOpenEditDialog(rate)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            {!rate.isDefault && !rate.id.startsWith("tax-tva-20") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleDelete(rate.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Tax Simulator Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Moroccan Tax Impact Simulator (HT &rarr; TVA &rarr; TTC)
              </CardTitle>
              <CardDescription>
                Simulate how subtotal amounts convert to tax and total charges under Moroccan CGI compliance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Base Amount (Montant HT)</label>
                  <Input
                    type="number"
                    value={simAmount}
                    onChange={(e) => setSimAmount(Number(e.target.value))}
                    min={0}
                    step={10}
                    placeholder="Enter amount HT"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Select TVA Rate</label>
                  <select
                    className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                    value={selectedSimRateId}
                    onChange={(e) => setSelectedSimRateId(e.target.value)}
                  >
                    {rates.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.rate}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-muted/40 border grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase">Montant HT</div>
                  <div className="text-lg font-bold font-mono mt-1">${simResult.subtotalHt.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase">TVA ({simResult.taxRate.rate}%)</div>
                  <div className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
                    +${simResult.taxAmount.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase">Total TTC</div>
                  <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    ${simResult.totalTtc.toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Enterprise Fiscal Credentials */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />
                Moroccan Fiscal Identifiers
              </CardTitle>
              <CardDescription>
                Mandatory fiscal credentials required on all Moroccan B2B invoices and official receipts (CGI Article 145).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveFiscal} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Raison Sociale (Company Name)</label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">ICE (Identifiant Commun - 15 chiffres)</label>
                  <Input value={ice} onChange={(e) => setIce(e.target.value)} placeholder="002847192000084" required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">IF (Identifiant Fiscal)</label>
                    <Input value={ifNumber} onChange={(e) => setIfNumber(e.target.value)} placeholder="40182934" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Patente / TP</label>
                    <Input value={patente} onChange={(e) => setPatente(e.target.value)} placeholder="34192084" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Registre de Commerce (RC)</label>
                  <Input value={rcNumber} onChange={(e) => setRcNumber(e.target.value)} placeholder="Casablanca 148291" required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Siège Social (Registered Address)</label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Casablanca Finance City, Maroc" required />
                </div>

                <Button type="submit" className="w-full mt-2">
                  Save Fiscal Identifiers
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Legal Compliance Box */}
          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-muted-foreground space-y-2">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              Conformité Fiscale CGI Maroc
            </div>
            <p>
              Toute facture électronique émise pour un client assujetti au Maroc doit comporter obligatoirement l&apos;ICE du client et du fournisseur, ainsi que la ventilation HT, le taux de TVA applicable et le montant TTC.
            </p>
          </div>
        </div>
      </div>

      {/* Dialog for Add / Edit Tax Rate */}
      <Dialog open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSaveRate}>
            <DialogHeader>
              <DialogTitle>{editingRate ? "Edit Tax Rate" : "Add New Tax Rate"}</DialogTitle>
              <DialogDescription>
                Configure custom tax rates or regional Moroccan VAT sub-categories.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Tax Name</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. TVA Prestations Informatiques"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Tax Code</label>
                  <Input
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. TVA_20"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Rate Percentage (%)</label>
                  <Input
                    type="number"
                    value={formRate}
                    onChange={(e) => setFormRate(e.target.value)}
                    min={0}
                    max={100}
                    step={0.5}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Legal article or applicability note"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="formIsDefault"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="rounded border-gray-300 h-4 w-4 text-primary focus:ring-primary"
                />
                <label htmlFor="formIsDefault" className="text-sm font-medium text-foreground cursor-pointer">
                  Set as default active rate for all Invoices &amp; Receipts
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingRate ? "Update Rate" : "Create Tax Rate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
