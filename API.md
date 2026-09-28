# IMS API 文檔

基礎路徑：`/api/v1`  
本地：`http://127.0.0.1:8787/api/v1`

工作人員和申請人門戶是兩套帳號、兩套 JWT，不能混用。除登入、註冊、登出和檔案下載外，請求都要帶：

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

上傳檔案用 `multipart/form-data`，欄位名是 `files`，可一次傳多個。僅接受 PDF、JPG、PNG，單檔不超過 10 MB，同一份證件或申請最多 10 個。

## 通用約定

成功時直接回傳資源 JSON。刪除和登出回傳 `204`，沒有內容。

分頁查詢用 `page`（預設 1）和 `pageSize`（預設 10，最大 100）：

```json
{ "items": [], "total": 0, "page": 1, "pageSize": 10 }
```

錯誤：

```json
{ "code": "VALIDATION_FAILED", "message": "說明", "fieldErrors": { "email": "該郵箱已註冊" } }
```

`fieldErrors` 只在欄位錯誤時出現。常見 `code`：

| HTTP | code | 含義 |
| --- | --- | --- |
| 400 | `VALIDATION_FAILED` | 資料不完整或格式不對 |
| 400 | `SELF_LOCKOUT` | 不能停用目前登入的帳號 |
| 400 | `BUILT_IN_ROLE` | 內建角色不能改、不能刪 |
| 401 | `UNAUTHENTICATED` | 沒有令牌、令牌過期，或帳號已不是有效狀態 |
| 401 | `INVALID_CREDENTIALS` | 帳號或密碼錯誤 |
| 403 | `FORBIDDEN` | 已登入但沒有權限，或門戶帳號已停用 |
| 403 | `ACCOUNT_PENDING` | 工作人員帳號還在審核 |
| 403 | `ACCOUNT_DISABLED` | 工作人員帳號已停用 |
| 403 | `ACCOUNT_REJECTED` | 註冊申請被駁回 |
| 404 | `NOT_FOUND` | 資源不存在。讀取別人的門戶申請也回 404 |
| 409 | `CONFLICT` | 與現有資料衝突，或目前狀態不允許這個操作 |

令牌有效期 8 小時，`expiresIn` 是秒數 `28800`。

## 權限

`GET /auth/me` 回傳的 `permissions` 是目前使用者全部角色的權限聯集。下面標「任一」的接口，有其中一個權限即可。

| code | 說明 |
| --- | --- |
| `applicant.read` / `create` / `update` / `delete` | 檔案查看、新建、修改、刪除 |
| `document.read` / `create` / `update` / `delete` / `verify` | 證件查看、登記、修改、刪除、核驗 |
| `user.read` / `user.manage` | 查看帳號 / 建立、審批、停用、分配角色 |
| `role.read` / `role.manage` | 查看角色 / 建立、修改、刪除角色 |

初始管理員：`admin` / `Admin@2026`，角色 `SYS_ADMIN`，擁有全部權限。

---

## 工作人員

### 登入

`POST /auth/login`　無需登入

```json
{ "username": "admin", "password": "Admin@2026" }
```

```json
{
  "accessToken": "<jwt>",
  "expiresIn": 28800,
  "user": {
    "id": "u-001",
    "username": "admin",
    "fullName": "林書遠",
    "employeeId": "E10231",
    "department": "信息技術處",
    "email": "admin@nia.gov.example",
    "phone": "+000 102 0231 01",
    "status": "active",
    "roles": [{ "id": "r-admin", "code": "SYS_ADMIN", "name": "系統管理員" }],
    "permissions": ["applicant.read"],
    "lastLoginAt": "2026-09-28T01:00:00.000Z",
    "createdAt": "2026-09-28T01:00:00.000Z"
  }
}
```

`status` 不是 `active` 時不能登入。

### 註冊工作人員

`POST /auth/register`　無需登入。新帳號狀態是 `pending`，沒有角色，要等管理員審批後才能登入。回傳 `201` 和 `User`（不含 `permissions`）。

```json
{
  "fullName": "陳大文",
  "employeeId": "E20418",
  "department": "簽證審批處",
  "email": "chan@nia.gov.example",
  "phone": "+852 9123 4567",
  "username": "chan.dai",
  "password": "Officer@2026"
}
```

`employeeId` 須為 `E` 加 5 位數字。`username` 為 4–32 位，小寫字母開頭，可含數字、點和底線。密碼至少 10 位。用戶名或工號重複回 `409`。

