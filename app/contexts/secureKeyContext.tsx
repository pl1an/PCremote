import React, { createContext, useRef, useContext } from 'react';


const MasterKeyContext = createContext<any>({ current: null });
const HmacKeyContext = createContext<any>({ current: null });
const EncryptionKeyContext = createContext<any>({ current: null });

export const SecureKeyProvider = ({ children }: any) => {
    const masterKeyRef = useRef<any>(null);
    const hmacKeyRef = useRef<any>(null);
    const encryptionKeyRef = useRef<any>(null);

    return (
        <MasterKeyContext.Provider value={masterKeyRef}>
            <HmacKeyContext.Provider value={hmacKeyRef}>
                <EncryptionKeyContext.Provider value={encryptionKeyRef}>
                    {children}
                </EncryptionKeyContext.Provider>
            </HmacKeyContext.Provider>
        </MasterKeyContext.Provider>

    );
};

export const useMasterKey = () => useContext(MasterKeyContext);
export const useHmacKey = () => useContext(HmacKeyContext);
export const useEncryptionKey = () => useContext(EncryptionKeyContext);

// Expo Router expects a default export from files under `app/`
export default function _SecureKeyRoutePlaceholder() {
    return null;
}