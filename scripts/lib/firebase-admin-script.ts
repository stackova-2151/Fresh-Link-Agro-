/**
 * Firebase Admin SDK initialization for scripts.
 * 
 * This utility provides a unified way to initialize Firebase Admin for scripts
 * that can use either:
 * 1. A service account JSON file (via FIREBASE_SERVICE_ACCOUNT_PATH)
 * 2. Environment variables (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY)
 * 
 * Priority: Service account file path takes precedence if provided.
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Initialize Firebase Admin SDK for scripts.
 * 
 * @returns Firestore Admin instance
 * @throws Error if Firebase credentials are not configured
 */
export function getScriptFirestore(): Firestore {
  const existing = getApps();
  if (existing.length > 0) {
    console.log('Firebase Admin already initialized');
    return getFirestore(existing[0]);
  }

  // Priority 1: Use service account file path if provided
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  
  if (serviceAccountPath) {
    console.log(`Initializing Firebase Admin using service account file: ${serviceAccountPath}`);
    
    // Resolve the path relative to the script execution directory
    const resolvedPath = path.resolve(process.cwd(), serviceAccountPath);
    
    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        `Firebase service account file not found at: ${resolvedPath}\n` +
        `Current working directory: ${process.cwd()}\n` +
        `Resolved path: ${resolvedPath}`
      );
    }
    
    try {
      const serviceAccount = require(resolvedPath);
      const app = initializeApp({
        credential: cert(serviceAccount),
      });
      console.log(`Firebase Admin initialized successfully`);
      console.log(`Connected to project: ${serviceAccount.project_id}`);
      return getFirestore(app);
    } catch (error) {
      throw new Error(
        `Failed to load Firebase service account from ${resolvedPath}\n` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  // Priority 2: Use environment variables (existing setup)
  console.log('Initializing Firebase Admin using environment variables');
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin SDK not configured. Please set one of the following:\n' +
      '\n' +
      'Option 1: Service account file\n' +
      '  FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json\n' +
      '\n' +
      'Option 2: Environment variables\n' +
      '  FIREBASE_ADMIN_PROJECT_ID\n' +
      '  FIREBASE_ADMIN_CLIENT_EMAIL\n' +
      '  FIREBASE_ADMIN_PRIVATE_KEY\n' +
      '\n' +
      'Current environment variables:\n' +
      `  FIREBASE_SERVICE_ACCOUNT_PATH: ${serviceAccountPath || 'not set'}\n` +
      `  FIREBASE_ADMIN_PROJECT_ID: ${projectId || 'not set'}\n` +
      `  FIREBASE_ADMIN_CLIENT_EMAIL: ${clientEmail || 'not set'}\n` +
      `  FIREBASE_ADMIN_PRIVATE_KEY: ${privateKey ? 'set (hidden)' : 'not set'}`
    );
  }

  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  console.log(`Firebase Admin initialized successfully`);
  console.log(`Connected to project: ${projectId}`);
  return getFirestore(app);
}
