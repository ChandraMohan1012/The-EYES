# Security Remediation Checklist

## Completed in code

1. Removed hardcoded Supabase URL/key and test credentials from local scripts.
2. Updated scripts to read credentials from environment variables only.
3. Added tracked-file verification step via `git grep` to ensure sensitive strings are not present in current source.

## Required external actions (must be completed in provider consoles)

1. Rotate Supabase anon/service keys if they were ever committed to remote history.
2. Rotate any test user passwords that were previously committed.
3. Revoke any leaked OAuth client secrets if they were ever exposed.

## Git history hygiene

If sensitive values were pushed to remote, remove them from history with a history-rewrite workflow and force-push protected branches only after team approval.
