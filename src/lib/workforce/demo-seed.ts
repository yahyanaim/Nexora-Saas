import {
  ClientStatus,
  EmployeeStatus,
  EmploymentType,
  WorkRole,
  type Client,
  type Department,
  type Employee,
  type Workspace,
} from "@/types/workforce"

/** Sample companies offered by the workspace switcher in demo mode. */
export const DEMO_WORKSPACES: Workspace[] = [
  { id: "ws_atlas", name: "Atlas Consulting", currency: "EUR" },
  { id: "ws_northwind", name: "Northwind Studio", currency: "USD" },
]

const DEPARTMENTS: Record<string, Department[]> = {
  ws_atlas: [
    { id: "dep_mgmt", name: "Management" },
    { id: "dep_eng", name: "Engineering" },
    { id: "dep_design", name: "Design" },
    { id: "dep_fin", name: "Finance" },
    { id: "dep_sales", name: "Sales" },
  ],
  ws_northwind: [
    { id: "dep_mgmt", name: "Management" },
    { id: "dep_creative", name: "Creative" },
    { id: "dep_prod", name: "Production" },
  ],
}

export function seedDepartments(workspaceId: string): Department[] {
  return DEPARTMENTS[workspaceId] ?? [{ id: "dep_general", name: "General" }]
}

const STAMP = "2026-01-05T09:00:00.000Z"

type EmployeeSeed = Omit<Employee, "workspaceId" | "createdAt" | "updatedAt">

const ATLAS_EMPLOYEES: EmployeeSeed[] = [
  { id: "emp_sara", name: "Sara Bennani", email: "sara@atlas.example", phone: "+212 600 000 101", jobTitle: "Managing Director", departmentId: "dep_mgmt", role: WorkRole.ADMIN, employmentType: EmploymentType.FULL_TIME, status: EmployeeStatus.ACTIVE, hireDate: "2019-03-01", hourlyCost: 85, billableRate: 180, weeklyCapacity: 40, skills: ["Strategy", "Sales"] },
  { id: "emp_karim", name: "Karim Haddad", email: "karim@atlas.example", jobTitle: "Engineering Manager", departmentId: "dep_eng", managerId: "emp_sara", role: WorkRole.MANAGER, employmentType: EmploymentType.FULL_TIME, status: EmployeeStatus.ACTIVE, hireDate: "2020-06-15", hourlyCost: 70, billableRate: 150, weeklyCapacity: 40, skills: ["Architecture", "Node.js", "Leadership"] },
  { id: "emp_lina", name: "Lina Moreau", email: "lina@atlas.example", jobTitle: "Senior Developer", departmentId: "dep_eng", managerId: "emp_karim", role: WorkRole.EMPLOYEE, employmentType: EmploymentType.FULL_TIME, status: EmployeeStatus.ACTIVE, hireDate: "2021-02-01", hourlyCost: 55, billableRate: 120, weeklyCapacity: 40, skills: ["React", "TypeScript"], rateHistory: [{ effectiveFrom: "2021-02-01", hourlyCost: 45, billableRate: 100 }, { effectiveFrom: "2025-01-01", hourlyCost: 50, billableRate: 110, reason: "Promotion to senior" }, { effectiveFrom: "2026-01-01", hourlyCost: 55, billableRate: 120, reason: "Yearly review" }] },
  { id: "emp_omar", name: "Omar Idrissi", email: "omar@atlas.example", jobTitle: "Backend Developer", departmentId: "dep_eng", managerId: "emp_karim", role: WorkRole.EMPLOYEE, employmentType: EmploymentType.FULL_TIME, status: EmployeeStatus.ON_LEAVE, hireDate: "2022-09-12", hourlyCost: 45, billableRate: 100, weeklyCapacity: 40, skills: ["PostgreSQL", "Go"] },
  { id: "emp_julia", name: "Julia Schmidt", email: "julia@atlas.example", jobTitle: "Product Designer", departmentId: "dep_design", managerId: "emp_sara", role: WorkRole.EMPLOYEE, employmentType: EmploymentType.FULL_TIME, status: EmployeeStatus.ACTIVE, hireDate: "2021-11-08", hourlyCost: 50, billableRate: 110, weeklyCapacity: 40, skills: ["Figma", "UX research"] },
  { id: "emp_yassine", name: "Yassine Alaoui", email: "yassine@atlas.example", jobTitle: "Accountant", departmentId: "dep_fin", managerId: "emp_sara", role: WorkRole.ACCOUNTANT, employmentType: EmploymentType.FULL_TIME, status: EmployeeStatus.ACTIVE, hireDate: "2020-01-20", hourlyCost: 40, billableRate: 0, weeklyCapacity: 40, skills: ["Invoicing", "Tax"] },
  { id: "emp_emma", name: "Emma Rossi", email: "emma@atlas.example", jobTitle: "Account Executive", departmentId: "dep_sales", managerId: "emp_sara", role: WorkRole.MANAGER, employmentType: EmploymentType.FULL_TIME, status: EmployeeStatus.ACTIVE, hireDate: "2023-04-03", hourlyCost: 45, billableRate: 0, weeklyCapacity: 40, skills: ["Negotiation", "CRM"] },
  { id: "emp_noah", name: "Noah Kim", email: "noah@atlas.example", jobTitle: "Frontend Developer", departmentId: "dep_eng", managerId: "emp_karim", role: WorkRole.EMPLOYEE, employmentType: EmploymentType.CONTRACTOR, status: EmployeeStatus.ACTIVE, hireDate: "2025-07-01", hourlyCost: 60, billableRate: 115, weeklyCapacity: 30, skills: ["Vue", "CSS"] },
  { id: "emp_amina", name: "Amina Tazi", email: "amina@atlas.example", jobTitle: "UI Designer", departmentId: "dep_design", managerId: "emp_julia", role: WorkRole.EMPLOYEE, employmentType: EmploymentType.PART_TIME, status: EmployeeStatus.ACTIVE, hireDate: "2024-10-14", hourlyCost: 35, billableRate: 90, weeklyCapacity: 20, workingDays: [1, 2, 3], skills: ["Illustration", "Figma"] },
  { id: "emp_leo", name: "Leo Martin", email: "leo@atlas.example", jobTitle: "Developer Intern", departmentId: "dep_eng", managerId: "emp_lina", role: WorkRole.EMPLOYEE, employmentType: EmploymentType.INTERN, status: EmployeeStatus.INACTIVE, hireDate: "2026-02-02", hourlyCost: 15, billableRate: 50, weeklyCapacity: 35, skills: ["JavaScript"] },
]

