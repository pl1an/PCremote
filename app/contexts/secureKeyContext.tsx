import React, { createContext, useRef, useContext } from 'react';


export interface SecureKeyContextType {
    master_key_ref: React.RefObject<any | null>;
    hmac_key_ref: React.RefObject<any | null>;
    encryption_key_ref: React.RefObject<any | null>;
}


const SecureKeyContext = createContext<SecureKeyContextType | null>(null);

export const SecureKeyProvider = ({ children }: any) => {
    const master_key_ref = useRef<string | null>(null);
    const hmac_key_ref = useRef<string | null>(null);
    const encryption_key_ref = useRef<string | null>(null);

    return (
        <SecureKeyContext.Provider value={{master_key_ref, hmac_key_ref, encryption_key_ref}}>
            {children}
        </SecureKeyContext.Provider>

    );
};

export const useSecureKeyContext = () => {
    const context = useContext(SecureKeyContext);
    if(!context) throw new Error("useSecureKeyContext must be used within a SecureKeyProvider");
    return context;
}


// Expo Router expects a default export from files under `app/`
export default function _SecureKeyRoutePlaceholder() {
    return null;
}