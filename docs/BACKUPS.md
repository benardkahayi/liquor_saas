# Database backups

Every night at about 03:17 (Tanzania time) GitHub copies the database, locks the copy with
`BACKUP_PASSPHRASE`, and keeps it for 30 days.

Workflow file: `.github/workflows/db-backup.yml`

## Set up (once)

1. **Get the connection string.** In Supabase, open the project, click **Connect**, choose
   **Session pooler**, and copy the URI (port 5432). Put your database password in place of
   `[YOUR-PASSWORD]`.
2. **Choose a passphrase** of at least 16 characters. Save it in a password manager or
   write it down somewhere safe. **Without it, no backup can be opened.**
3. In GitHub, open **liquor_saas → Settings → Secrets and variables → Actions → New repository
   secret** and add:
   - `DATABASE_BACKUP_URL`: the connection string from step 1
   - `BACKUP_PASSPHRASE`: the passphrase from step 2
4. Open **Actions → Database backup → Run workflow** to make the first backup now. It should
   finish green in 1–3 minutes.

When you change the database password, update `DATABASE_BACKUP_URL` too.

## Download a backup

**Actions → Database backup →** pick a day's run **→ Artifacts →** `db-backup-<date>`.
You get a zip containing `db-<date>.dump.gpg`.

## Restore

Restoring **replaces** the data in the database you restore into. Try it on a new, empty
Supabase project first, and only then on the live one.

On a computer with PostgreSQL 17 tools and GnuPG installed (Git Bash on Windows works):

```bash
# 1. Unlock (asks for BACKUP_PASSPHRASE)
gpg --output db.dump --decrypt db-2026-11-24_0317.dump.gpg

# 2. Look inside (optional)
pg_restore --list db.dump | head

# 3. Restore into the database (Session pooler URI)
pg_restore --dbname "postgresql://...:5432/postgres" \
  --clean --if-exists --no-owner --no-privileges --single-transaction db.dump
```

`--clean --if-exists` removes the current tables before restoring them.
`--single-transaction` means that if anything fails, nothing is changed.

After restoring the live database, restart the Render service (**Manual Deploy → Restart**).

## Notes

- A backup is **locked**: anyone can see that it exists (the repository is public), but
  only someone with the passphrase can open it.
- GitHub pauses scheduled workflows in a repository with no commits for 60 days. If that
  happens, open **Actions → Database backup** and click **Enable workflow**.
- A failed nightly backup sends an email to the GitHub account.