const NORTHWIND_EMPLOYEES: EmployeeSeed[] = [
  { id: "emp_ava", name: "Ava Johnson", email: "ava@northwind.example", jobTitle: "Studio Director", departmentId: "dep_mgmt", role: WorkRole.ADMIN, employmentType: EmploymentType.FULL_TIME, status: EmployeeStatus.ACTIVE, hireDate: "2018-05-01", hourlyCost: 90, billableRate: 200, weeklyCapacity: 40, skills: ["Direction", "Branding"] },
  { id: "emp_mateo", name: "Mateo Garcia", email: "mateo@northwind.example", jobTitle: "Art Director", departmentId: "dep_creative", managerId: "emp_ava", role: WorkRole.MANAGER, employmentType: EmploymentType.FULL_TIME, status: EmployeeStatus.ACTIVE, hireDate: "2020-08-17", hourlyCost: 65, billableRate: 140, weeklyCapacity: 40, skills: ["Art direction", "Motion"] },
  { id: "emp_chloe", name: "Chloe Dubois", email: "chloe@northwind.example", jobTitle: "Video Producer", departmentId: "dep_prod", managerId: "emp_mateo", role: WorkRole.EMPLOYEE, employmentType: EmploymentType.FULL_TIME, status: EmployeeStatus.ACTIVE, hireDate: "2022-03-28", hourlyCost: 48, billableRate: 105, weeklyCapacity: 40, skills: ["Editing", "After Effects"] },
  { id: "emp_ethan", name: "Ethan Brown", email: "ethan@northwind.example", jobTitle: "Bookkeeper", departmentId: "dep_mgmt", managerId: "emp_ava", role: WorkRole.ACCOUNTANT, employmentType: EmploymentType.PART_TIME, status: EmployeeStatus.ACTIVE, hireDate: "2023-01-09", hourlyCost: 35, billableRate: 0, weeklyCapacity: 20, skills: ["Bookkeeping"] },
]

