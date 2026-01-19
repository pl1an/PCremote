import socket
import time

from securityMaster import receiveSecureMessage, generateMasterKey, deriveKeys, generateEncryptionKeyQRCode, InvalidMessage
from controlHandler import handleControlRequest, endComunication



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
def awaitTcpConnection(bind: str = "0.0.0.0", port: int = 41234) -> tuple[socket.socket, socket.socket]:

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
    awaiting_control_requests = True
    while awaiting_control_requests:
        # getting data from client
        data = conn.recv(65535)
        if not data: 
            print("Client disconnected or failed to retrieve data.")
            conn.close()
            s.close()
            break
        try:
            buffer = ""
            buffer += data.decode("utf-8")
            while "\n" in buffer:
                packet, buffer = buffer.split("\n", 1) 
                text = receiveSecureMessage(packet, encryption_key, hmac_key)
                if not text: raise InvalidMessage("Empty control request")
                if handleControlRequest(text, conn, s): awaiting_control_requests = False
        except Exception as e:
            print("Received invalid control message: " +  str(e))



def main():
    # starting server
    print("PC Remote")
    print("Starting server\n")
    # connecting to client
    awaitBroadcast()
    conn, s = awaitTcpConnection()
    # sharing encryption key
    master_key, encryption_key, hmac_key = awaitEncryptionKeyExchange(conn, s)
    # handling control requests
    if(master_key and encryption_key and hmac_key):
        awaitControlRequests(conn, s, encryption_key, hmac_key)

if __name__ == "__main__":
    main()
