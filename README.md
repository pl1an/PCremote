# PCremote — Mobile Remote Controller for PC

PCremote is a mobile remote control application that turns your phone into a wireless mouse and controller for your PC. Built with Expo and React Native, it communicates securely with a Python server running on your computer over your local network.

## Features

- **Wireless Control**: Use your phone as a touchpad/mouse for your PC
- **Auto-Discovery**: Automatically finds your PC via broadcast on the same network
- **Secure Communication**: All messages are HMAC-authenticated and encrypted
- **Easy Setup**: Simple executable for the server, APK download for mobile
- **Cross-Platform**: Works on Windows, with mobile support for Android

## Security

All communication between the mobile app and the server is secured with:
- **HMAC Authentication**: Every message is authenticated to prevent tampering
- **Encryption**: All data transmitted is encrypted in transit

Your connection is protected against unauthorized access and message interception.

## Download

Get the latest release:

**[→ Download Latest Release](https://github.com/pl1an/PCremote/releases)**

Each release includes:
- Server executable for Windows
- APK for Android installation

## Getting Started

### 1. Install the Server

Download the server executable from the [releases page](https://github.com/pl1an/PCremote/releases) and run it on your PC:

```bash
server.exe
```
Or simply double click the executable.
IMPORTANT: Since it's a remote control application, most antiviruses will block it. Remember to create an exception for this executable.

The server will start and listen for connections on your local network.

### 2. Install the Mobile App

Download and install the APK from the [releases page](https://github.com/pl1an/PCremote/releases) on your Android device.

### 3. Connect

1. Make sure both your phone and PC are connected to the same Wi-Fi network
2. Open the PCremote app on your phone
3. Select "Connect trough Broadcast".
4. Scan the QR code displayed on your PC screen to pair your devices.
5. Start controlling your PC!

## Development Setup

If you want to build from source:

### Server (Python)

```bash
cd server
python server.py
```

### Mobile App (Expo)

```bash
npm install
npx expo prebuild --platform android
npx expo run:android
```

This project only works with Expo bare workflow. 
This project does not currently support iOS builds.

## Future Updates

Planned improvements for upcoming releases:

1. **Improve mouse responsiveness** — Better tracking and smoother cursor movement
2. **Add direct IP connection** — Manual IP entry for networks where broadcast doesn't work
3. **Add right-click support** — Single-button direct click and context menu access
4. **Design splash screen** — Polished loading screen with branding

Have a feature request? [Open an issue](https://github.com/pl1an/PCremote/issues) to let us know!

## Project Structure

```
PCremote/
├── app/              # Expo mobile app source
│   ├── components/   # Reusable UI components
│   ├── contexts/     # React contexts (TCP, security)
│   ├── pages/        # Screen components
│   ├── protocols/    # Communication protocols
│   └── styles/       # Theme and styling
└── server/           # Python server source
    ├── server.py     # Main server application
    ├── securityMaster.py
    └── controlHandler.py
```

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-nc-sa/4.0/).

**You are free to:**
- Share — copy and redistribute the material in any medium or format
- Adapt — remix, transform, and build upon the material

**Under the following terms:**
- **Attribution** — You must give appropriate credit
- **NonCommercial** — You may not use the material for commercial purposes
- **ShareAlike** — If you remix, transform, or build upon the material, you must distribute your contributions under the same license