export function seedEmployees(workspaceId: string): Employee[] {
  const rows = workspaceId === "ws_northwind" ? NORTHWIND_EMPLOYEES : workspaceId === "ws_atlas" ? ATLAS_EMPLOYEES : []
  return rows.map((row) => ({ ...row, workspaceId, createdAt: STAMP, updatedAt: STAMP }))
}

type ClientSeed = Omit<Client, "workspaceId" | "createdAt" | "updatedAt">

const ATLAS_CLIENTS: ClientSeed[] = [
  { id: "cli_orbit", name: "Orbit Logistics", industry: "Logistics", email: "billing@orbit.example", phone: "+33 1 00 00 00 01", website: "https://orbit.example", address: "12 Rue de la Paix, Paris", taxId: "FR12345678901", status: ClientStatus.ACTIVE, hourlyRate: 130, paymentTermsDays: 30, accountManagerId: "emp_emma", contacts: [{ id: "con_1", name: "Claire Petit", email: "claire@orbit.example", position: "CTO", isPrimary: true }, { id: "con_2", name: "Marc Leroy", email: "marc@orbit.example", position: "Finance lead", isPrimary: false }] },
  { id: "cli_helio", name: "Helio Energy", industry: "Energy", email: "ap@helio.example", website: "https://helio.example", address: "Avenue Hassan II, Casablanca", status: ClientStatus.ACTIVE, paymentTermsDays: 45, accountManagerId: "emp_sara", contacts: [{ id: "con_3", name: "Rachid Amrani", email: "rachid@helio.example", position: "Head of IT", isPrimary: true }] },
  { id: "cli_medica", name: "Medica Health", industry: "Healthcare", email: "finance@medica.example", status: ClientStatus.ACTIVE, hourlyRate: 140, rateCard: [{ id: "rc_1", employeeId: "emp_julia", rate: 150 }, { id: "rc_2", jobTitle: "UI Designer", rate: 120 }], paymentTermsDays: 30, accountManagerId: "emp_emma", contacts: [{ id: "con_4", name: "Sofia Conti", email: "sofia@medica.example", position: "Product owner", isPrimary: true }] },
  { id: "cli_vela", name: "Vela Retail", industry: "Retail", email: "hello@vela.example", status: ClientStatus.LEAD, paymentTermsDays: 30, accountManagerId: "emp_emma", contacts: [{ id: "con_5", name: "Tom Becker", email: "tom@vela.example", position: "CEO", isPrimary: true }], notes: "Interested in an e-commerce rebuild for Q1." },
  { id: "cli_kappa", name: "Kappa Bank", industry: "Finance", email: "vendors@kappa.example", status: ClientStatus.ARCHIVED, paymentTermsDays: 60, contacts: [] },
]

const NORTHWIND_CLIENTS: ClientSeed[] = [
  { id: "cli_lumen", name: "Lumen Coffee", industry: "Food & beverage", email: "marketing@lumen.example", status: ClientStatus.ACTIVE, hourlyRate: 150, paymentTermsDays: 15, accountManagerId: "emp_mateo", contacts: [{ id: "con_6", name: "Grace Lee", email: "grace@lumen.example", position: "Brand manager", isPrimary: true }] },
  { id: "cli_peak", name: "Peak Outdoors", industry: "Retail", email: "ap@peak.example", status: ClientStatus.LEAD, paymentTermsDays: 30, contacts: [] },
]

export function seedClients(workspaceId: string): Client[] {
  const rows = workspaceId === "ws_northwind" ? NORTHWIND_CLIENTS : workspaceId === "ws_atlas" ? ATLAS_CLIENTS : []
  return rows.map((row) => ({ ...row, workspaceId, createdAt: STAMP, updatedAt: STAMP }))
}
