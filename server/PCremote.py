import argparse
import socket
import json
import binascii
import time



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
            print("Connection request received from", addr)
            try:
                confirmation = input("Do you want to accept the connection to " + str(addr) + " (s/n)? ")
                if confirmation.lower() != 's':
                    print("Connection rejected.")
                    continue
                else:
                    print("Connection accepted.")
                    reply = b"PC_HERE"
                    s.sendto(reply, addr)
                    print("Replied with PC_HERE to", addr)
                s.close()
                return
            except Exception as e:
                print("Failed to send reply:", e)



def awaitControlRequests(bind: str = "0.0.0.0", port: int = 41234):

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

    # waiting for control requests
    print("Awaiting control requests...")
    while True:
        # getting data from client
        data = conn.recv(65535)
        if not data: 
            print("Client disconnected or failed to retrieve data.")
            conn.close()
            s.close()
            break
        ts = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{ts}] {addr[0]}:{addr[1]} -> {len(data)} bytes")
        # Trying to decode as UTF-8 and handling control request
        text = None
        try:
            text = data.decode("utf-8")
        except Exception:
            pass
        if text:
            print("Control request received:", text)
            controlRequestHandler(text)



def controlRequestHandler(request: str):
    print("Handling control request:", request)
    pass



def main():
    print("PC Remote")
    print("Starting server...\n")
    awaitBroadcast()
    awaitControlRequests()

if __name__ == "__main__":
    main()
