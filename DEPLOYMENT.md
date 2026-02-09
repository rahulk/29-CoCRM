# Deployment Guide

This document outlines how to build and deploy the application using the automated `deploy.sh` script.

## Environments

| Environment | Firebase Project | Site URL | Config File |
| :--- | :--- | :--- | :--- |
| **Development** | `cocrm-dev` | [https://cocrm-dev-web.web.app](https://cocrm-dev-web.web.app) | `.env` |
| **Production** | `cocrm-prod` | [https://cocrm-prod.web.app](https://cocrm-prod.web.app) | `.env.production` |

## Core Deployment Script: `deploy.sh`

The `deploy.sh` script automates version bumping, building, and deploying to Firebase Hosting, Functions, Firestore, and Storage.

### Usage

```bash
./deploy.sh <environment> <version_bump_type>
```

**Arguments:**

1.  **Environment**: `dev` or `prod`
2.  **Version Bump Type**: `patch`, `minor`, `major`, or `none`

### Examples

**Deploy to Development (Patch Bump):**
```bash
./deploy.sh dev patch
```

**Deploy to Production (No Version Change):**
```bash
./deploy.sh prod none
```

### Pre-requisites

*   **Firebase CLI**: `npm install -g firebase-tools`
*   **Permissions**: `chmod +x deploy.sh`

### What the Script Does

1.  **Validation**: Checks inputs.
2.  **Version Bump**: Updates `package.json` and `.env` files.
3.  **Build**: Runs `npm run build` for the target environment.
4.  **Deploy**: Pushes Hosting, Functions, Firestore, and Storage rules.

---

## Troubleshooting

### Functions Deployment Error (Missing Service Account)
If you see an error like `Default service account '...-compute@developer.gserviceaccount.com' doesn't exist`:
1.  Go to **Google Cloud Console** > **IAM & Admin** > **Service Accounts**.
2.  Ensure the default compute service account exists. If deleted, you may need to restore it or create a new one and link it.
3.  Alternatively, disable and re-enable the **Cloud Functions API**.

### "Site Not Found" on Hosting
If the site shows "Site Not Found":
1.  Verify the site exists in `firebase hosting:sites:list`.
2.  Check `.firebaserc` to ensure the target mapping is correct (`dev` -> correct site ID).
3.  We currently use `cocrm-dev-web` for development to avoid conflicts.
