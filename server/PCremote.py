import socket
import time
import os



connection_accepted = False



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



# returns tuple with (listening_socket, connection_socket)
def connectControlSocket(bind: str = "0.0.0.0", port: int = 41234) -> tuple[socket.socket, socket.socket]:

    # creating and binding tcp socket to await for control requests 
    print("\nSetting up TCP socket...")
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((bind, port))

    # waiting for client connection
    print(f"Awaiting for clinet connection on {bind}:{port}...")
    s.listen(1)
    conn, addr = s.accept()
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {addr[0]}:{addr[1]} connected\n")

    # verifying client connection
    confirmation = input("Do you want to accept the connection to " + str(addr) + " (s/n)? ")
    if confirmation.lower() != 's':
        print("Connection rejected.")
        endComunication(conn, s)
        return None, None
    else:
        print("Connection accepted.")
        conn.sendall(b"CONFIRMED_CONNECTION")
        return conn, s


def awaitControlRequests(bind: str = "0.0.0.0", port: int = 41234):
    # waiting for control requests
    conn, s = connectControlSocket(bind, port)
    if not conn or not s: return
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
    print("Starting server...\n")
    awaitBroadcast()
    awaitControlRequests()

if __name__ == "__main__":
    main()
