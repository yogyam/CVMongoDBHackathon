# CDP Package Installation

The Coinbase CDP packages (`@coinbase/cdp-react` and `@coinbase/cdp-hooks`) need to be installed separately.

## Option 1: Try Direct Installation

```bash
npm install @coinbase/cdp-react @coinbase/cdp-hooks --save
```

If this works, great! If not, try Option 2.

## Option 2: Use CDP Starter Template

1. Create a CDP app to get the correct packages:

   ```bash
   npm create @coinbase/cdp-app@latest cdp-template
   cd cdp-template
   ```

2. Check `package.json` for the exact package names/versions:

   ```bash
   cat package.json
   ```

3. Copy the CDP dependencies to your `frontend/package.json`

4. Run `npm install` in your frontend directory

## Option 3: Check Available Packages

```bash
npm search @coinbase
```

This will show all available Coinbase packages. The CDP packages might have different names.

## After Installing

Once the packages are installed, uncomment the imports in:

- `src/components/Providers.tsx`
- `src/components/ClientApp.tsx`
- `src/components/SignInScreen.tsx`
- `src/components/RegisterScreen.tsx`

And make sure to import the correct hooks from the packages.