### 目前使用者與登出

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `GET` | `/auth/me` | 回傳目前使用者，含 `permissions` |
| `POST` | `/auth/logout` | `204`。伺服器不保存會話，客戶端丟掉令牌即可 |

### 使用者

| 方法 | 路徑 | 權限 | 說明 |
| --- | --- | --- | --- |
| `GET` | `/users` | `user.read` 或 `user.manage` | 分頁。可用 `keyword`、`status` |
| `POST` | `/users` | `user.manage` | 直接建立 `active` 帳號，`201` |
| `GET` | `/users/:id` | `user.read` 或 `user.manage` | 單個使用者 |
| `PATCH` | `/users/:id` | `user.manage` | 更新姓名、部門、郵箱、電話、角色 |
| `PUT` | `/users/:id/status` | `user.manage` | 審批、停用或啟用 |

`GET /users` 的 `status`：`pending`、`active`、`disabled`、`rejected`。`keyword` 搜尋姓名、用戶名、工號、郵箱、部門。

`POST /users` 的內容與註冊相同，另外要有 `roleIds`。

`PATCH /users/:id` 的欄位都可省略：`fullName`、`department`、`email`、`phone`、`roleIds`。傳了 `roleIds` 就整組替換。

```json
{ "status": "active", "roleIds": ["r-visa"], "reason": "審批通過" }
```

`status` 只能是 `active`、`disabled`、`rejected`。不能把目前登入帳號改成非 `active`。待審核帳號被設為 `active` 時，會給該使用者一則通知。

### 角色與權限

| 方法 | 路徑 | 權限 | 說明 |
| --- | --- | --- | --- |
| `GET` | `/permissions` | 已登入 | 全部權限碼 |
| `GET` | `/roles` | 已登入 | 角色列表，含 `userCount` |
| `POST` | `/roles` | `role.manage` | 建立角色，`201` |
| `PUT` | `/roles/:id` | `role.manage` | 更新角色 |
| `DELETE` | `/roles/:id` | `role.manage` | `204` |

```json
{
  "code": "CLERK",
  "name": "窗口文員",
  "description": "只負責建檔",
  "permissions": ["applicant.read", "applicant.create"]
}
```

`builtIn: true` 的角色不能修改或刪除。仍有使用者持有的角色不能刪除，回 `409`。角色編碼重複回 `409`，`fieldErrors.code` 會標出。

### 申請人檔案

| 方法 | 路徑 | 權限 | 說明 |
| --- | --- | --- | --- |
| `GET` | `/applicants` | `applicant.read` | 分頁。`keyword`、`status`、`nationality` |
| `POST` | `/applicants` | `applicant.create` | 建立檔案，系統生成 `fileNo`，`201` |
| `GET` | `/applicants/:id` | `applicant.read` | 檔案詳情 |
| `PUT` | `/applicants/:id` | `applicant.update` | 整份更新 |
| `DELETE` | `/applicants/:id` | `applicant.delete` | 刪除檔案及其證件和附件，`204` |

`keyword` 比對檔案編號、姓名、原文姓名，以及該檔案下的證件號碼。`status`：`active`、`under_review`、`archived`。

```json
{
  "surname": "CHAN",
  "givenNames": "TAI MAN",
  "nativeName": "陳大文",
  "sex": "M",
  "dateOfBirth": "1990-01-01",
  "placeOfBirth": "Hong Kong",
  "nationality": "CHN",
  "maritalStatus": "single",
  "occupation": "工程師",
  "phone": "+852 9123 4567",
  "email": "tai@example.com",
  "address": "九龍",
  "remarks": "",
  "status": "active"
}
```

`sex`：`M`、`F`、`X`。`maritalStatus`：`single`、`married`、`divorced`、`widowed`。`nationality` 用 ICAO 三位國家代碼。

回傳會多出 `id`、`fileNo`（`A-年份-六位序號`）、`documentCount`、`attentionCount`（180 天內到期或已過期的證件數）、`createdAt`、`updatedAt`。

### 證件

