import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import UsersPage from "./users-page"
import * as usersApis from "@/lib/api/users-apis"
import { IntlWrapper } from "@/test/intl"
import { User, UserStatus, UserType } from "@/types/users"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/en/dashboard/users",
  useSearchParams: () => new URLSearchParams(),
}))

const page = (data: User[]) => ({
  success: true,
  data,
  meta: { total: data.length, page: 0, pageSize: 20, totalPages: 1 },
})

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <IntlWrapper>
        <UsersPage />
      </IntlWrapper>
    </QueryClientProvider>
  )
}

describe("UsersPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("renders users returned by the API", async () => {
    vi.spyOn(usersApis, "fetchUsersApi").mockResolvedValue(
      page([
        {
          id: "u1",
          name: "Ada Lovelace",
          email: "ada@nexora.io",
          role: "admin",
          userType: UserType.ADMIN,
          status: UserStatus.ACTIVE,
        } as User,
      ]) as never
    )

    renderPage()

    expect((await screen.findAllByText("ada@nexora.io")).length).toBeGreaterThan(0)
    expect(screen.queryByText(/no results/i)).not.toBeInTheDocument()
  })

  it("shows an empty state for an empty list", async () => {
    vi.spyOn(usersApis, "fetchUsersApi").mockResolvedValue(page([]) as never)

    renderPage()

    expect(await screen.findByText(/no results/i)).toBeInTheDocument()
  })
})
