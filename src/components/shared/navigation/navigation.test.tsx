import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { IntlWrapper } from "@/test/intl"
import messages from "@/messages/en.json"
import { AdminPermissionsPlatform } from "@/types/roles"
import { UserType, type User } from "@/types/users"
import { useDashboardNav } from "./use-dashboard-nav"
import { PageHeader } from "../page-header"

let mockPathname = "/dashboard/invoices"
let mockUser: Partial<User> = { id: "u1", role: "admin" }

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => mockPathname,
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}))
vi.mock("@/hooks/auth/use-auth-guard", () => ({
  useAuthGuard: () => ({ authedUser: mockUser }),
}))

function NavProbe() {
  const { groups, activeGroup, activeItem } = useDashboardNav()
  return (
    <div>
      <p data-testid="groups">{groups.map((g) => g.id).join(",")}</p>
      <p data-testid="active-group">{activeGroup?.id}</p>
      <p data-testid="active-item">{activeItem?.url}</p>
    </div>
  )
}

const renderIntl = (ui: React.ReactElement) => render(<IntlWrapper>{ui}</IntlWrapper>)

describe("useDashboardNav", () => {
  beforeEach(() => {
    mockPathname = "/dashboard/invoices"
    mockUser = { id: "u1", role: "admin" }
  })

  it("shows every section to an admin and resolves the active page", () => {
    renderIntl(<NavProbe />)
    expect(screen.getByTestId("groups").textContent).toBe(
      "dashboard,organization,finance,planning,users,billing,management,support,system"
    )
    expect(screen.getByTestId("active-group").textContent).toBe("billing")
    expect(screen.getByTestId("active-item").textContent).toBe("/dashboard/invoices")
  })

  it("matches nested routes to their page", () => {
    mockPathname = "/dashboard/projects/proj-42"
    renderIntl(<NavProbe />)
    expect(screen.getByTestId("active-item").textContent).toBe("/dashboard/projects")
  })

  it("hides sections the user has no permission for", () => {
    mockUser = {
      id: "u2",
      role: "user",
      userType: UserType.USER,
      permissions: [AdminPermissionsPlatform.USERS_READ, AdminPermissionsPlatform.INVOICES_READ],
    }
    renderIntl(<NavProbe />)
    // Invoice readers also see client invoices under Finance
    expect(screen.getByTestId("groups").textContent).toBe("finance,users,billing")
  })
})

describe("PageHeader", () => {
  beforeEach(() => {
    mockPathname = "/dashboard/invoices"
    mockUser = { id: "u1", role: "admin" }
  })

  it("defaults to the current page's breadcrumb, title and description", () => {
    renderIntl(<PageHeader />)
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(messages.invoices)
    expect(screen.getByText(messages.pageDescInvoices)).toBeInTheDocument()
    const crumb = screen.getByRole("navigation", { name: "Breadcrumb" })
    expect(crumb.textContent).toContain(messages.billing)
  })

  it("lets pages override the title and add actions", () => {
    renderIntl(<PageHeader title="Custom title" actions={<button type="button">Do it</button>} />)
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Custom title")
    expect(screen.getByRole("button", { name: "Do it" })).toBeInTheDocument()
  })
})
