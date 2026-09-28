import type { Context, MiddlewareHandler } from "hono"

import { bearer, readToken } from "./crypto"
import { forbidden, unauthenticated } from "./http"
import { loadPortal, loadStaff } from "./session"
import type { AppEnv, PermissionCode } from "./types"

export const requireStaff: MiddlewareHandler<AppEnv> = async (c, next) => {
  const payload = await readToken(c.env.JWT_SECRET, bearer(c.req.header("Authorization")))
  if (!payload || payload.realm !== "staff") unauthenticated()
  const user = await loadStaff(c.env.DB, payload.sub)
  if (!user || user.status !== "active") unauthenticated()
  const { passwordHash: _passwordHash, ...staff } = user
  c.set("staff", staff)
  await next()
}

export function permit(...codes: PermissionCode[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const granted = c.get("staff").permissions
    if (codes.length && !codes.some((code) => granted.includes(code))) forbidden()
    await next()
  }
}

export const requirePortal: MiddlewareHandler<AppEnv> = async (c, next) => {
  const payload = await readToken(c.env.JWT_SECRET, bearer(c.req.header("Authorization")))
  if (!payload || payload.realm !== "portal") unauthenticated()
  const account = await loadPortal(c.env.DB, payload.sub)
  if (!account) unauthenticated()
  if (account.status === "disabled") forbidden("账号已停用，请联系受理机关。")
  const { passwordHash: _passwordHash, ...portal } = account
  c.set("portal", portal)
  await next()
}

export function staffOf(c: Context<AppEnv>) {
  return c.get("staff")
}

export function portalOf(c: Context<AppEnv>) {
  return c.get("portal")
}
