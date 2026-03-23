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
- A microsoft.com-only starter example backed by an Azure Function

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

This starter also includes a domain-based example at `/microsoft-example/`. Its protected payload comes from `/api/microsoft-example`, which only returns data to signed-in `@microsoft.com` users.

## Role bootstrap

On first run, the role store is created automatically in blob storage with:

- `admin` containing `BOOTSTRAP_ADMIN_EMAIL`
- `member` empty
- `defaultRole` set to `visitor`

After signing in as the bootstrap admin, open `/admin/` to manage roles.

## Real security note

This starter can hide or reveal UI based on auth state, but static HTML pages are still public files once deployed. The microsoft.com project card and navigation link are hidden in the browser for other users, but the actual example data is protected by `/api/microsoft-example`. Use Azure Functions or other backend APIs for truly sensitive data or privileged operations.

## Deployment

The included GitHub Actions workflow deploys to Azure Static Web Apps.

## Developer handoff: clone to deployed site

Use these steps to reproduce the same end state in your own Azure subscription after cloning the repo.

### 1. Prerequisites

Install:

- Azure CLI
- GitHub CLI
- Hugo Extended
- Azure Functions Core Tools
- Node.js and npm

Authenticate:

```powershell
az login
gh auth login
```

### 2. Clone and prepare the repo

```powershell
git clone https://github.com/<your-org-or-user>/webtemplate.git
cd webtemplate
Copy-Item .env.example .env
```

### 3. Choose your resource names

Pick values for:

- resource group: `webtemplate-<alias>-rg`
- Static Web App: `webtemplate-<alias>`
- storage account: `webtemplate<alias>cfg<suffix>`
- location: `westus2`
- bootstrap admin email: the Microsoft account that should reach `/admin/` first

Example variables:

```powershell
$subscriptionId = '<your-subscription-id>'
$resourceGroup = 'webtemplate-dev-rg'
$location = 'westus2'
$staticWebApp = 'webtemplate-dev'
$storageAccount = 'webtemplatedevcfg01'
$bootstrapAdmin = 'you@contoso.com'
$repo = '<your-org-or-user>/webtemplate'
```

### 4. Register the Static Web Apps provider if needed

```powershell
az account set --subscription $subscriptionId
az provider register --namespace Microsoft.Web --wait
```

### 5. Create Azure resources

```powershell
az group create --name $resourceGroup --location $location

az storage account create `
  --name $storageAccount `
  --resource-group $resourceGroup `
  --location $location `
  --sku Standard_LRS `
  --kind StorageV2 `
  --allow-blob-public-access false `
  --min-tls-version TLS1_2

az staticwebapp create `
  --name $staticWebApp `
  --resource-group $resourceGroup `
  --location $location `
  --sku Free
```

### 6. Configure app settings

```powershell
$storageConnectionString = az storage account show-connection-string `
  --name $storageAccount `
  --resource-group $resourceGroup `
  --query connectionString -o tsv

az staticwebapp appsettings set `
  --name $staticWebApp `
  --resource-group $resourceGroup `
  --setting-names `
    "STORAGE_CONNECTION_STRING=$storageConnectionString" `
    "BOOTSTRAP_ADMIN_EMAIL=$bootstrapAdmin"
```

### 7. Add the deployment token to GitHub

```powershell
$deployToken = az staticwebapp secrets list `
  --name $staticWebApp `
  --resource-group $resourceGroup `
  --query properties.apiKey -o tsv

gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN `
  --repo $repo `
  --body $deployToken
```

### 8. Update your local `.env`

Set these values in `.env`:

```text
AzureWebJobsStorage=<same storage connection string as above>
FUNCTIONS_WORKER_RUNTIME=node
STORAGE_CONNECTION_STRING=<same storage connection string as above>
BOOTSTRAP_ADMIN_EMAIL=<same bootstrap admin email as above>
```

### 9. Validate locally

```powershell
.\tools\Start-LocalSite.ps1
```

Open:

```text
http://localhost:4280/
```

### 10. Trigger the first deploy

If you already pushed the scaffold before the GitHub secret existed, push one empty commit:

```powershell
git commit --allow-empty -m "Trigger Azure deployment"
git push
```

You can watch the latest deploy with:

```powershell
gh run list --repo $repo --workflow deploy.yml --limit 1
```

### 11. Verify the deployed site

```powershell
$hostname = az staticwebapp show `
  --name $staticWebApp `
  --resource-group $resourceGroup `
  --query defaultHostname -o tsv

Write-Host ("https://" + $hostname)
```

Check:

- the site root renders starter content
- `/api/check-role` returns anonymous JSON before sign-in
- `/.auth/login/aad?post_login_redirect_uri=/` redirects into the SWA identity service

### 12. Enable Microsoft authentication

In the Azure Portal, open the Static Web App and configure Microsoft as an identity provider in the **Authentication** blade.

After signing in as the bootstrap admin, open `/admin/` and manage role membership there.

