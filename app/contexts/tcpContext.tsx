import React, { createContext, useRef, useContext } from 'react';
import { useState } from 'react';


const TcpContext = createContext<any>({ current: null });
const ConnectionStatusContext = createContext<any>({connection_status: null, setConnectionStatus: null});
const ConnectionAddressContext = createContext<any>({current: null});

export const TcpProvider = ({ children }: any) => {
    const tcpRef = useRef<any>(null);
    const addressRef = useRef<string | null>(null);
    const [connection_status, setConnectionStatus] = useState<"disconnected" | "connected">("disconnected");

    return (
        <TcpContext.Provider value={tcpRef}>
            <ConnectionStatusContext.Provider value={{connection_status, setConnectionStatus}}>
                <ConnectionAddressContext.Provider value={addressRef}>
                    {children}
                </ConnectionAddressContext.Provider>
            </ConnectionStatusContext.Provider>
        </TcpContext.Provider>
    );
};

export const useTcp = () => useContext(TcpContext);
export const useConnectionStatus = () => useContext(ConnectionStatusContext);
export const useConnectionAddress = () => useContext(ConnectionAddressContext);

// Expo Router expects a default export from files under `app/`
export default function _TcpRoutePlaceholder() {
    return null;
}