import socket
import time
import os
import qrcode
import secrets



connection_accepted = False



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



# generates random encryption key
def generateEncryptionKey(key_length: int = 16) -> str:
    print("Generating encryption key...")
    encryption_key = secrets.token_bytes(key_length).hex()
    print("Encryption key generated:", encryption_key)
    return encryption_key

# generates QR code for encryption key
def generateEncryptionKeyQRCode(key: str, filename: str = "encryption_key_qr.png"):
    print("\nGenerating QR code for encryption key...")
    print("Scan this QR code with your mobile device to share the encryption key.\n")
    qr = qrcode.QRCode(
        version=None, 
        border=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
    )
    qr.add_data(key)
    qr.make(fit=True)
    qr.print_tty()


def awaitEncryptionKeyExchange(conn: socket.socket, s: socket.socket):

    # generating encryption key and its QR code
    encryption_key = generateEncryptionKey(32) 
    generateEncryptionKeyQRCode(encryption_key)

    # awaiting for client confirmation
    print("\nAwaiting for client confirmation of encryption key receipt...")
    while True:
        data = conn.recv(65535)
        if not data: 
            print("Client disconnected or failed to retrieve data.")
            conn.close()
            s.close()
            return
        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        # Trying to decode as UTF-8 and checking for confirmation message
        text = None
        try:
            text = data.decode("utf-8")
        except Exception:
            pass
        if text == "ENCRYPTION_KEY_RECEIVED":
            print("Client confirmed receipt of encryption key.\n")
            return



# awaits for control requests from client
def awaitControlRequests(conn: socket.socket, s: socket.socket, bind: str = "0.0.0.0", port: int = 41234):
    # waiting for control requests
    print("\nAwaiting control requests...")
    while True:
        # getting data from client
        data = conn.recv(65535)
        if not data: 
            print("Client disconnected or failed to retrieve data.")
            conn.close()
            s.close()
            break
        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        # Trying to decode as UTF-8 and handling control request
        text = None
        try:
            text = data.decode("utf-8")
        except Exception:
            pass
        if text:
            print("Control request received:", text)
            if controlRequestHandler(text, conn, s): break



# Returns 1 if should stop listening for control requests, 0 otherwise
def controlRequestHandler(request: str, conn: socket.socket, s: socket.socket) -> int:
    print("Handling control request:", request)
    if(request == "END_CONNECTION"):
        print("End connection request received.")
        endComunication(conn, s)
        return 1
    if(request == "POWER_TOGGLE"):
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
    awaitEncryptionKeyExchange(conn, s)

    #awaitControlRequests(conn, s)

if __name__ == "__main__":
    main()
