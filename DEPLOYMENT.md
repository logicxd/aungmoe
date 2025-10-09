# Deployment Guide

This project deploys to fly.io via GitHub Actions.

## GitHub Environment Setup

The workflow uses a GitHub Environment named `Production` which shows up in the Environments tab.

### Required GitHub Secrets

Add these secrets in your GitHub repository settings (Settings → Secrets and variables → Actions):

1. **FLY_API_TOKEN** - Your fly.io API token
   - Get from: `flyctl auth token`

2. **MONGODB_BOOKMARK_CONNECTION_STRING** - MongoDB connection string for bookmarks

3. **SESSION_SECRET** - Secret key for Express session management

4. **YELP_API** - Yelp API key

5. **GOOGLE_API** - Google API key (for Maps, etc.)

6. **ENCRYPTION_KEY** - Encryption key for sensitive data

### Optional: Environment Protection Rules

In GitHub Settings → Environments → Production, you can configure:
- Required reviewers before deployment
- Deployment branches (currently: master only)
- Environment secrets (if you want environment-specific secrets)

## How Deployment Works

This is configured on the workflow:

1. On push to any branch: Tests run
2. On push to `master` branch (after tests pass):
   - Secrets are synced from GitHub to fly.io
   - Application deploys to fly.io
   - Deployment shows in GitHub Environments tab with URL

## Manual Deployment

To deploy manually:
```bash
flyctl deploy
```

Note: Manual deployments still need secrets configured on fly.io.
