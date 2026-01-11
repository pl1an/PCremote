import React, { createContext, useRef, useContext } from 'react';


const TcpContext = createContext<any>({ current: null });

export const TcpProvider = ({ children }: any) => {
  const tcpRef = useRef<any>(null);

  return (
    <TcpContext.Provider value={tcpRef}>
      {children}
    </TcpContext.Provider>
  );
};

export const useTcp = () => useContext(TcpContext);



// Expo Router expects a default export from files under `app/`
export default function _TcpRoutePlaceholder() {
    return null;
}