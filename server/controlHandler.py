import math
import os
import time
import threading
import win32clipboard
import pyautogui
from socket import socket



ACCENTS = set('áàäâãåéèëêíìïîóòöôõúùüûçñÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÇÑ')
SPECIAL_CHARACTHERS = set('~!@#$%^&*()_+{}|:"<>?`-=[]\\;\',./" ')


pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0

MOUSE_SPEED_FACTOR = 1.5
MOUSE_SMOOTHING_FACTOR = 0.15
MOUSE_SMOOTH_DECAY_FACTOR = 0.3

BASE_MOUSE_ACCELERATION_FACTOR = 1.0
MAXIMUM_MOUSE_ACCELERATION_FACTOR = 1.5
MOUSE_ACCELERATION_SENSITIVITY = 0.015

MOUSE_MICRO_STEPS = 2
FLUSH_MOUSE_DELTA_FREQUENCY = 1 / 60

BASE_PLUS_ZOOM_SCALE_LIMIT = 1.0
PLUS_ZOOM_DELTA_LIMIT = 0.5
BASE_MINUS_ZOOM_SCALE_LIMIT = 0.8
MINUS_ZOOM_DELTA_LIMIT = 0.2



# Returns 1 if should stop listening for control requests, 0 otherwise
def handleControlRequest(request: str, conn, s) -> int:

    # Checking if control request is valid
    if(request.startswith("COMMAND:") == False): return 0
    print("Handling control request:", request)

    # Handling end of communication requests
    if(request == "COMMAND:DISCONNECT"):
        endCommunication(conn, s)
        return 1
    if(request == "COMMAND:SHUTDOWN"):
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
    if(request == "COMMAND:MOUSE_CLICK"):
        pyautogui.click()
        return 0
    if(request.startswith("COMMAND:MOUSE_SCROLL<") and request.endswith(">")):
        cordinates = request[len("COMMAND:MOUSE_SCROLL<"):-1].split(",")
        if(len(cordinates) != 2): return 0
        handleMouseScrollRequest(int(float(cordinates[0])), int(float(cordinates[1])))
        return 0
    if(request.startswith("COMMAND:MOUSE_PINCH<") and request.endswith(">")):
        handleMousePinchRequest(float(request[len("COMMAND:MOUSE_PINCH<"):-1]))
        return 0
    
    # Handling media requests
    if(request == "COMMAND:VOLUME_UP"):
        pyautogui.press("volumeup")
        return 0
    if(request == "COMMAND:VOLUME_DOWN"):
        pyautogui.press("volumedown")
        return 0

    return 0



# Ends the communication by sending END_CONNECTION message and closing sockets
def endCommunication(conn, s):
    conn.close()
    s.close()
    pass


def handleShutdownRequest(conn, s):
    endCommunication(conn, s)
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



accumulated_mouse_delta_x = 0.0
accumulated_mouse_delta_y = 0.0
last_delta_x = 0.0
last_delta_y = 0.0

mouse_thread_lock = threading.Lock()

def dynamicMouseAcceleration(delta_x: float, delta_y: float) -> tuple[float, float]:
    distance = math.hypot(delta_x, delta_y)
    acceleration_factor = min(
        MAXIMUM_MOUSE_ACCELERATION_FACTOR, 
        BASE_MOUSE_ACCELERATION_FACTOR + (distance * MOUSE_ACCELERATION_SENSITIVITY)
    )
    return delta_x * acceleration_factor, delta_y * acceleration_factor

def smoothMouseDelta(delta_x: float, delta_y: float):
    global last_delta_x, last_delta_y
    last_delta_x = (MOUSE_SMOOTHING_FACTOR * delta_x) + ((1 - MOUSE_SMOOTHING_FACTOR) * last_delta_x)
    last_delta_y = (MOUSE_SMOOTHING_FACTOR * delta_y) + ((1 - MOUSE_SMOOTHING_FACTOR) * last_delta_y)
    return last_delta_x, last_delta_y

def handleMouseMoveRequest(delta_x: float, delta_y: float):
    global accumulated_mouse_delta_x, accumulated_mouse_delta_y, last_delta_x, last_delta_y
    with mouse_thread_lock:
        accumulated_mouse_delta_x += delta_x * MOUSE_SPEED_FACTOR 
        accumulated_mouse_delta_y += delta_y * MOUSE_SPEED_FACTOR

def flushMouseDelta():
    global accumulated_mouse_delta_x, accumulated_mouse_delta_y, last_delta_x, last_delta_y

    with mouse_thread_lock:
        delta_x = accumulated_mouse_delta_x
        delta_y = accumulated_mouse_delta_y
        accumulated_mouse_delta_x = 0.0
        accumulated_mouse_delta_y = 0.0

    if delta_x == 0.0 and delta_y == 0.0:
        last_delta_x = last_delta_x * MOUSE_SMOOTH_DECAY_FACTOR
        last_delta_y = last_delta_y * MOUSE_SMOOTH_DECAY_FACTOR
        return

    smoothed_delta_x, smoothed_delta_y = smoothMouseDelta(delta_x, delta_y)
    accelerated_delta_x, accelerated_delta_y = dynamicMouseAcceleration(smoothed_delta_x, smoothed_delta_y)
    step_delta_x = accelerated_delta_x / MOUSE_MICRO_STEPS
    step_delta_y = accelerated_delta_y / MOUSE_MICRO_STEPS
    for _step in range(MOUSE_MICRO_STEPS): pyautogui.moveRel( step_delta_x, step_delta_y, duration=0)

def mouseDeltaFlusherThread():
    while True:
        flushMouseDelta()
        time.sleep(FLUSH_MOUSE_DELTA_FREQUENCY)

mouse_delta_flusher = threading.Thread(target=mouseDeltaFlusherThread, daemon=True)
mouse_delta_flusher.start()


def handleMouseScrollRequest(delta_x: float, delta_y: float):
    if delta_x != 0: pyautogui.hscroll(int(delta_x))
    if delta_y != 0: pyautogui.scroll(int(delta_y))


last_plus_zoom_delta = 0.0
last_minus_zoom_delta = 0.0

def handleMousePinchRequest(scale: float):
    global last_plus_zoom_delta, last_minus_zoom_delta
    # Zooming in
    if scale < last_plus_zoom_delta:
        last_plus_zoom_delta = scale
    if scale > BASE_PLUS_ZOOM_SCALE_LIMIT and abs(scale - last_plus_zoom_delta) >= PLUS_ZOOM_DELTA_LIMIT:
        pyautogui.hotkey("ctrl", "+")
        last_plus_zoom_delta = scale
    # Zooming out
    if scale > last_minus_zoom_delta:
        last_minus_zoom_delta = scale
    elif scale < BASE_MINUS_ZOOM_SCALE_LIMIT and abs(scale - last_minus_zoom_delta) >= MINUS_ZOOM_DELTA_LIMIT:
        pyautogui.hotkey("ctrl", "-")
        last_minus_zoom_delta = scale