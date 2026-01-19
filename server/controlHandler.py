import os
import time
import win32clipboard
import pyautogui
from socket import socket



ACCENTS = set('áàäâãåéèëêíìïîóòöôõúùüûçñÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÇÑ')
SPECIAL_CHARACTHERS = set('~!@#$%^&*()_+{}|:"<>?`-=[]\\;\',./" ')

MOUSE_SPEED_FACTOR = 0.5
pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0



# Returns 1 if should stop listening for control requests, 0 otherwise
def handleControlRequest(request: str, conn, s) -> int:

    # Checking if control request is valid
    if(request.startswith("COMMAND:") == False): return 0
    print("Handling control request:", request)

    # Handling end of communication requests
    if(request == "COMMAND:DISCONNECT"):
        endComunication(conn, s)
        return 1
    if(request == "COMMAND:POWER_TOGGLE"):
        handleShutdownRequest(conn, s)
        return 1

    # Handling keypress requests
    if(request == "COMMAND:KEYPRESS_ENTER"):
        pyautogui.press("enter")
        return 0
    if(request == "COMMAND:KEYPRESS_BACKSPACE"):
        pyautogui.press("backspace")
        return 0
    if(request.startswith("COMMAND:KEYPRESS<") and request.endswith(">")):
        handleKeypressRequest(request[len("COMMAND:KEYPRESS<"):-1])
        return 0

    # Handling mouse requests
    if(request.startswith("COMMAND:MOUSE_MOVE<") and request.endswith(">")):
        cordinates = request[len("COMMAND:MOUSE_MOVE<"):-1].split(",")
        if(len(cordinates) != 2): return 0
        handleMouseMoveRequest(float(cordinates[0]), float(cordinates[1]))
        return 0
    if(request.startswith("COMMAND:MOUSE_CLICK<") and request.endswith(">")):
        pyautogui.click()
        return 0

    return 0



# Ends the comunication by sending END_CONNECTION message and closing sockets
def endComunication(conn, s):
    conn.sendall(b"END_CONNECTION")
    conn.close()
    s.close()
    pass


def handleShutdownRequest(conn, s):
    endComunication(conn, s)
    os.system("shutdown /s /t 0")



# Handles keypress requests, including special characters via clipboard
def handleKeypressRequest(keys: str):

    # checking if there are special characters that pyautogui cannot type directly or accents that may not be typed correctly
    if any((c in SPECIAL_CHARACTHERS) for c in keys) or any((c in ACCENTS) for c in keys):
        win32clipboard.OpenClipboard()
        win32clipboard.EmptyClipboard()
        win32clipboard.SetClipboardText(keys)
        win32clipboard.CloseClipboard()
        time.sleep(0.05)
        # copy-pasting via clipboard to support special characters
        pyautogui.hotkey("ctrl", "v") 

    # typing normally otherwise
    else:
        pyautogui.typewrite(keys)



def handleMouseMoveRequest(delta_x: float, delta_y: float):
    pyautogui.moveRel(delta_x * MOUSE_SPEED_FACTOR, delta_y * MOUSE_SPEED_FACTOR, duration=0)