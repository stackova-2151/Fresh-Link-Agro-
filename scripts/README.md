# Firebase Admin Scripts Setup

This directory contains scripts that require Firebase Admin SDK access to perform forensic inspections and data repairs on Firestore.

## Prerequisites

1. **Firebase Admin SDK is already installed** (firebase-admin@13.10.0 in package.json)

2. **Firebase Service Account JSON file** - Download from Firebase Console:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file locally (e.g., `firebase-service-account.json`)
   - **IMPORTANT**: Never commit this file to git

## Configuration

The scripts support two authentication methods:

### Option 1: Service Account File (Recommended for local development)

Add to your `.env.local` file:

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

The path is relative to the project root directory.

### Option 2: Environment Variables (Alternative)

If you prefer environment variables instead of a file:

```bash
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Available Scripts

### Integrity Check

Performs a comprehensive forensic inspection of rental item references:

```bash
npx tsx scripts/check-rental-item-integrity.ts
```

**What it checks:**
- Broken references between inward voucher items and rental items
- Orphaned rental items (not referenced by any inward voucher)
- Outward voucher items with broken sourceRentalItemId references
- Specific forensic reports for INW-027 and INW-023
- Classification of each reference (EXACT_LINKED, BROKEN_REFERENCE, LEGACY_RESOLVABLE, etc.)

**Output:**
- Detailed summary statistics
- List of all broken references with possible matches
- INW-027 forensic report
- INW-023 forensic report
- Orphaned rental items
- Broken outward references

**Important:** This script is READ-ONLY. It does not modify any data.

### Repair Script (NOT YET READY)

The repair script exists but should NOT be used until after the integrity check is reviewed:

```bash
npx tsx scripts/repair-rental-item-references.ts --dry-run  # Preview changes
npx tsx scripts/repair-rental-item-references.ts            # Apply changes
```

**DO NOT RUN THIS** until we analyze the integrity check output.

## Security Notes

- The `.env.local` file is already in `.gitignore`
- Service account JSON files are now in `.gitignore` (firebase-service-account.json, *.firebase-service-account.json)
- Never commit credentials to version control
- The shared Firebase Admin utility (`scripts/lib/firebase-admin-script.ts`) is for server-side scripts only
- Do not import this utility in client-side React components

## Troubleshooting

### Error: "Firebase service account file not found"

Check that:
1. The path in `FIREBASE_SERVICE_ACCOUNT_PATH` is correct
2. The path is relative to the project root
3. The JSON file actually exists at that location

### Error: "Firebase Admin SDK not configured"

Check that either:
1. `FIREBASE_SERVICE_ACCOUNT_PATH` is set in `.env.local`, OR
2. All three environment variables are set: `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`

### Error: "Invalid Firebase service account JSON"

The JSON file may be corrupted or not a valid Firebase service account key. Re-download from Firebase Console.
