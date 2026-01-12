import CryptoJS from 'crypto-js';

function hmacSha256(key, data) {
	return CryptoJS.HmacSHA256(data, key);
}

function hkdf(masterKey, info) {
	const salt = CryptoJS.enc.Utf8.parse("PCREMOTE_SALT");
	const infoBytes = CryptoJS.enc.Utf8.parse(info);
	const hashLen = 32;
	// Extract
	const prk = hmacSha256(salt, masterKey);
	// Expand (1 bloco é suficiente p/ 32 bytes)
	const t = hmacSha256(
		prk,
		infoBytes.concat(CryptoJS.lib.WordArray.create([1 << 24], 1))
	);
	t.sigBytes = 32;
	return t;
}

// Derives encryption and HMAC keys from the master key using HKDF
// Returns an object with 'encryption_key' and 'hmac_key' in hex format
export function deriveKeys(master_key_hex) {
	const master_key = CryptoJS.enc.Hex.parse(master_key_hex);
	const encryption_key = hkdf(master_key, "encryption");
	const hmac_key = hkdf(master_key, "hmac");
	return {
		encryption_key: encryption_key.toString(CryptoJS.enc.Hex),
		hmac_key: hmac_key.toString(CryptoJS.enc.Hex),
	};
}