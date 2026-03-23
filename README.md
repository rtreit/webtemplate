# webtemplate

Starter Hugo site for Azure Static Web Apps with Microsoft EasyAuth, role-aware UI, and Azure Functions examples.

## What this template includes

- Hugo static site with a reusable dark theme
- Microsoft login through Azure Static Web Apps EasyAuth
- Browser auth state detection through `/.auth/me`
- Role resolution in Azure Functions using `x-ms-client-principal`
- Role storage in Azure Blob Storage at `site-config/roles.json`
- Admin page for managing roles
- Example public, member-only, and admin-only project cards

## What this template does not include

- Personal blog posts
- Personal images or branding
- Report upload/viewer features
- GroupMe integrations

## Local development

Install Hugo Extended, Azure Functions Core Tools, Node.js, and npm.

Copy `.env.example` to `.env`, then update the placeholder values:

```powershell
Copy-Item .env.example .env
```

Start the local site:

```powershell
.\tools\Start-LocalSite.ps1
```

Open:

```text
http://localhost:4280/
```

The starter script will:

- load `.env`
- generate `api\local.settings.json` if it does not exist
- install API dependencies on first run
- start Hugo and the Azure Static Web Apps emulator together

## Auth architecture

Login and logout are handled by Azure Static Web Apps EasyAuth:

- `/.auth/login/aad?post_login_redirect_uri=/`
- `/.auth/logout?post_logout_redirect_uri=/`
- `/.auth/me`

The browser checks auth state and updates the UI. Azure Functions enforce authorization using the `x-ms-client-principal` header injected by Static Web Apps after sign-in.

## Role bootstrap

On first run, the role store is created automatically in blob storage with:

- `admin` containing `BOOTSTRAP_ADMIN_EMAIL`
- `member` empty
- `defaultRole` set to `visitor`

After signing in as the bootstrap admin, open `/admin/` to manage roles.

## Real security note

This starter can hide or reveal UI based on auth state, but static HTML pages are still public files once deployed. Use Azure Functions or other backend APIs for truly sensitive data or privileged operations.

## Deployment

The included GitHub Actions workflow deploys to Azure Static Web Apps.

Before enabling deployment:

1. Create an Azure Static Web App in your target tenant.
2. Add the GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN`.
3. Configure these app settings in Azure:
   - `STORAGE_CONNECTION_STRING`
   - `BOOTSTRAP_ADMIN_EMAIL`
4. Enable Microsoft authentication in the Static Web App Authentication blade.

