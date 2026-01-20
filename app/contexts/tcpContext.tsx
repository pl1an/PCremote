import React, { createContext, useRef, useContext } from 'react';
import { useState } from 'react';



interface TcpContextType {
    tcp_socket_ref: React.RefObject<any | null>;
}


export const TcpContext = createContext<TcpContextType | null>(null);

export const TcpProvider = ({ children }: any) => {
    const tcp_socket_ref = useRef<any>(null);

    return (
        <TcpContext.Provider value={{tcp_socket_ref}}>
                    {children}
        </TcpContext.Provider>
    );
};

// Expo Router expects a default export from files under `app/`
export default function _TcpRoutePlaceholder() {
    return null;
}