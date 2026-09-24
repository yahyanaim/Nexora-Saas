import type { jsPDF } from "jspdf"

export interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number
  }
}
