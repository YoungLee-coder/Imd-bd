const base = process.env.API_BASE ?? "http://127.0.0.1:8787"

async function req(path, options = {}) {
  const response = await fetch(base + path, options)
  const text = await response.text()
  let body = null
  if (text) body = JSON.parse(text)
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} -> ${response.status} ${text}`)
  }
  return body
}

const login = await req("/api/v1/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "Admin@2026" }),
})
if (!login.accessToken || !login.user.permissions.includes("user.manage")) {
  throw new Error("staff login payload mismatch")
}

const auth = { Authorization: `Bearer ${login.accessToken}` }
const me = await req("/api/v1/auth/me", { headers: auth })
if (me.username !== "admin" || me.passwordHash) throw new Error("me leaked or mismatched")

const pending = await req("/api/v1/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "han.yizhou", password: "Officer@2026" }),
}).catch((error) => error)
if (!String(pending.message).includes("403")) throw new Error("pending account should be forbidden")

const users = await req("/api/v1/users?page=1&pageSize=10", { headers: auth })
if (users.total < 6) throw new Error("seeded users missing")

const summary = await req("/api/v1/dashboard/summary", { headers: auth })
if (summary.applicantTotal < 1 || summary.expiringSoon < 1) throw new Error("dashboard empty")

const reports = await req("/api/v1/reports", { headers: auth })
if (reports.applicationTotal < 5) throw new Error("reports missing applications")

const portal = await req("/api/v1/portal/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "priya.mehta@fastmail.in", password: "Applicant@2026" }),
})
const portalAuth = { Authorization: `Bearer ${portal.accessToken}` }
const apps = await req("/api/v1/portal/applications", { headers: portalAuth })
if (apps.length < 2) throw new Error("portal applications missing")

const foreign = await fetch(`${base}/api/v1/portal/applications/ap-003`, { headers: portalAuth })
if (foreign.status !== 404) throw new Error(`cross-account access should be 404, got ${foreign.status}`)

const officer = await req("/api/v1/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "zhou.anlan", password: "Officer@2026" }),
})
const queue = await req("/api/v1/applications?status=submitted&pageSize=20", {
  headers: { Authorization: `Bearer ${officer.accessToken}` },
})
if (!Array.isArray(queue.items)) throw new Error("staff application queue missing")

console.log("smoke ok", {
  users: users.total,
  applicants: summary.applicantTotal,
  expiring: summary.expiringSoon,
  applications: reports.applicationTotal,
  portalApps: apps.length,
})
