import socket
import time
from securityMaster import receiveSecureMessage, generateMasterKey, deriveKeys, generateEncryptionKeyQRCode, InvalidMessage, buildMessage
from controlHandler import handleControlRequest, endCommunication



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
def awaitTcpConnection(bind: str = "0.0.0.0", port: int = 41235) -> tuple[socket.socket, socket.socket]:

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


# creates master key, derives encryption and hmac keys, generates QR code for master key
# returns tuple with (master_key, encryption_key, hmac_key)
def createMasterKey() -> tuple[str, str, str]:
    # generating encryption key and its QR code
    master_key = generateMasterKey(32) 
    encryption_key, hmac_key = deriveKeys(master_key, 32)
    generateEncryptionKeyQRCode(master_key)
    # confirming that client received the master key
    return master_key, encryption_key, hmac_key

# awaits for encryption key exchange confirmation from client
# Returns true if client authenticated successfully, false otherwise
def awaitMasterKeyExchange(conn: socket.socket, s: socket.socket, encryption_key: str, hmac_key: str) -> bool:
    print("\nAwaiting for client authentication...")
    while True:
        data = conn.recv(65535)
        if not data: 
            print("Client disconnected or failed to retrieve data.")
            conn.close()
            s.close()
            return False 
        # Receiving and processing secure message
        try:
            text = receiveSecureMessage(data.decode("utf-8"), encryption_key, hmac_key)
            if text == "MASTER_KEY_RECEIVED":
                authentication_message = buildMessage("CLIENT_AUTHENTICATED", encryption_key, hmac_key)
                conn.sendall(authentication_message.encode("utf-8"))
                print("Client authenticated successfully.\n")
                return True
            else:
                raise InvalidMessage("Unexpected confirmation message")
        except InvalidMessage as e:
            print("Received invalid authentication message: ", e)
            print("Client may not have received the master key correctly.")
            print("WARNING: Network might be compromised\n")
            endCommunication(conn, s)
            return False


# awaits for control requests from client
def awaitControlRequests(
    conn: socket.socket, s: socket.socket, 
    encryption_key: str, hmac_key: str,
    bind: str = "0.0.0.0",
):
    # waiting for control requests
    print("Awaiting control requests...\n")
    awaiting_control_requests = True
    while awaiting_control_requests:
        # getting data from client
        data = conn.recv(65535)
        if not data: 
            print("\nClient seems to have disconnected. Awaiting reconnection...")
            raise ConnectionError("Client disconnected")
        try:
            buffer = ""
            buffer += data.decode("utf-8")
            while "\n" in buffer:
                packet, buffer = buffer.split("\n", 1) 
                text = receiveSecureMessage(packet, encryption_key, hmac_key)
                if not text: raise InvalidMessage("Empty control request")
                # sending acknowledgment
                conn.sendall(buildMessage("ACK:" + text, encryption_key, hmac_key).encode("utf-8"))
                # handling control request
                if handleControlRequest(text, conn, s): awaiting_control_requests = False
        except Exception as e:
            print("Received invalid control message: " +  str(e))



def main():
    # starting server
    print("PC Remote")
    print("Starting server\n")
    # finding client via udp broadcast
    awaitBroadcast()
    # creating master key, deriving encryption and hmac keys, generating qr code
    master_key, encryption_key, hmac_key = createMasterKey()
    # handling control requests
    while True:
        conn, s = awaitTcpConnection()
        # sharing encryption key
        if not awaitMasterKeyExchange(conn, s, encryption_key, hmac_key):
            print("Failed to authenticate client. Restart the server to try again.")
            return 1
        # awaiting control requests
        try:
            awaitControlRequests(conn, s, encryption_key, hmac_key)
            break
        except ConnectionError:
            continue

if __name__ == "__main__":
    main()
