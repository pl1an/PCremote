import cryptoJS from "crypto-js";


export class InvalidMessage extends Error {
    constructor(message) {
        super(message);
        this.name = "InvalidMessage";
    }
}


export function parseMessage(packet) {
    try{
        const parsed = packet.trim().split("|");
        if (parsed.length < 3) {
            throw new InvalidMessage("Incorrect number of fields in packet");
        }
        return parsed.slice(0, 3);
    } 
    catch (e){
        throw new InvalidMessage("Malformed packet: " + e.message);
    }
}


export function verifyHmac(ivHex, ciphertextHex, hmacHex, hmacKeyHex) {
    try{
        const macInput = cryptoJS.enc.Hex.parse(ivHex + ciphertextHex);
        const key = cryptoJS.enc.Hex.parse(hmacKeyHex);
        const expectedMac = cryptoJS.HmacSHA256(macInput, key).toString(cryptoJS.enc.Hex);
        // constant-time comparison
        if (expectedMac.length !== hmacHex.length || !cryptoJS.enc.Hex.parse(expectedMac).words.every((w, i) => w === cryptoJS.enc.Hex.parse(hmacHex).words[i])) {
            throw new InvalidMessage("Invalid HMAC");
        }
    } 
    catch (e) {
        if (e instanceof InvalidMessage) throw e;
        throw new InvalidMessage("HMAC verification failed: " + e.message);
    }
}


export function decryptMessage(ciphertextHex, ivHex, encryptionKeyHex) {
    const key = cryptoJS.enc.Hex.parse(encryptionKeyHex);
    const iv = cryptoJS.enc.Hex.parse(ivHex);
    const ciphertext = cryptoJS.enc.Hex.parse(ciphertextHex);
    // AES-256-CBC decryption with PKCS7 padding
    const decrypted = cryptoJS.AES.decrypt(
        { ciphertext: ciphertext },
        key,
        {
            iv: iv,
            mode: cryptoJS.mode.CBC,
            padding: cryptoJS.pad.Pkcs7
        }
    );
    return decrypted.toString(cryptoJS.enc.Utf8);
}


export function receiveSecureMessage( packet, encryptionKeyHex, hmacKeyHex){
    const [ivHex, ciphertextHex, hmacHex] = parseMessage(packet);
    verifyHmac(ivHex, ciphertextHex, hmacHex, hmacKeyHex);
    return decryptMessage(ciphertextHex, ivHex, encryptionKeyHex);
}
