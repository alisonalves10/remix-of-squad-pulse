

# Plan: Fix RLS error on azure_config by assigning admin role

## Problem
The `azure_config` table requires the `admin` role for all operations (SELECT, INSERT, UPDATE, DELETE). Your user account was created but never received the admin role because the trigger to auto-assign it was never attached to any table.

## Solution

### Step 1: Insert admin role for current user
Use the database insert tool to add the admin role for user `989db50e-65a1-4ff2-bbf9-17577d8aa622`.

```sql
INSERT INTO public.user_roles (user_id, role) VALUES ('989db50e-65a1-4ff2-bbf9-17577d8aa622', 'admin');
```

### Step 2: Create trigger for future users
Create a migration to attach the existing `assign_admin_to_first_user` function as a trigger on the `auth.users` table — wait, we cannot attach triggers to `auth.users` (reserved schema). Instead, we'll create the trigger on `public.user_roles` or handle it differently.

**Better approach**: Create a trigger on `auth.users` is not allowed. Instead, we'll add a database migration that creates a trigger on a profile-insert flow, OR simply ensure the first user gets admin via the insert above and leave manual admin assignment for future users.

Since this is a dev/admin tool, the simplest fix is just the data insert (Step 1). No code changes needed — the Settings page will work immediately after.

## Files changed
- None (data insert only)

