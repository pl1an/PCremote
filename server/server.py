import socket
import time
import os
import qrcode
import secrets

from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend

from safeParser import receiveSecureMessage, InvalidMessage



# awaits for udp broadcast from client and replies if correct message is received
def awaitBroadcast(bind: str = "0.0.0.0", port: int = 41234):

    # creating and binding udp socket to await for broadcasts
    print("Setting up UDP socket...")
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    except Exception:
        pass
    s.bind((bind, port))

    # waiting for broadcasts
    print(f"Listening for UDP broadcast on {bind}:{port}")
    print("Awaiting client connection...\n")
    while True:
        data, addr = s.recvfrom(65535)
        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{ts}] {addr[0]}:{addr[1]} -> {len(data)} bytes")

        # Trying to decode as UTF-8
        text = None
        try:
            text = data.decode("utf-8")
        except Exception:
            pass
        # Looking for correct broadcast message
        if text == "DISCOVER_PC":
            try:
                print("Connection request received from", addr)
                s.sendto(b"PC_HERE", addr)
                s.close()
            except Exception as e:
                print("Failed to send reply:", e)
            return



# establishes tcp control socket and awaits for client connection
# returns tuple with (listening_socket, connection_socket)
def connectControlSocket(bind: str = "0.0.0.0", port: int = 41234) -> tuple[socket.socket, socket.socket]:

    # creating and binding tcp socket to await for control requests 
    print("\nSetting up TCP socket...")
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((bind, port))

    # waiting for client connection
    print(f"Awaiting for client connection on {bind}:{port}...")
    s.listen(1)
    conn, addr = s.accept()
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {addr[0]}:{addr[1]} connected\n")

    # verifying client connection
    conn.sendall(b"CONFIRMED_CONNECTION")
    return conn, s



# generates random master key
def generateMasterKey(key_length: int = 16) -> tuple[str, str]:
    print("Generating master kes...")
    master_key = secrets.token_bytes(key_length).hex()
    print("Master key generated:", master_key)
    return master_key

# generates QR code for encryption key
def generateEncryptionKeyQRCode(key: str, filename: str = "encryption_key_qr.png"):
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


# awaits for encryption key exchange confirmation from client
# returns tuple with (master_key, encryption_key, hmac_key) or None if failed
def awaitEncryptionKeyExchange(conn: socket.socket, s: socket.socket) -> None | tuple[str, str, str]:

    # generating encryption key and its QR code
    master_key = generateMasterKey(32) 
    encryption_key, hmac_key = deriveKeys(master_key, 32)
    generateEncryptionKeyQRCode(master_key)

    # awaiting for client confirmation
    print("\nAwaiting for client authentication...")
    while True:
        data = conn.recv(65535)
        if not data: 
            print("Client disconnected or failed to retrieve data.")
            conn.close()
            s.close()
            return
        # Receiving and processing secure message
        try:
            text = receiveSecureMessage(data.decode("utf-8"), encryption_key, hmac_key)
            if text == "MASTER_KEY_RECEIVED":
                conn.sendall(b"CLIENT_AUTHENTICATED")
                print("Client authenticated successfully.\n")
                return master_key, encryption_key, hmac_key
            else:
                raise InvalidMessage("Unexpected confirmation message")
        except InvalidMessage as e:
            print("Received invalid authentication message: ", e)
            print("Client may not have received the master key correctly.")
            print("WARNING: Network might be compromised\n")
            endComunication(conn, s)
            return None



# awaits for control requests from client
def awaitControlRequests(
    conn: socket.socket, s: socket.socket, 
    encryption_key: str, hmac_key: str,
    bind: str = "0.0.0.0", port: int = 41234
):
    # waiting for control requests
    print("Awaiting control requests...\n")
    while True:
        # getting data from client
        data = conn.recv(65535)
        if not data: 
            print("Client disconnected or failed to retrieve data.")
            conn.close()
            s.close()
            break
        # Trying to decode as UTF-8 and handling control request
        text = None
        try:
            text = receiveSecureMessage(data.decode("utf-8"), encryption_key, hmac_key)
            if not text: raise InvalidMessage("Empty control request")
            if controlRequestHandler(text, conn, s): break
        except InvalidMessage as e:
            print("Received invalid control message: ", e)



# Returns 1 if should stop listening for control requests, 0 otherwise
def controlRequestHandler(request: str, conn: socket.socket, s: socket.socket) -> int:
    # Checking if control request is valid
    if(request.startswith("COMMAND:") == False): return 0
    # Handling control requests
    print("Handling control request:", request)
    if(request == "COMMAND:DISCONNECT"):
        print("End connection request received.")
        endComunication(conn, s)
        return 1
    if(request == "COMMAND:POWER_TOGGLE"):
        print("Power toggle request received.")
        endComunication(conn, s)
        os.system("shutdown /s /t 0")
        return 1
    pass



def endComunication(conn: socket.socket, s: socket.socket):
    conn.sendall(b"END_CONNECTION")
    conn.close()
    s.close()
    print("Ending connection...")
    pass


def main():
    print("PC Remote")
    print("Starting server\n")
    # connecting to client
    awaitBroadcast()
    conn, s = connectControlSocket()
    # sharing encryption key
    master_key, encryption_key, hmac_key = awaitEncryptionKeyExchange(conn, s)
    # handling control requests
    if(master_key and encryption_key and hmac_key):
        awaitControlRequests(conn, s, encryption_key, hmac_key)

if __name__ == "__main__":
    main()
