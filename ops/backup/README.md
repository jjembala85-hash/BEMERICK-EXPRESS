# Database backups

Nightly at 03:30 EAT, GitHub Actions (`.github/workflows/backup.yml`) dumps the live
database, **restores it into a throwaway database to prove it works**, encrypts it
(AES-256, passphrase in the `BACKUP_PASSPHRASE` secret and the owner's password
manager) and stores it in the private Cloudflare R2 bucket `bemerick-express-backups`:

| Folder | Kept | |
|--------|------|---|
| `daily/YYYY-MM-DD.dump.gpg` | 35 days | every night |
| `monthly/YYYY-MM-01.dump.gpg` | 400 days | first of each month |

A failed run (dump, restore check, encryption or upload) emails the repository owner.
Run one by hand: GitHub → Actions → *Database backup* → **Run workflow**.

## Restoring (disaster recovery)

Never restore over the live database. Restore into a **new Neon branch**, check it,
then point the site at it.

1. **Download** the backup: Cloudflare dashboard → R2 → `bemerick-express-backups` →
   pick the file → Download (or `wrangler r2 object get bemerick-express-backups/daily/<date>.dump.gpg --file backup.dump.gpg --remote`).
2. **Decrypt** (asks for the passphrase):
   `gpg --output backup.dump --decrypt backup.dump.gpg`
3. **Create an empty Neon branch** (Neon console → Branches → New branch → *schema only* or
   empty), and copy its **direct** (not pooled) connection string.
4. **Restore** with PostgreSQL 18 tools (or `docker run --rm -it -v "$PWD:/w" postgres:18 bash`):
   `pg_restore --no-owner --no-privileges --exit-on-error -d "<new branch URL>" backup.dump`
5. **Check** it: `LIVE_URL=<old/live URL> RESTORE_URL=<new branch URL> bash ops/backup/verify-restore.sh backup.dump`
   (with a dead live database, just open the new branch and check stories and staff).
6. **Switch the site**: Vercel → Settings → Environment Variables → set `DATABASE_URL`
   (pooled) and `DATABASE_URL_UNPOOLED` (direct) to the new branch → Redeploy.
7. Delete the decrypted `backup.dump` from your computer.

Photos are not in the database backup: they live in the `bemerick-express-media` bucket.
