const MAX_BYTES = 10 * 1024 * 1024
const MAX_COUNT = 10
const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png"])

export function fileUrl(origin: string, attachment: { id: string; r2_key: string | null }) {
  return attachment.r2_key ? `${origin}/api/v1/files/${attachment.id}` : "#"
}

export async function listAttachments(db: D1Database, ownerType: string, ownerId: string, origin: string) {
  const rows = await db
    .prepare(
      `SELECT id, file_name, mime_type, size, r2_key, uploaded_at
       FROM attachments WHERE owner_type = ? AND owner_id = ? ORDER BY uploaded_at`,
    )
    .bind(ownerType, ownerId)
    .all<{ id: string; file_name: string; mime_type: string; size: number; r2_key: string | null; uploaded_at: string }>()
  return rows.results.map((row) => ({
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    size: row.size,
    url: fileUrl(origin, row),
    uploadedAt: row.uploaded_at,
  }))
}

export async function storeFiles(
  db: D1Database,
  bucket: R2Bucket,
  ownerType: string,
  ownerId: string,
  files: File[],
  origin: string,
) {
  const existing = await db
    .prepare("SELECT COUNT(*) AS n FROM attachments WHERE owner_type = ? AND owner_id = ?")
    .bind(ownerType, ownerId)
    .first<{ n: number }>()
  if ((existing?.n ?? 0) + files.length > MAX_COUNT) {
    const { fail } = await import("./http")
    fail(400, "VALIDATION_FAILED", `最多上传 ${MAX_COUNT} 个文件。`, { files: `最多 ${MAX_COUNT} 个文件` })
  }
  const { id, nowIso } = await import("./crypto")
  const added = []
  for (const file of files) {
    const mime = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "")
    if (!ALLOWED.has(mime)) {
      const { fail } = await import("./http")
      fail(400, "VALIDATION_FAILED", "仅支持 PDF、JPG、PNG。", { files: "仅支持 PDF、JPG、PNG" })
    }
    if (file.size > MAX_BYTES) {
      const { fail } = await import("./http")
      fail(400, "VALIDATION_FAILED", "单个文件不能超过 10 MB。", { files: "单个文件不能超过 10 MB" })
    }
    const attachmentId = id("f")
    const key = `${ownerType}/${ownerId}/${attachmentId}`
    await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: mime } })
    const uploadedAt = nowIso()
    await db
      .prepare(
        `INSERT INTO attachments (id, owner_type, owner_id, file_name, mime_type, size, r2_key, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(attachmentId, ownerType, ownerId, file.name, mime, file.size, key, uploadedAt)
      .run()
    added.push({ id: attachmentId, fileName: file.name, mimeType: mime, size: file.size, url: `${origin}/api/v1/files/${attachmentId}`, uploadedAt })
  }
  return added
}

interface AppRow {
  id: string
  application_no: string | null
  account_id: string
  type: string
  status: string
  purpose: string
  intended_arrival_date: string
  intended_stay_days: number
  surname: string
  given_names: string
  native_name: string
  sex: string
  date_of_birth: string
  place_of_birth: string
  nationality: string
  marital_status: string
  occupation: string
  address: string
  phone: string
  email: string
  passport_number: string
  passport_issuing_country: string
  passport_issuing_authority: string
  passport_issue_date: string
  passport_expiry_date: string
  review_note: string
  file_no: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export async function readApplication(db: D1Database, row: AppRow, origin: string) {
  const timeline = await db
    .prepare("SELECT status, note, actor, at FROM application_timeline WHERE application_id = ? ORDER BY id")
    .bind(row.id)
    .all<{ status: string; note: string; actor: string | null; at: string }>()
  return {
    id: row.id,
    applicationNo: row.application_no,
    accountId: row.account_id,
    type: row.type,
    status: row.status,
    purpose: row.purpose,
    intendedArrivalDate: row.intended_arrival_date,
    intendedStayDays: row.intended_stay_days,
    surname: row.surname,
    givenNames: row.given_names,
    nativeName: row.native_name,
    sex: row.sex,
    dateOfBirth: row.date_of_birth,
    placeOfBirth: row.place_of_birth,
    nationality: row.nationality,
    maritalStatus: row.marital_status,
    occupation: row.occupation,
    address: row.address,
    phone: row.phone,
    email: row.email,
    passportNumber: row.passport_number,
    passportIssuingCountry: row.passport_issuing_country,
    passportIssuingAuthority: row.passport_issuing_authority,
    passportIssueDate: row.passport_issue_date,
    passportExpiryDate: row.passport_expiry_date,
    attachments: await listAttachments(db, "application", row.id, origin),
    reviewNote: row.review_note,
    fileNo: row.file_no,
    timeline: timeline.results.map((t) => ({ status: t.status, note: t.note, actor: t.actor, at: t.at })),
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getApplication(db: D1Database, id: string, origin: string) {
  const row = await db.prepare("SELECT * FROM applications WHERE id = ?").bind(id).first<AppRow>()
  return row ? readApplication(db, row, origin) : null
}

const DRAFT_COLUMNS: Record<string, string> = {
  type: "type",
  purpose: "purpose",
  intendedArrivalDate: "intended_arrival_date",
  intendedStayDays: "intended_stay_days",
  surname: "surname",
  givenNames: "given_names",
  nativeName: "native_name",
  sex: "sex",
  dateOfBirth: "date_of_birth",
  placeOfBirth: "place_of_birth",
  nationality: "nationality",
  maritalStatus: "marital_status",
  occupation: "occupation",
  address: "address",
  phone: "phone",
  email: "email",
  passportNumber: "passport_number",
  passportIssuingCountry: "passport_issuing_country",
  passportIssuingAuthority: "passport_issuing_authority",
  passportIssueDate: "passport_issue_date",
  passportExpiryDate: "passport_expiry_date",
}

export function draftAssignments(body: Record<string, unknown>) {
  const sets: string[] = []
  const values: unknown[] = []
  for (const [key, column] of Object.entries(DRAFT_COLUMNS)) {
    if (body[key] !== undefined && body[key] !== null) {
      sets.push(`${column} = ?`)
      values.push(body[key])
    }
  }
  return { sets, values }
}
