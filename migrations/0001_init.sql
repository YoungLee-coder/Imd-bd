CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  permissions TEXT NOT NULL,
  built_in INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  employee_id TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL,
  last_login_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE applicants (
  id TEXT PRIMARY KEY,
  file_no TEXT NOT NULL UNIQUE,
  surname TEXT NOT NULL,
  given_names TEXT NOT NULL,
  native_name TEXT NOT NULL DEFAULT '',
  sex TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  place_of_birth TEXT NOT NULL,
  nationality TEXT NOT NULL,
  marital_status TEXT NOT NULL,
  occupation TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  remarks TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  number TEXT NOT NULL,
  issuing_country TEXT NOT NULL,
  issuing_authority TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  expiry_date TEXT,
  verification TEXT NOT NULL,
  verification_note TEXT NOT NULL DEFAULT '',
  verified_by TEXT,
  verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_documents_applicant ON documents(applicant_id);

CREATE TABLE applicant_accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL,
  last_login_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  application_no TEXT UNIQUE,
  account_id TEXT NOT NULL REFERENCES applicant_accounts(id),
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT '',
  intended_arrival_date TEXT NOT NULL DEFAULT '',
  intended_stay_days INTEGER NOT NULL DEFAULT 30,
  surname TEXT NOT NULL DEFAULT '',
  given_names TEXT NOT NULL DEFAULT '',
  native_name TEXT NOT NULL DEFAULT '',
  sex TEXT NOT NULL DEFAULT 'X',
  date_of_birth TEXT NOT NULL DEFAULT '',
  place_of_birth TEXT NOT NULL DEFAULT '',
  nationality TEXT NOT NULL DEFAULT '',
  marital_status TEXT NOT NULL DEFAULT 'single',
  occupation TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  passport_number TEXT NOT NULL DEFAULT '',
  passport_issuing_country TEXT NOT NULL DEFAULT '',
  passport_issuing_authority TEXT NOT NULL DEFAULT '',
  passport_issue_date TEXT NOT NULL DEFAULT '',
  passport_expiry_date TEXT NOT NULL DEFAULT '',
  review_note TEXT NOT NULL DEFAULT '',
  file_no TEXT,
  submitted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_applications_account ON applications(account_id);

CREATE TABLE application_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT NOT NULL,
  actor TEXT,
  at TEXT NOT NULL
);

CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  r2_key TEXT,
  uploaded_at TEXT NOT NULL
);

CREATE INDEX idx_attachments_owner ON attachments(owner_type, owner_id);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  recipient_type TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_type, recipient_id, created_at);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_audit_created ON audit_logs(created_at);

CREATE TABLE counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
