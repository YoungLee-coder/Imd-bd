import type { PermissionCode, PortalAccount, StaffUser } from "./types"

interface UserRow {
  id: string
  username: string
  password_hash: string
  full_name: string
  employee_id: string
  department: string
  email: string
  phone: string
  status: StaffUser["status"]
  last_login_at: string | null
  created_at: string
}

interface RoleRow {
  id: string
  code: string
  name: string
  permissions: string
}

export async function loadStaff(db: D1Database, id: string): Promise<(StaffUser & { passwordHash: string }) | null> {
  const user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>()
  if (!user) return null
  const roles = await db
    .prepare(
      `SELECT r.id, r.code, r.name, r.permissions
       FROM roles r JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
    )
    .bind(id)
    .all<RoleRow>()
  const permissions = new Set<PermissionCode>()
  for (const role of roles.results) {
    for (const code of JSON.parse(role.permissions) as PermissionCode[]) permissions.add(code)
  }
  return {
    id: user.id,
    username: user.username,
    passwordHash: user.password_hash,
    fullName: user.full_name,
    employeeId: user.employee_id,
    department: user.department,
    email: user.email,
    phone: user.phone,
    status: user.status,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
    roles: roles.results.map(({ id: roleId, code, name }) => ({ id: roleId, code, name })),
    permissions: [...permissions],
  }
}

export async function findStaffByUsername(db: D1Database, username: string) {
  const row = await db
    .prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE")
    .bind(username.trim())
    .first<{ id: string }>()
  return row ? loadStaff(db, row.id) : null
}

export function publicStaff(user: StaffUser & { passwordHash?: string }) {
  const { permissions: _permissions, passwordHash: _passwordHash, ...rest } = user
  return rest
}

interface AccountRow {
  id: string
  email: string
  password_hash: string
  full_name: string
  phone: string
  status: PortalAccount["status"]
  last_login_at: string | null
  created_at: string
}

export async function loadPortal(db: D1Database, id: string): Promise<(PortalAccount & { passwordHash: string }) | null> {
  const row = await db.prepare("SELECT * FROM applicant_accounts WHERE id = ?").bind(id).first<AccountRow>()
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    phone: row.phone,
    status: row.status,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  }
}

export function publicPortal(account: PortalAccount) {
  return account
}

export async function nextCounter(db: D1Database, name: string, step = 1) {
  const row = await db.prepare("SELECT value FROM counters WHERE name = ?").bind(name).first<{ value: number }>()
  const value = (row?.value ?? 0) + step
  await db.prepare("UPDATE counters SET value = ? WHERE name = ?").bind(value, name).run()
  return value
}
