import hmac
import hashlib
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend


class InvalidMessage(Exception):
    pass


# extract IV, ciphertext and HMAC from message string
def parseMessage(packet: str) -> tuple[str, str, str]:
    try:
        return tuple(packet.strip().split("|"))
    except Exception:
        raise InvalidMessage("Malformed packet")


# verify HMAC-SHA256(iv || ciphertext)
def verifyHmac(iv_hex, ciphertext_hex, hmac_hex, hmac_key_hex):
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