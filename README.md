# SETUP COMMANDS — CampusQR Attend (School Event QR Attendance)

> **Target:** First-year students | **Expo SDK:** 54 | **Expo Go:** 54.0.8

---

## PREREQUISITES

| Tool | Download | Verify |
|---|---|---|
| Node.js (LTS) | https://nodejs.org/en | `node --version` |
| VS Code | https://code.visualstudio.com | (open it) |
| Expo Go 54.0.8 | Play Store → "Expo Go" | (version in app settings) |

---

## STEP 1 — Create the App

```powershell
cd D:\QR-ATT
npx create-expo-app@latest qr-att

# When prompted, select "SDK 54"
# Wait for npm install (~2 min)
```

---

## STEP 2 — Install Matching Versions

The default install may need these fixed versions that match Expo Go 54.0.8:

```powershell
npm install expo@~54.0.35 react@19.1.0 react-native@0.81.5 expo-router@~6.0.24 @expo/vector-icons@^15.0.3 expo-linking@~8.0.12 expo-constants@~18.0.13 expo-font@~14.0.12 expo-status-bar@~3.0.9 expo-splash-screen@~31.0.13 react-native-screens@~4.16.0 react-native-safe-area-context@~5.6.0 react-native-gesture-handler@~2.28.0 react-native-reanimated@~4.1.1 react-dom@19.1.0 react-native-web@~0.21.0 @types/react@~19.1.0 typescript@~5.9.2 --legacy-peer-deps
```

---

## STEP 3 — Start

```powershell
npx expo start
```

Scan QR code with Expo Go. Or press `W` for web.

---

## TROUBLESHOOTING

| Problem | Solution |
|---|---|
| npm install fails | Use `npm install --legacy-peer-deps` |
| App crashes in Expo Go | Make sure all versions match STEP 2 exactly |
| QR won't scan | Phone + computer on same WiFi |
| White screen | Wait 10s, or shake → Reload |
| TypeScript errors | Run `npx tsc --noEmit` |
| Can't change name / role stuck as "Student" / `42P17 infinite recursion` | Run the single SQL block in `SUPABASE_SETUP.md` in the Supabase SQL Editor |

---

# CampusQR Attend — Role-Based QR Attendance

**CampusQR Attend is the app.** The old home/Scan/History tabs were removed;
opening the app lands directly on the CampusQR portal, which routes by
auth + role (student / teacher / admin). The screens live in `app/campus/**`
and the data layer in `lib/campusqr/**`.

The app runs on top of your **existing** Supabase backend. It **consumes** the
schema only — no tables, enums, functions, triggers, RLS policies or
migrations are created or altered by the app. To (re)create the backend, run
the single SQL block in `SUPABASE_SETUP.md` in the Supabase SQL Editor.

## Environment variables

The app reads two `EXPO_PUBLIC_*` values from `.env` (never hardcode them, and
never ship a `service_role` key — RLS is the enforcement layer):

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon / publishable key>
```

The single Supabase client lives in `lib/supabase.ts`.

## Logical entity → existing schema mapping

| Logical entity | Existing table | Fields used by the app |
|---|---|---|
| User / Profile | `public.profiles` | `id, email, full_name, role, is_active, phone, student_no, title, educational_level, course, year_level, block, section, department, grade_class, created_at` |
| Event | `public.events` | `id, name, description, venue, start_datetime, end_datetime, status, qr_token, created_by, created_at` |
| Attendance | `public.attendance` | `id, event_id, student_id, status, method, recorded_at, recorded_by` |
| Activity log | `public.audit_logs` | `actor_id, action, entity, entity_id, details, created_at` (admin read-only) |

**Check-in contract:** attendance rows are created **only** through the
`check_in(p_token)` RPC (`lib/campusqr/attendance.ts`). Its five outcomes —
`success`, `duplicate`, `closed`, `invalid`, `unauthorized` — are mapped to the
five result panels on the Scan screen. Admin role/activation/deletion go through
the `admin_set_role`, `admin_set_active` and `admin_delete_user` RPCs.

## Roles & navigation

- **Student** — Events · Scan QR · My Attendance · Profile
- **Teacher** — Manage Events · Generate QR · Monitor Attendance · Summaries (Profile via the header)
- **Admin** — Manage Users · Manage Events · Overall Attendance · Correct Reports · System Reports (Profile via the header)

Public self-registration always creates an **active student**; teacher/admin are
promoted by an admin only. Self-service profile edits never send `role`,
`is_active` or `email`.

## Seeding one admin, one teacher, one student

1. **Create the accounts through the app** (or Auth → Users): register students
   via the Student portal; create the teacher/admin auth users directly in the
   Supabase dashboard (Email + password, no role in metadata).
2. **Promote the teacher** (SQL Editor, runs as owner so the protect trigger
   allows it):

   ```sql
   update public.profiles set role = 'teacher' where email = 'teacher@school.edu';
   ```

3. **Promote the admin** the same way, or from the **Manage Users** screen via
   `admin_set_role`:

   ```sql
   update public.profiles set role = 'admin' where email = 'admin@school.edu';
   ```

After that, the admin can manage roles/activation from **Manage Users**, and any
open event's QR (`CAMPUSQR:<qr_token>`) can be scanned by students.

