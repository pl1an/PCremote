import React, { createContext, useRef, useContext } from 'react';
import { useState } from 'react';


interface UdpContextType {
    udp_socket_ref: React.RefObject<any | null>;
}


export const UdpContext = createContext<UdpContextType | null>(null);

export const UdpProvider = ({ children }: any) => {
    const udp_socket_ref = useRef<any>(null);

    return (
        <UdpContext.Provider value={{udp_socket_ref}}>
                    {children}
        </UdpContext.Provider>
    );
};

// Expo Router expects a default export from files under `app/`
export default function _UdpRoutePlaceholder() {
    return null;
}