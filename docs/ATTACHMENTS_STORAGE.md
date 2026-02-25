# Attachments Storage Documentation

## Overview

Attachments in the Ticket Portal are stored using a **hybrid approach**:
1. **File Storage**: Files are stored in **Cloudflare R2** (S3-compatible object storage)
2. **Metadata Storage**: Attachment metadata is stored in the **PostgreSQL database**

## Database Table: `attachments`

### Table Schema

```sql
CREATE TABLE attachments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Table Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | SERIAL (Primary Key) | Unique attachment identifier |
| `ticket_id` | INTEGER | Foreign key to `tickets.id` (CASCADE delete) |
| `file_name` | VARCHAR(255) | Original filename of the uploaded file |
| `file_url` | TEXT | Full public URL to the file in R2 storage |
| `file_size` | INTEGER | File size in bytes |
| `uploaded_by` | INTEGER | Foreign key to `users.id` (who uploaded the file) |
| `created_at` | TIMESTAMP | When the attachment was uploaded |

## File Storage: Cloudflare R2

### Storage Location

Files are stored in **Cloudflare R2** (S3-compatible object storage) with the following path structure:

```
tickets/{ticketId}/{timestamp}-{randomSuffix}-{sanitizedFileName}
```

**Example:**
```
tickets/123/1703123456789-abc123-document.pdf
```

### File Naming Convention

1. **Path**: `tickets/{ticketId}/` - Groups files by ticket
2. **Timestamp**: Unix timestamp in milliseconds
3. **Random Suffix**: 6-character random string (prevents collisions)
4. **Sanitized Filename**: Original filename with special characters replaced

### Configuration

- **Bucket**: Configured via `R2_BUCKET_NAME` environment variable
- **Public URL**: Configured via `R2_PUBLIC_URL` environment variable
- **Client**: Uses AWS SDK S3 client (`@aws-sdk/client-s3`) configured for R2

## Upload Process

### API Endpoint

**POST** `/api/attachments`

### Upload Flow

1. **Validation**:
   - File size check (max 5MB)
   - File extension validation (whitelist)
   - MIME type validation
   - Filename sanitization (prevents path traversal)

2. **File Upload to R2**:
   ```typescript
   await r2Client.send(
     new PutObjectCommand({
       Bucket: R2_BUCKET_NAME,
       Key: fileName, // tickets/{ticketId}/{timestamp}-{random}-{filename}
       Body: buffer,
       ContentType: file.type,
       ContentLength: file.size,
     })
   )
   ```

3. **Database Insert**:
   ```sql
   INSERT INTO attachments (ticket_id, file_name, file_url, file_size, uploaded_by)
   VALUES (?, ?, ?, ?, ?)
   ```

4. **Update Ticket Flag**:
   ```sql
   UPDATE tickets SET has_attachments = TRUE WHERE id = ?
   ```

## Retrieval Process

### Get Attachments for a Ticket

**Location**: `lib/actions/tickets.ts` - `getTicketById()`

```sql
SELECT a.*, u.full_name as uploader_name
FROM attachments a
LEFT JOIN users u ON a.uploaded_by = u.id
WHERE a.ticket_id = ?
ORDER BY a.created_at DESC
```

### Attachment Count in Ticket List

**Location**: `lib/actions/tickets.ts` - `getTickets()`

```sql
SELECT 
  ...,
  (SELECT COUNT(*) FROM attachments att WHERE att.ticket_id = t.id) as attachment_count
FROM tickets t
```

## Delete Process

### API Endpoint

**DELETE** `/api/attachments?id={attachmentId}`

### Delete Flow

1. **Fetch Attachment Info**:
   ```sql
   SELECT * FROM attachments WHERE id = ?
   ```

2. **Delete from R2**:
   ```typescript
   await r2Client.send(
     new DeleteObjectCommand({
       Bucket: R2_BUCKET_NAME,
       Key: fileName,
     })
   )
   ```

3. **Delete from Database**:
   ```sql
   DELETE FROM attachments WHERE id = ?
   ```

4. **Update Ticket Flag** (if no attachments remain):
   ```sql
   UPDATE tickets SET has_attachments = FALSE WHERE id = ?
   ```

## Security Features

### File Validation

1. **Allowed Extensions** (Whitelist):
   - Documents: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.txt`, `.csv`, `.rtf`
   - Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.svg`
   - Archives: `.zip`, `.rar`, `.7z`
   - Other: `.json`, `.xml`, `.md`

2. **Blocked Extensions** (Blacklist):
   - Executables: `.exe`, `.bat`, `.cmd`, `.com`, `.msi`, `.dll`, `.scr`
   - Scripts: `.js`, `.jsx`, `.ts`, `.vbs`, `.ps1`, `.sh`, `.php`, `.py`, `.pl`
   - Other: `.jar`, `.class`, `.htaccess`

3. **File Size Limit**: 5MB maximum

4. **Filename Sanitization**:
   - Removes path traversal attempts (`..`, `/`, `\`)
   - Removes null bytes
   - Limits length to 255 characters
   - Replaces special characters with underscores

## Related Files

### Database Schema
- `scripts/001-create-tables.sql` - Table creation script

### API Routes
- `app/api/attachments/route.ts` - Upload/Delete endpoints

### Server Actions
- `lib/actions/tickets.ts` - Functions to retrieve attachments

### Type Definitions
- `lib/db.ts` - TypeScript type for `Attachment`

### Components
- `components/tickets/attachments-dialog.tsx` - UI component for viewing attachments

## Database Relationships

```
tickets (1) ──< (many) attachments
users (1) ──< (many) attachments (uploaded_by)
```

- **CASCADE DELETE**: When a ticket is deleted, all its attachments are automatically deleted from both R2 and the database
- **Foreign Key Constraints**: Ensure data integrity

## Environment Variables Required

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-public-url.com
```

## Notes

- Files are **not stored in the database** (only metadata)
- Files are stored in **Cloudflare R2** (S3-compatible)
- The `file_url` in the database points to the public R2 URL
- The `tickets.has_attachments` flag is automatically maintained
- Attachment count is calculated on-the-fly in queries
