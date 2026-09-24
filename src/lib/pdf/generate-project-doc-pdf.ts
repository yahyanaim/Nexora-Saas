import { Project } from "@/types/projects"
import type { JsPDFWithAutoTable } from "@/types/pdf"

/**
 * Loads the Nexora app logo as an HTMLImageElement for canvas / jsPDF embedding.
 */
async function loadLogoImage(): Promise<HTMLImageElement | null> {
  if (typeof window === "undefined") return null
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = "/app-logo.png"
  })
}

/**
 * Generates an executive project specification and status report PDF.
 */
export async function generateProjectDocPdf(project: Project): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const brandBlue = [15, 98, 254] as [number, number, number]
  const darkNavy = [15, 23, 42] as [number, number, number]
  const slateMuted = [100, 116, 139] as [number, number, number]
  const cardFill = [248, 250, 252] as [number, number, number]
  const cardBorder = [226, 232, 240] as [number, number, number]
  const emeraldGreen = [22, 163, 74] as [number, number, number]

  const leftMargin = 16
  const rightMargin = 16
  const contentWidth = pageWidth - leftMargin - rightMargin

  // Top Accent Bar
  doc.setFillColor(brandBlue[0], brandBlue[1], brandBlue[2])
  doc.rect(0, 0, pageWidth, 4, "F")

  let currentY = 18

  // Logo & Title
  const logo = await loadLogoImage()
  if (logo) {
    try {
      doc.addImage(logo, "PNG", leftMargin, currentY - 5, 12, 12)
    } catch {
      doc.setFillColor(brandBlue[0], brandBlue[1], brandBlue[2])
      doc.roundedRect(leftMargin, currentY - 5, 11, 11, 2, 2, "F")
    }
  } else {
    doc.setFillColor(brandBlue[0], brandBlue[1], brandBlue[2])
    doc.roundedRect(leftMargin, currentY - 5, 11, 11, 2, 2, "F")
  }

  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text("Nexora", leftMargin + 16, currentY + 1)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text("Enterprise Workspace & Engineering Lifecycle", leftMargin + 16, currentY + 5.5)

  // Document Heading Right
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text("PROJECT BRIEF", pageWidth - rightMargin, currentY, { align: "right" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text(`ID: ${project.id.toUpperCase()}`, pageWidth - rightMargin, currentY + 5, { align: "right" })

  currentY += 18

  // Divider
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.setLineWidth(0.4)
  doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY)

  currentY += 8

  // Project Header Banner
  doc.setFillColor(cardFill[0], cardFill[1], cardFill[2])
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.roundedRect(leftMargin, currentY, contentWidth, 26, 2.5, 2.5, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text(project.name, leftMargin + 8, currentY + 9)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text(project.description || "Enterprise workspace project specification and milestones.", leftMargin + 8, currentY + 15, {
    maxWidth: contentWidth - 70,
  })

  // Status & Progress Badge Right
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2])
  doc.text(`Progress: ${project.progress}%`, pageWidth - rightMargin - 8, currentY + 10, { align: "right" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text(`Status: ${project.status.toUpperCase()}`, pageWidth - rightMargin - 8, currentY + 17, { align: "right" })

  currentY += 32

  // Metadata Grid: Two Columns
  const cardW = (contentWidth - 8) / 2
  const cardH = 32

  // Left Card: Dates & Lead
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.roundedRect(leftMargin, currentY, cardW, cardH, 2, 2, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2])
  doc.text("TIMELINE & OWNERSHIP", leftMargin + 6, currentY + 6.5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text("Lead Owner:", leftMargin + 6, currentY + 13)
  doc.text("Start Date:", leftMargin + 6, currentY + 18.5)
  doc.text("Target Date:", leftMargin + 6, currentY + 24)

  doc.setFont("helvetica", "bold")
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text(project.owner?.name || "Alex Morgan", leftMargin + 28, currentY + 13)
  doc.text(new Date(project.startDate).toLocaleDateString(), leftMargin + 28, currentY + 18.5)
  doc.text(project.endDate ? new Date(project.endDate).toLocaleDateString() : "Rolling Milestone", leftMargin + 28, currentY + 24)

  // Right Card: Scope & Team
  const rightColX = leftMargin + cardW + 8
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(rightColX, currentY, cardW, cardH, 2, 2, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2])
  doc.text("SCOPE & RESOURCES", rightColX + 6, currentY + 6.5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text("Team Members:", rightColX + 6, currentY + 13)
  doc.text("Total Tasks:", rightColX + 6, currentY + 18.5)
  doc.text("Linked Files:", rightColX + 6, currentY + 24)

  doc.setFont("helvetica", "bold")
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text(`${project.members.length} contributors`, rightColX + 30, currentY + 13)
  doc.text(`${project.tasks.length} tasks recorded`, rightColX + 30, currentY + 18.5)
  doc.text(`${project.files.length} attached assets`, rightColX + 30, currentY + 24)

  currentY += cardH + 8

  // Tasks Breakdown Table
  const taskRows = (project.tasks && project.tasks.length > 0 ? project.tasks : []).map((t, i) => [
    String(i + 1),
    t.title,
    t.status.toUpperCase().replace("_", " "),
    t.assignee?.name || "Unassigned",
    t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "Flexible",
  ])

  if (taskRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: leftMargin, right: rightMargin },
      theme: "grid",
      head: [["#", "TASK SPECIFICATION / DELIVERABLE", "STATUS", "ASSIGNEE", "TARGET DATE"]],
      body: taskRows,
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontStyle: "bold",
        fontSize: 8,
        halign: "left",
        cellPadding: 3.5,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [15, 23, 42],
        cellPadding: 3.5,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: contentWidth * 0.45 },
        2: { cellWidth: contentWidth * 0.18, halign: "center" },
        3: { cellWidth: contentWidth * 0.18 },
        4: { cellWidth: contentWidth * 0.12, halign: "right" },
      },
      styles: {
        lineColor: [226, 232, 240],
        lineWidth: 0.3,
      },
    })
    const docWithTable = doc as unknown as JsPDFWithAutoTable
    currentY = (docWithTable.lastAutoTable?.finalY ?? currentY) + 8
  }

  // Attached Team Members Section
  if (project.members && project.members.length > 0 && currentY < pageHeight - 40) {
    const memberRows = project.members.map((m) => [
      m.user.name,
      m.user.email,
      m.role.toUpperCase(),
      new Date(project.startDate).toLocaleDateString(),
    ])

    autoTable(doc, {
      startY: currentY,
      margin: { left: leftMargin, right: rightMargin },
      theme: "grid",
      head: [["TEAM MEMBER", "EMAIL ADDRESS", "PROJECT ROLE", "ASSIGNED DATE"]],
      body: memberRows,
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontStyle: "bold",
        fontSize: 8,
        halign: "left",
        cellPadding: 3.5,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [15, 23, 42],
        cellPadding: 3.5,
      },
      styles: {
        lineColor: [226, 232, 240],
        lineWidth: 0.3,
      },
    })
    const docWithTable = doc as unknown as JsPDFWithAutoTable
    currentY = (docWithTable.lastAutoTable?.finalY ?? currentY) + 8
  }

  // Footer
  const footerY = pageHeight - 10
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.setLineWidth(0.3)
  doc.line(leftMargin, footerY - 4, pageWidth - rightMargin, footerY - 4)

  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text("Nexora SaaS Workspace · Official Project Document & Specification", leftMargin, footerY)
  doc.text("Page 1 of 1", pageWidth - rightMargin, footerY, { align: "right" })

  doc.save(`${project.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-specification.pdf`)
}
