import CryptoJS from 'crypto-js';
import * as Random from 'expo-random';


// Encrypts plaintext using AES-256-CBC
const encryptMessage = (message, encryption_key_hex) => {
    const key = CryptoJS.enc.Hex.parse(encryption_key_hex);
    // 128 bit IV
    const ivBytes = Random.getRandomBytes(16); 
    const iv = CryptoJS.lib.WordArray.create(ivBytes);
    const encrypted = CryptoJS.AES.encrypt(
        message,
        key,
        {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }
    );

    return {
        iv_hex: iv.toString(CryptoJS.enc.Hex),
        ciphertext_hex: encrypted.ciphertext.toString(CryptoJS.enc.Hex)
    };
};

// Builds and encrypts a message with HMAC authentication
const buildMessage = (
    message,
    encryption_key_hex,
    hmac_key_hex
) => {
    const { iv_hex, ciphertext_hex } = encryptMessage(
        message,
        encryption_key_hex
    );
    const hmac_key = CryptoJS.enc.Hex.parse(hmac_key_hex);
    const mac_input = CryptoJS.enc.Hex.parse(iv_hex + ciphertext_hex);

    const hmac = CryptoJS.HmacSHA256(mac_input, hmac_key).toString(CryptoJS.enc.Hex);
    return `${iv_hex}|${ciphertext_hex}|${hmac}`;
};


export { encryptMessage, buildMessage };
