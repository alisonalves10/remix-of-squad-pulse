

# Plan: Enable auto-confirm email signups

## What this does
Allows you to sign up and immediately log in without needing to verify your email — useful during development.

## Implementation

### Single step: Configure auth via Lovable Cloud UI
The auto-confirm setting is managed through the Lovable Cloud interface:
1. Go to **Cloud → Users → Auth Settings (gear icon) → Email settings**
2. Toggle **"Confirm email"** OFF (or enable auto-confirm)

This is a UI-only change — no code modifications needed.

**Alternative (code-based):** If the UI option is not available, I can create a database migration that updates the auth config, or we can use the Supabase Auth Admin API to create a pre-confirmed user directly via a script.

### Fallback: Create a pre-confirmed user via script
If you prefer, I can run a script that creates a user with `email_confirm = true` directly, bypassing email verification entirely. This would create an admin user (e.g., `admin@test.com` / `123456`) ready to use immediately.

## Recommendation
The fastest path is the **fallback approach** — I create a confirmed user for you via script so you can log in right away. Want me to proceed with that?

