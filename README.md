# CarePilot AI — Azure Static Web Apps edition

CarePilot AI is now structured as a single Azure Static Web App:

```
carepilot-ai/
├── frontend/                  ← static site (app_location) — HTML/CSS/JS, no build step
├── api/                       ← Azure Functions app (api_location) — wraps the Express backend
│   ├── app.js                 ← the Express app (routes, middleware — unchanged logic)
│   ├── src/                   ← routes / services / config / utils (same code as before)
│   ├── server/                ← the single Azure Function that runs the Express app
│   │   ├── function.json
│   │   └── index.js
│   ├── host.json
│   └── package.json
├── staticwebapp.config.json   ← SWA routing / headers config
└── .github/workflows/azure-static-web-apps.yml   ← CI/CD (build + deploy on every push)
```

Push to `main` on GitHub → the workflow builds and deploys the frontend **and**
the API together, as one Azure Static Web App. There's nothing to build or
containerize — the frontend is plain static files and the API is a single
Azure Function that wraps the existing Express app with
[`azure-function-express`](https://www.npmjs.com/package/azure-function-express),
so none of the route/service files under `api/src/` needed to change.

## 1. Create the Azure Static Web App (one-time)

The easiest path lets Azure wire up the GitHub Action and deployment secret
for you automatically:

1. Push this repo to GitHub.
2. In the [Azure Portal](https://portal.azure.com), create a **Static Web App** resource:
   - **Deployment source**: GitHub → sign in → pick this repo and the `main` branch.
   - **Build presets**: Custom.
   - **App location**: `frontend`
   - **Api location**: `api`
   - **Output location**: *(leave blank)*
3. Click **Create**. Azure will:
   - Add a `AZURE_STATIC_WEB_APPS_API_TOKEN` secret to your GitHub repo, and
   - Commit a workflow file to `.github/workflows/`.

If you'd rather use the workflow already included in this repo
(`.github/workflows/azure-static-web-apps.yml`) instead of letting Azure add
its own, create the Static Web App resource with **deployment source: Other**,
then copy the **deployment token** (Static Web App → Overview → *Manage
deployment token*) into a GitHub repo secret named
`AZURE_STATIC_WEB_APPS_API_TOKEN` (Settings → Secrets and variables → Actions).
Either way, one workflow ends up wired to one token — don't keep both.

## 2. Create an Azure Storage account (for data persistence)

The old backend saved records/reminders to a JSON file on disk. Static Web
Apps' Functions run on serverless, ephemeral, multi-instance compute, so
writing to disk no longer persists data reliably. This has already been
switched to **Azure Table Storage** (`api/src/data/db.js`), so you just need
a storage account:

```bash
az storage account create -g <your-resource-group> -n <uniquestorageacct> \
  --sku Standard_LRS --kind StorageV2

az storage account show-connection-string -g <your-resource-group> \
  -n <uniquestorageacct> -o tsv
```

Copy that connection string — you'll set it as `AZURE_STORAGE_CONNECTION_STRING`
in the next step. (If you skip this, the API silently falls back to a local
JSON file, which is fine for quick local testing but **will not persist**
data on a deployed Static Web App.)

## 3. Configure application settings (API keys)

In the Azure Portal, open your Static Web App → **Settings → Environment
variables** (previously called "Application settings") and add every value
from `api/local.settings.json.example`'s `Values` block with your real Azure
AI service keys:

| Setting | Purpose |
|---|---|
| `AZURE_STORAGE_CONNECTION_STRING` | Table Storage for records/reminders/chat (step 2) |
| `VISION_ENDPOINT` / `VISION_KEY` | Azure AI Vision (OCR) |
| `LANGUAGE_ENDPOINT` / `LANGUAGE_KEY` | Azure AI Language |
| `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_KEY` / `AZURE_OPENAI_DEPLOYMENT` | Azure OpenAI (RAG chat) |
| `AZURE_SEARCH_ENDPOINT` / `AZURE_SEARCH_KEY` / `AZURE_SEARCH_INDEX` | Azure AI Search |
| `SPEECH_KEY` / `SPEECH_REGION` | Azure AI Speech |
| `CORS_ORIGIN` | Set to `*` or your custom domain |

These are injected as environment variables into the Function app at runtime
— no redeploy needed, just save and the running Functions pick them up
within a minute or two.

## 4. Push to deploy

```bash
git add .
git commit -m "Deploy to Azure Static Web Apps"
git push origin main
```

Watch the run under your GitHub repo's **Actions** tab. When it's green,
your app is live at the URL shown in the Static Web App's **Overview** page
(`https://<random-name>.azurestaticwebapps.net`), with the frontend served
from `frontend/` and every `fetch('/api/...')` call in the frontend
automatically routed — same-origin, no CORS setup needed — to the Azure
Function in `api/`.

## Local development

```bash
npm install -g @azure/static-web-apps-cli azure-functions-core-tools@4
cd api && npm install && cd ..
cp api/local.settings.json.example api/local.settings.json   # fill in your keys
swa start frontend --api-location api
```

This runs the frontend and the Functions API together at `http://localhost:4280`,
emulating the deployed environment (including `/api/*` routing).

## What changed from the original Express/Docker version

- `backend/server.js` (the `app.listen()` entry point) is gone — instead
  `api/app.js` exports the same Express app, and `api/server/` is a single
  Azure Function (route `{*segments}`) that runs it on every request via
  `azure-function-express`. All route and service files under `api/src/`
  are otherwise unchanged.
- `api/src/data/db.js` now uses **Azure Table Storage** instead of writing
  JSON files to disk (required — see step 2), with an automatic local-file
  fallback when no storage connection string is configured, for local dev.
- File uploads (`api/src/middleware/upload.js`) now land in the OS temp
  directory instead of a project-relative `uploads/` folder, since that's
  the only writable path on Azure Functions Consumption plan. Uploaded
  files are only ever read once (for OCR/transcription) and discarded, so
  this has no effect on behavior.
- `Dockerfile` / `docker-compose.yml` are no longer used for this
  deployment path and can be deleted if you don't need them for anything
  else (e.g. local Docker testing).
