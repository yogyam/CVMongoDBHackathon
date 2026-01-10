# Installation Guide

## Issue: CDP Packages Not Found

If you're getting errors about `@coinbase/cdp-react` or `@coinbase/cdp-hooks` not being found, try these solutions:

## Solution 1: Use CDP Starter Template (Recommended)

The easiest way is to create a fresh CDP app and copy the dependencies:

```bash
# Create a temporary CDP app to get the correct package versions
cd /tmp
npm create @coinbase/cdp-app@latest temp-cdp-app -- --template nextjs

# Check the package.json in the temp app
cat temp-cdp-app/package.json

# Copy the CDP dependencies to your frontend/package.json
```

Then update `frontend/package.json` with the exact versions from the template.

## Solution 2: Install Packages Directly

Try installing without version constraints first:

```bash
cd CVMongoDBHackathon/frontend
npm install @coinbase/cdp-react @coinbase/cdp-hooks --save
```

If that doesn't work, the packages might need to be installed from a different source or might not be publicly available yet.

## Solution 3: Alternative Setup

If the CDP packages aren't available, you can:

1. **Use the CDP Web SDK directly** (JavaScript/TypeScript without React wrappers)
2. **Wait for package publication** - The React packages might be in beta or private release
3. **Use the starter template** and adapt your code to work with it

## Temporary Workaround

If you need to proceed without CDP packages for now, you can:

1. Comment out CDP imports in your components
2. Create mock implementations for development
3. Install the packages later when they're available

Let me know which approach you'd like to take!
