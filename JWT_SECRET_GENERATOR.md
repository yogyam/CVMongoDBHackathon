# How to Generate JWT Secret

The JWT secret is used to sign and verify authentication tokens. It should be a long, random, secure string.

## Quick Method (Node.js)

Run this command in your terminal:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

This will generate a 128-character hexadecimal string (64 bytes = 128 hex characters).

**Example output:**
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

## Alternative Methods

### Method 2: Using OpenSSL

```bash
openssl rand -hex 64
```

### Method 3: Using Python

```bash
python3 -c "import secrets; print(secrets.token_hex(64))"
```

### Method 4: Using Online Generator (Development Only)

⚠️ **Warning**: Only use for development, never for production!

Go to: https://generate-secret.vercel.app/64

## Adding to Backend .env File

1. Generate the secret using one of the methods above
2. Copy the entire output
3. Add it to your `backend/.env` file:

```env
JWT_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

## Important Notes

- **Keep it secret**: Never commit the JWT secret to git (`.env` should be in `.gitignore`)
- **Length**: Use at least 32 bytes (64 hex characters) for security
- **Uniqueness**: Generate a new secret for each environment (dev, staging, production)
- **Never share**: Don't share the same JWT secret across different projects

## Quick Setup Command

```bash
# Generate and save directly to .env file (add other variables manually)
cd CVMongoDBHackathon/backend
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")" >> .env
```

Then edit `.env` to add your other variables (MONGODB_URI, etc.)