| 方法 | 路徑 | 權限 | 說明 |
| --- | --- | --- | --- |
| `GET` | `/applicants/:id/documents` | `document.read` | 該檔案的證件，按建立時間升序 |
| `POST` | `/applicants/:id/documents` | `document.create` | 登記證件，核驗狀態為 `pending`，`201` |
| `PUT` | `/documents/:id` | `document.update` | 修改後核驗狀態回到 `pending` |
| `DELETE` | `/documents/:id` | `document.delete` | `204` |
| `PUT` | `/documents/:id/verification` | `document.verify` | 核驗通過或駁回 |
| `POST` | `/documents/:id/attachments` | `document.create` 或 `document.update` | 上傳掃描件，`201`，回傳新增的附件 |
| `DELETE` | `/documents/:id/attachments/:attachmentId` | `document.update` | `204` |

```json
{
  "type": "passport",
  "number": "K1234567",
  "issuingCountry": "CHN",
  "issuingAuthority": "入境事務處",
  "issueDate": "2020-01-01",
  "expiryDate": "2030-01-01"
}
```

`type`：`passport`、`visa`、`residence_permit`、`national_id`、`travel_document`、`birth_certificate`。出生證明的 `expiryDate` 可以是 `null`。同一簽發國、同一類型、同一號碼不能重複，回 `409`。

核驗：

```json
{ "verification": "verified", "note": "與護照資料頁一致" }
```

`verification` 只能是 `verified` 或 `rejected`。回傳裡的 `verifiedBy` 是操作人姓名。

### 工作台

`GET /dashboard/summary`　已登入即可。

```json
{
  "applicantTotal": 0,
  "underReview": 0,
  "pendingVerification": 0,
  "expiringSoon": 0,
  "pendingAccounts": 0,
  "expiringDocuments": [],
  "asOf": "2026-09-28"
}
```

`applicantTotal` 不含已歸檔。`expiringSoon` 是 180 天內到期或已過期的證件數。`expiringDocuments` 最多 6 條，按到期日升序，每條含 `documentId`、`applicantId`、`applicantName`、`fileNo`、`type`、`number`、`expiryDate`。

### 審批申請

這些接口給工作人員用，和門戶的 `/portal/applications` 不同。

| 方法 | 路徑 | 權限 | 說明 |
| --- | --- | --- | --- |
| `GET` | `/applications` | `applicant.read` | 分頁。`status`、`keyword`（編號、姓名、護照號） |
| `GET` | `/applications/:id` | `applicant.read` | 申請詳情，含材料和時間線 |
| `POST` | `/applications/:id/decision` | `applicant.update` | 推進狀態 |

```json
{ "action": "approve", "note": "材料齊全" }
```

| action | 允許的目前狀態 | 結果 |
| --- | --- | --- |
| `start_review` | `submitted` 或 `supplement_required` | `under_review` |
| `request_supplement` | `under_review` | `supplement_required`，`note` 必填 |
| `approve` | `under_review` | `approved` |
| `reject` | `under_review` | `rejected`，`note` 必填 |

狀態不允許時回 `409`。`approve` 時如果還沒有 `fileNo`，會用申請單上的個人資料新建檔案，並把護照登記為已核驗證件，再把檔案編號寫回申請。申請人會收到一則門戶通知。

申請狀態：`draft` → `submitted` → `under_review` → `approved` 或 `rejected`。審核中可以轉到 `supplement_required`。受理前申請人可以改成 `withdrawn`。

### 報表、通知、審計

`GET /reports`　需要 `applicant.read`。

```json
{
  "applicationTotal": 0,
  "approvalRate": null,
  "averageProcessingDays": null,
  "byStatus": {},
  "byType": {}
}
```

通過率是「已通過 /（已通過 + 已駁回）」。平均處理天數是從提交到通過或駁回。還沒有終態申請時這兩個值是 `null`。

| 方法 | 路徑 | 權限 | 說明 |
| --- | --- | --- | --- |
| `GET` | `/notifications` | 已登入 | 最近 50 則，新的在前 |
| `POST` | `/notifications/:id/read` | 已登入 | 標為已讀，`204` |
| `GET` | `/audit-logs` | `user.read` 或 `role.read` | 分頁。`keyword` 搜尋操作人、動作、說明 |

通知：`id`、`title`、`body`、`readAt`、`createdAt`。  
審計：`id`、`actorType`（`staff` / `portal` / `system`）、`actorId`、`actorName`、`action`、`resourceType`、`resourceId`、`detail`、`createdAt`。

### 下載檔案

`GET /files/:id`　無需令牌。連結放在附件的 `url` 裡，瀏覽器可以直接打開。演示資料裡沒有實體檔案的附件，`url` 是 `"#"`，這個接口會回 404。

