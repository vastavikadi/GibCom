import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit recommended for GCM
const PREFIX = 'enc:v1:';

function getEncryptionKey(): Buffer {
  const rawKey = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'gibcom-default-organization-key-32b!';
  // Hash the input string with SHA-256 to guarantee a strict 32-byte (256-bit) key
  return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Checks whether a secret string has already been encrypted by this system
 */
export function isEncrypted(value?: string | null): boolean {
  if (!value || typeof value !== 'string') return false;
  return value.startsWith(PREFIX);
}

/**
 * Encrypts a plaintext secret string using AES-256-GCM with a unique IV
 * Output format: enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encryptSecret(plainText?: string | null): string {
  if (!plainText || typeof plainText !== 'string' || !plainText.trim()) {
    return '';
  }

  // Idempotent: don't double encrypt
  if (isEncrypted(plainText)) {
    return plainText;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText.trim(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted secret string.
 * Gracefully returns plaintext if the string was not encrypted (backwards compatibility).
 */
export function decryptSecret(cipherText?: string | null): string {
  if (!cipherText || typeof cipherText !== 'string' || !cipherText.trim()) {
    return '';
  }

  // If not encrypted, return as-is (e.g. legacy stored tokens)
  if (!isEncrypted(cipherText)) {
    return cipherText.trim();
  }

  try {
    const raw = cipherText.slice(PREFIX.length);
    const parts = raw.split(':');
    if (parts.length !== 3) {
      return cipherText;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    // If decryption fails (e.g. key changed), log and return empty to prevent crash
    console.error('Failed to decrypt secret:', err instanceof Error ? err.message : err);
    return '';
  }
}

const COMMON_SECRET_KEYS = ['token', 'botToken', 'apiToken', 'apiKey', 'apiKeyOrToken', 'clientSecret'];

/**
 * Recursively encrypts known secret fields in a connector config object
 */
export function encryptConfigSecrets(
  config: Record<string, any>,
  secretKeys = COMMON_SECRET_KEYS
): Record<string, any> {
  const result = { ...config };
  for (const key of secretKeys) {
    if (result[key] && typeof result[key] === 'string' && !isEncrypted(result[key])) {
      result[key] = encryptSecret(result[key]);
    }
  }
  return result;
}

/**
 * Recursively decrypts known secret fields in a connector config object
 */
export function decryptConfigSecrets(
  config: Record<string, any>,
  secretKeys = COMMON_SECRET_KEYS
): Record<string, any> {
  const result = { ...config };
  for (const key of secretKeys) {
    if (result[key] && typeof result[key] === 'string' && isEncrypted(result[key])) {
      result[key] = decryptSecret(result[key]);
    }
  }
  return result;
}

