import cryptoJS from "crypto-js";

/**
 * Custom error for invalid messages
 */
export class InvalidMessage extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidMessage";
  }
}

/**
 * Extract IV, ciphertext and HMAC from message string
 * Format: iv|ciphertext|hmac
 */
export function parseMessage(packet) {
  try {
    const parsed = packet.trim().split("|");
    if (parsed.length < 3) {
      throw new InvalidMessage("Incorrect number of fields in packet");
    }
    return parsed.slice(0, 3);
  } catch (e) {
    throw new InvalidMessage("Malformed packet: " + e.message);
  }
}

/**
 * Verify HMAC-SHA256(iv || ciphertext)
 */
export function verifyHmac(ivHex, ciphertextHex, hmacHex, hmacKeyHex) {
  try {
    const macInput = Buffer.from(ivHex + ciphertextHex, "hex");
    const key = Buffer.from(hmacKeyHex, "hex");

    const expectedMac = cryptoJS
      .createHmac("sha256", key)
      .update(macInput)
      .digest();

    const receivedMac = Buffer.from(hmacHex, "hex");

    if (
      expectedMac.length !== receivedMac.length ||
      !cryptoJS.timingSafeEqual(expectedMac, receivedMac)
    ) {
      throw new InvalidMessage("Invalid HMAC");
    }
  } catch (e) {
    if (e instanceof InvalidMessage) throw e;
    throw new InvalidMessage("HMAC verification failed: " + e.message);
  }
}

/**
 * AES-256-CBC + PKCS7 unpadding
 */
export function decryptMessage(ciphertextHex, ivHex, encryptionKeyHex) {
  const key = Buffer.from(encryptionKeyHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = cryptoJS.createDecipheriv("aes-256-cbc", key, iv);
  decipher.setAutoPadding(true); // PKCS7

  const plaintext =
    Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

  return plaintext.toString("utf8");
}

/**
 * Full secure receive pipeline:
 * parse → verify HMAC → decrypt
 */
export function receiveSecureMessage(
  packet,
  encryptionKeyHex,
  hmacKeyHex
) {
  const [ivHex, ciphertextHex, hmacHex] = parseMessage(packet);
  verifyHmac(ivHex, ciphertextHex, hmacHex, hmacKeyHex);
  return decryptMessage(ciphertextHex, ivHex, encryptionKeyHex);
}
