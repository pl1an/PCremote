import secrets
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import hashes, padding
from cryptography.hazmat.backends import default_backend
import hmac
import hashlib

import qrcode


class InvalidMessage(Exception):
    pass



# generates random master key
def generateMasterKey(key_length: int = 16) -> str:
    print("Generating master kes...")
    master_key = secrets.token_bytes(key_length).hex()
    print("Master key generated:", master_key)
    return master_key


# generates QR code for encryption key
def generateEncryptionKeyQRCode(key: str):
    print("Generating QR code for master key...")
    print("Scan this QR code with your mobile device to share the master key.\n")
    qr = qrcode.QRCode(
        version=None, 
        border=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
    )
    qr.add_data(key)
    qr.make(fit=True)
    qr.print_tty()


# derives both encryption and hmac keys from master key using HKDF
# returns tuple with (encryption_key, hmac_key)
def deriveKeys(master_key_hex: str, key_lenght: int) -> tuple[str, str]:
    master_key = bytes.fromhex(master_key_hex)
    encryption_hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=key_lenght,
        salt=b"PCREMOTE_SALT",
        info=b"encryption",
        backend=default_backend()
    )
    hmac_hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=key_lenght,
        salt=b"PCREMOTE_SALT",
        info=b"hmac",
        backend=default_backend()
    )
    encryption_key = encryption_hkdf.derive(master_key).hex()
    print("Encryption key derived: ", encryption_key)
    hmac_key = hmac_hkdf.derive(master_key).hex()
    print("HMAC key derived: ", hmac_key, "\n")
    return encryption_key, hmac_key



# extract IV, ciphertext and HMAC from message string
def parseMessage(packet: str) -> tuple[str, str, str]:
    try:
        parsed_packet = packet.strip().split("|")
        if len(parsed_packet) < 3: raise InvalidMessage("Incorrect number of fields in packet")
        return tuple(parsed_packet[:3])
    except Exception as e:
        raise InvalidMessage("Malformed packet: " + str(e))


# verify HMAC-SHA256(iv || ciphertext)
def verifyHmac(iv_hex, ciphertext_hex, hmac_hex, hmac_key_hex):
    try:
        mac_input = bytes.fromhex(iv_hex + ciphertext_hex)
        expected_mac = hmac.new(
            bytes.fromhex(hmac_key_hex),
            mac_input,
            hashlib.sha256
        ).digest()
        received_mac = bytes.fromhex(hmac_hex)
        # constant-time comparison
        if not hmac.compare_digest(expected_mac, received_mac):
            raise InvalidMessage("Invalid HMAC")
    except Exception as e:
        raise InvalidMessage("HMAC verification failed: " + str(e))


# AES-256-CBC + PKCS7 unpadding
def decryptMessage(ciphertext_hex, iv_hex, encryption_key_hex):
    cipher = Cipher(
        algorithms.AES(bytes.fromhex(encryption_key_hex)),
        modes.CBC(bytes.fromhex(iv_hex)),
        backend=default_backend()
    )
    decryptor = cipher.decryptor()
    padded_plaintext = decryptor.update(bytes.fromhex(ciphertext_hex)) + decryptor.finalize()
    # PKCS7 unpadding (128-bit block size)
    unpadder = padding.PKCS7(128).unpadder()
    plaintext = unpadder.update(padded_plaintext) + unpadder.finalize()
    return plaintext.decode("utf-8")


# full secure receive pipeline: parse, verify HMAC, decrypt
def receiveSecureMessage(packet: str, encryption_key_hex: str, hmac_key_hex: str) -> str:
    iv_hex, ciphertext_hex, hmac_hex = parseMessage(packet)
    verifyHmac(iv_hex, ciphertext_hex, hmac_hex, hmac_key_hex)
    return decryptMessage(ciphertext_hex, iv_hex, encryption_key_hex)