附件物件：

```json
{
  "id": "f-abc",
  "fileName": "passport.pdf",
  "mimeType": "application/pdf",
  "size": 120034,
  "url": "http://127.0.0.1:8787/api/v1/files/f-abc",
  "uploadedAt": "2026-09-28T01:00:00.000Z"
}
```

---

## 申請人門戶

令牌必須是門戶登入或註冊拿到的，`realm` 為 `portal`。申請人只能看到自己的申請；用別人的 id 訪問回 **404**。

### 註冊與登入

`POST /portal/auth/register`　無需登入。成功即登入，回傳 `201`。

```json
{
  "fullName": "Chan Tai Man",
  "email": "tai@example.com",
  "phone": "+852 9123 4567",
  "password": "Applicant@2026"
}
```

郵箱會轉成小寫，重複回 `409`。

`POST /portal/auth/login`

```json
{ "email": "tai@example.com", "password": "Applicant@2026" }
```

兩者都回傳：

```json
{
  "accessToken": "<jwt>",
  "expiresIn": 28800,
  "account": {
    "id": "pa-abc",
    "email": "tai@example.com",
    "fullName": "Chan Tai Man",
    "phone": "+852 9123 4567",
    "status": "active",
    "lastLoginAt": "2026-09-28T01:00:00.000Z",
    "createdAt": "2026-09-28T01:00:00.000Z"
  }
}
```

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `GET` | `/portal/auth/me` | 目前門戶帳號 |
| `POST` | `/portal/auth/logout` | `204` |

### 申請

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `GET` | `/portal/applications` | 自己的申請，按更新時間倒序。可用 `status`。回傳陣列，不是分頁 |
| `POST` | `/portal/applications` | 建立草稿，欄位可缺，`201` |
| `GET` | `/portal/applications/:id` | 詳情 |
| `PUT` | `/portal/applications/:id` | 只改草稿。已提交回 `409` |
| `POST` | `/portal/applications/:id/submit` | 提交，生成 `applicationNo`，狀態變 `submitted` |
| `POST` | `/portal/applications/:id/withdraw` | 受理前撤回 |
| `DELETE` | `/portal/applications/:id` | 只刪草稿，`204` |
| `POST` | `/portal/applications/:id/attachments` | 只在草稿上傳，`201` |
| `DELETE` | `/portal/applications/:id/attachments/:attachmentId` | 只在草稿移除，`204` |

草稿可寫的欄位：`type`、`purpose`、`intendedArrivalDate`、`intendedStayDays`、`surname`、`givenNames`、`nativeName`、`sex`、`dateOfBirth`、`placeOfBirth`、`nationality`、`maritalStatus`、`occupation`、`address`、`phone`、`email`、`passportNumber`、`passportIssuingCountry`、`passportIssuingAuthority`、`passportIssueDate`、`passportExpiryDate`。請求裡的 `status`、`accountId` 等會被忽略。

`type`：`visa`、`residence_permit`、`residence_extension`、`permanent_residence`、`travel_document`。

提交時以下欄位不能是空，而且至少要有一份材料。缺的欄位在 `fieldErrors` 裡：

`type`、`purpose`、`intendedArrivalDate`、`surname`、`givenNames`、`sex`、`dateOfBirth`、`placeOfBirth`、`nationality`、`maritalStatus`、`passportNumber`、`passportIssuingCountry`、`passportIssueDate`、`passportExpiryDate`、`attachments`

提交成功後編號形如 `APP-2026-000101`，並通知有 `applicant.update` 權限的工作人員。

撤回只允許 `submitted`、`under_review`、`supplement_required`。草稿要刪除，不要撤回。已通過、已駁回、已撤回回 `409`。

申請詳情另外包含：`applicationNo`（草稿為 `null`）、`accountId`、`status`、`attachments`、`reviewNote`、`fileNo`、`timeline`、`submittedAt`、`createdAt`、`updatedAt`。

時間線每一條：

```json
{ "status": "submitted", "note": "申請人提交申請，等待受理。", "actor": null, "at": "2026-09-28T01:00:00.000Z" }
```

申請人自己的操作 `actor` 是 `null`；工作人員操作時是姓名。

### 門戶通知

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `GET` | `/portal/notifications` | 最近 50 則 |
| `POST` | `/portal/notifications/:id/read` | 標為已讀，`204` |

形狀和工作人員通知相同。審批結果會寫到這裡。
