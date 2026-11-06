# Audit & Hardening Pass — Change Summary

No database migrations were added or changed. No model fields were touched, so
existing data is unaffected. Run the test-suite with `python manage.py test`.

## Critical security fixes (backend)
1. **Open API.** `DEFAULT_PERMISSION_CLASSES` was unset, so students, teachers,
   classes, subjects, announcements and **admissions** endpoints were readable
   *and writable by anyone on the internet* (incl. DELETE, and approving an
   admission, which creates a student account). Default is now `IsAuthenticated`.
2. **Role-based access** (`api/permissions/role_permissions.py`):
   - students: only their own profile, fees, attendance, results, reports,
     character assessments, bills and receipts (previously any logged-in
     student could read/modify anyone's, and `DELETE /students/<id>/`);
   - teachers: staff read/write for attendance, results, reports, mock, preschool;
     no access to fees/accounts/admissions;
   - admin-only: fees (write), accounts, dashboard, admissions, class/subject/
     announcement writes, fee WhatsApp, class bills, admission PDF.
3. **Paystack.**
   - Webhook used an empty HMAC key when `PAYSTACK_SECRET_KEY` was not defined in
     settings (it never was) — anyone could forge a "paid" event. It now refuses
     if the key is missing. **Set `PAYSTACK_SECRET_KEY` on Render.**
   - Webhook was mounted at `/api/api/webhooks/paystack/`; the canonical
     `/api/webhooks/paystack/` now exists too (the old path still works).
   - Students could POST any amount to `/fees/<id>/pay/` and credit their own
     account for free. Student payments now require a Paystack reference and are
     verified against Paystack (credited amount capped to what was charged).
     Until `PAYSTACK_SECRET_KEY` is set, verification is skipped (logged as a
     warning) so live payments keep working.
   - Payments are recorded atomically with a row lock, so webhook + browser
     callback (or two admins) can no longer double-count or overwrite `paid`.
4. **Active-users panel** never refreshed (middleware read the session user, JWT
   users are invisible there). Replaced by `api/authentication.py`.
5. Password rules: register/change-password now use Django's validators.

## Bug fixes
- **Django 5.2 ignores `DEFAULT_FILE_STORAGE` / `STATICFILES_STORAGE`.** Uploaded
  lesson/submission files and WhatsApp PDFs went to local disk with `/media/`
  URLs (never served in production) → WhatsApp report/bill/receipt sending
  failed ("Storage backend did not return a public HTTPS URL"). Now configured
  through `STORAGES` using Cloudinary raw storage.
- Admission approval: siblings sharing a parent e-mail never got a student
  account (duplicate check was on e-mail); parent phone, gender, nationality,
  religion, health notes and previous school were not copied (so fee SMS /
  WhatsApp never reached new students); ID generation could collide. Now
  atomic, retried, and copies all fields.
- Grading an e-learning submission refreshed `submitted_at`, making graded work
  look late.
- WhatsApp sender validated template config before the phone number (confusing
  error); order fixed. Tests updated accordingly.
- `render.yaml` contained a shell heredoc instead of YAML — repaired, and new env
  vars added.
- Removed unused `vite-plugin-prerender` (pulled in Chromium/puppeteer and broke
  `npm install` in restricted environments).

## Frontend / UX
- Login: server-down / cold-start message instead of "Invalid credentials";
  suspended-account message now shows readable text, not `account_suspended`;
  redirects signed-in users to their portal; autocomplete + aria labels;
  removed fake `tel:+000000000` link; corrected admin "forgot password" text.
- API client: one shared token refresh for concurrent 401s, base-URL fallback.
- `announcementService` pointed at a non-existent URL.

## Things to review (not changed on purpose)
- Default passwords `student123` / `teacher123` for new accounts. Override the
  student one with env `DEFAULT_STUDENT_PASSWORD`; consider forcing a change at
  first login.
- django-axes locks an account by username after 3 failures with no cool-off, so
  anyone can lock a known username (including the only admin). Unlock with
  `python manage.py axes_reset`.
- Pre-existing failing tests left alone: report position expectation and the
  axes audit-signal test.
