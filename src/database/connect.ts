import dns from 'dns';
import mongoose from 'mongoose';
import { ENV } from '../config/config';

// Ensure standard reliable DNS servers (Google / Cloudflare) are used for SRV lookups,
// resolving querySrv ECONNREFUSED issues on Windows, Termux, and restrictive cloud networks.
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // If setting DNS servers is restricted in certain sandbox environments, continue with defaults
}

/**
 * Sanitizes MongoDB connection URI to protect against common copy-paste and formatting errors:
 * - Trims whitespace and strips surrounding quotes ("...", '...', `...`) or trailing angles (`>`)
 * - Fixes malformed/truncated query parameters like `?r`, `?r>`, `&r`, `&r>` (common when editing retryWrites)
 * - Strips valueless parameters that cause mongodb driver to crash with:
 *   "URI option <X> cannot be specified with no value"
 */
export function sanitizeMongoUri(rawUri: string): string {
  let uri = (rawUri || '').trim().replace(/^['"`<]+|['"`>]+$/g, '').trim();
  if (!uri) return uri;

  // Clean trailing punctuation or brackets
  uri = uri.replace(/[>]+$/g, '').trim();

  if (uri.includes('?')) {
    const [base, queryString] = uri.split('?');
    if (queryString !== undefined) {
      const params = queryString
        .split('&')
        .map((p) => p.replace(/[>]/g, '').trim())
        .filter(Boolean);
      const cleanedParams: string[] = [];
      let hasRetryWrites = params.some((p) => p.startsWith('retryWrites='));

      for (const param of params) {
        const [key, val] = param.split('=');
        if (key === 'r' || key === 'r>') {
          if (!val) {
            if (!hasRetryWrites) {
              cleanedParams.push('retryWrites=true');
              hasRetryWrites = true;
            }
          } else {
            cleanedParams.push(param);
          }
        } else if (key === 'retryWrites' && !val) {
          cleanedParams.push('retryWrites=true');
          hasRetryWrites = true;
        } else if (key && val !== undefined) {
          cleanedParams.push(param);
        } else if (key && val === undefined) {
          console.warn(`[Database] Warning: Dropping empty URI option "${key}" from MONGO_URI`);
        }
      }

      if (!hasRetryWrites) {
        cleanedParams.push('retryWrites=true');
      }
      if (!cleanedParams.some((p) => p.startsWith('w='))) {
        cleanedParams.push('w=majority');
      }

      uri = `${base}?${cleanedParams.join('&')}`;
    }
  }

  return uri;
}

export const connectDatabase = async () => {
  const rawMongoUri = ENV.MONGO_URI?.trim();

  if (!rawMongoUri) {
    console.error('\n[CRITICAL ERROR] Failed to connect to MongoDB!');
    console.error('MONGO_URI is missing from your environment variables.');
    console.error('Please set MONGO_URI in your host environment variables (Render / Railway / .env).\n');
    process.exit(1);
  }

  if (rawMongoUri.includes('<db_password>') || rawMongoUri.includes('<password>')) {
    console.error('\n[CRITICAL ERROR] Failed to connect to MongoDB!');
    console.error('Your MONGO_URI contains an unreplaced password placeholder (<db_password> or <password>).');
    console.error('1. Open MongoDB Atlas -> Database Access -> ensure your database user exists.');
    console.error('2. Replace <db_password> with your actual database user password.');
    console.error('3. If your password contains symbols (@, :, /, ?, #, [, ], %, &), URL-encode it or use an alphanumeric password.\n');
    process.exit(1);
  }

  const mongoUri = sanitizeMongoUri(rawMongoUri);

  try {
    await mongoose.connect(mongoUri, { family: 4 });
    console.log('[Database] MongoDB connected successfully');
  } catch (error: any) {
    console.error('\n[CRITICAL ERROR] Failed to connect to MongoDB!');
    console.error('Error Details:', error.message);

    if (error.message?.includes('cannot be specified with no value') || error.message?.includes('URI option')) {
      console.error('\n--> Diagnosis: Broken URI Query Parameter detected.');
      console.error('Check the end of your MONGO_URI string in Render Environment Variables.');
      console.error('Ensure options look like: ?retryWrites=true&w=majority without stray letters or missing values.');
    } else if (
      error.message?.includes('Password contains unescaped characters') ||
      error.message?.includes('Authentication failed') ||
      error.message?.includes('bad auth')
    ) {
      console.error('\n--> Diagnosis: MongoDB Authentication / Password Issue.');
      console.error('1. Make sure your database username and password in MONGO_URI match MongoDB Atlas Database Access.');
      console.error('2. If your password has special characters like "@" or "&", MongoDB driver fails.');
      console.error('   Recommendation: Go to MongoDB Atlas -> Database Access -> Edit User, and set a simple strong alphanumeric password (e.g. SyncInkVoice2026).');
    } else if (
      error.message?.includes('querySrv ETIMEOUT') ||
      error.message?.includes('querySrv ENOTFOUND') ||
      error.message?.includes('whitelist') ||
      error.message?.includes('IP')
    ) {
      console.error('\n--> Diagnosis: Network Access / IP Whitelist Block.');
      console.error('Render / Railway servers use dynamic IPs. You must whitelist all IPs in MongoDB Atlas:');
      console.error('Go to MongoDB Atlas -> Network Access -> Add IP Address -> Select "Allow Access from Anywhere" (0.0.0.0/0) -> Confirm.');
    }

    console.error('\nIf you are hosting on Render or Railway, ensure MONGO_URI is set properly in your Environment Variables tab.\n');
    process.exit(1);
  }
};

