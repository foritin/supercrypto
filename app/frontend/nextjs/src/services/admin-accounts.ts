import { ADMIN_PATHS } from '@/constants/api-paths'
import { api } from '@/services/api'

export interface AdminAccount {
  id: number
  address: string
  roles: string[]
  network: string
  is_active?: boolean
  is_blocked?: boolean
  is_deleted?: boolean
  created_at?: string
  updated_at?: string
  last_login_dt?: string | null
}

const PAGE_SIZE = 100

async function listAccountsPage(page: number): Promise<API.ResponseData<AdminAccount>> {
  return api.get<API.ResponseData<AdminAccount>>(
    `${ADMIN_PATHS.ACCOUNTS}?page=${page}&page_size=${PAGE_SIZE}`
  )
}

async function listAllAccounts(): Promise<AdminAccount[]> {
  const all: AdminAccount[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const resp = await listAccountsPage(page)
    all.push(...(resp.list_data || []))
    totalPages = resp.pagination?.total_pages || 1
    page += 1
  }

  return all
}

async function updateAccountRoles(address: string, roles: string[]): Promise<AdminAccount> {
  const resp = await api.put<API.ResponseData<AdminAccount>>(
    ADMIN_PATHS.ACCOUNT_ROLES_UPDATE(address),
    { roles }
  )
  return resp.object_data as AdminAccount
}

export const adminAccountsService = {
  listAllAccounts,
  updateAccountRoles,
}

