import React, { createContext, useContext, useRef } from 'react';
import { useState } from 'react';


export interface ConnectionStatusContextType {
    connection_status: "udp-disconnected" | "udp-broadcasting" | "udp-connected" | "tcp-disconnected" | "tcp-loading" | "tcp-connected" | "tcp-authenticating" | "tcp-authenticated";
    setConnectionStatus: React.Dispatch<React.SetStateAction<"udp-disconnected" | "udp-broadcasting" | "udp-connected" | "tcp-disconnected" | "tcp-loading" | "tcp-connected" | "tcp-authenticating" | "tcp-authenticated">>;
    connection_address_ref: React.RefObject<string | null>;
}


export const ConnectionStatusContext = createContext<ConnectionStatusContextType | null>(null);

export const ConnectionStatusProvider = ({ children }: any) => {
    const [connection_status, setConnectionStatus] = useState<ConnectionStatusContextType["connection_status"]>("udp-disconnected");
    const connection_address_ref = useRef<string | null>(null);
    return (
        <ConnectionStatusContext.Provider value={{connection_status, setConnectionStatus, connection_address_ref}}>
            {children}
        </ConnectionStatusContext.Provider>
    );
};

export const useConnectionStatusContext = () => {
    const context = useContext(ConnectionStatusContext);
    if(!context) throw new Error("useConnectionStatusContext must be used within a ConnectionStatusProvider");
    return context;
}


// Expo Router expects a default export from files under `app/`
export default function _ConnectionStatusRoutePlaceholder() {
    return null;
}