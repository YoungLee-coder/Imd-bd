import { Hono } from "hono"
import { cors } from "hono/cors"

import { onError } from "./http"
import { api } from "./routes"
import { ensureSeeded } from "./seed"
import type { AppEnv } from "./types"

const app = new Hono<AppEnv>()

app.onError(onError)

app.use(
  "*",
  cors({
    origin: (origin) => origin || "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type", "Accept"],
    credentials: true,
    maxAge: 86400,
  }),
)

app.use("*", async (c, next) => {
  await ensureSeeded(c.env.DB)
  await next()
})

app.get("/", (c) =>
  c.json({
    name: "IMS API",
    version: "0.1.0",
    base: "/api/v1",
  }),
)

app.route("/api/v1", api)

export default app
