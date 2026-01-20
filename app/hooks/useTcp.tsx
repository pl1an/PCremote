import { useContext, useRef } from "react";
import { TcpContext } from "../contexts/tcpContext";
import TcpSocket from 'react-native-tcp-socket';
import { ConnectionStatusContextType } from "../contexts/connectionStatusContext";
import { deriveKeys } from "../protocols/deriveMaster";
import { buildMessage } from "../protocols/sendMaster";
import { receiveSecureMessage } from "../protocols/receiveMaster";



interface TcpHookProps {
    address_ref: React.RefObject<string | null>;
    setConnectionStatus: React.Dispatch<React.SetStateAction<ConnectionStatusContextType["connection_status"]>>;
    setMessage: React.Dispatch<React.SetStateAction<{show: boolean; text: string}>>;
    navigation: any;
}

interface TcpHookReturnType {
    socket_ref: React.RefObject<any | null>;
    cleanupTcp: () => void;
    startTcpConnection: () => void;
    authenticateClient: (master_key: string, encryption_key_ref: React.RefObject<string | null>, hmac_key_ref: React.RefObject<string | null>) => void;
    reconnectAndAuthenticate: (encryption_key_ref: React.RefObject<string | null>, hmac_key_ref: React.RefObject<string | null>) => void;
}



export const useTcp = (props: TcpHookProps): TcpHookReturnType => {

    const MAXIMUM_TCP_TRIES = 5;
    const MAXIMUM_TCP_CONNECTION_TIME_MS = 2000;

    const context = useContext(TcpContext);
    if(!context) throw new Error("useTcp must be used within a TcpProvider");
    const { tcp_socket_ref } = context;

    const tcp_tries_ref = useRef<number>(0);
    const tcp_retry_timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
    const authentication_timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
    const is_reconnecting_ref = useRef<boolean>(false);


    const cleanupTcp  = (destroy_socket: boolean = true) => {
        if(authentication_timeout_ref.current){
            clearTimeout(authentication_timeout_ref.current);
            authentication_timeout_ref.current = null;
        }
        if(tcp_retry_timeout_ref.current){
            clearTimeout(tcp_retry_timeout_ref.current);
            tcp_retry_timeout_ref.current = null;
        }
        if(tcp_socket_ref && tcp_socket_ref.current){
            try{
                tcp_socket_ref.current.removeAllListeners();
                if(destroy_socket){
                    tcp_socket_ref.current.destroy();
                    tcp_socket_ref.current = null;
                }
            }
            catch (e){
                console.warn('Failed to cleanup TCP socket', e);
            }
        }
    };


    const startTcpConnection = () => {
        cleanupTcp();
        props.setConnectionStatus("tcp-loading");

        // Creating TCP socket
        if(!props.address_ref.current){
            console.warn('No address to connect to for TCP');
            return;
        }
        tcp_socket_ref.current = TcpSocket.createConnection({
            host: props.address_ref.current,
            port: 41235, 
        }, () => {
            console.log('TCP connected. Awaiting key sharing...');
        });

        // Creating timeout for connection retries
        if(!tcp_retry_timeout_ref.current){
            tcp_retry_timeout_ref.current = setTimeout(() => {
                if(tcp_tries_ref.current < MAXIMUM_TCP_TRIES){
                    tcp_tries_ref.current += 1;
                    props.setMessage({show: true, text: `TCP connection timed out. Retrying... (${tcp_tries_ref.current}/${MAXIMUM_TCP_TRIES})`});
                    startTcpConnection();
                }
                else{
                    tcp_tries_ref.current = 0;
                    props.setConnectionStatus("udp-disconnected");
                    props.setMessage({show: true, text: 'Failed to establish TCP connection. Please try reconnecting.'});
                    cleanupTcp();
                }
            }, MAXIMUM_TCP_CONNECTION_TIME_MS);
        }

        // setting up data listener (await for confirmation from server)
        tcp_socket_ref.current?.removeAllListeners("data");
        tcp_socket_ref.current?.on('data', (data: Buffer) => {
            if(data.toString() === "CONFIRMED_CONNECTION"){
                tcp_tries_ref.current = 0;
                props.setConnectionStatus("tcp-connected");
                props.setMessage({show: true, text: 'Scan the QR code on your PC to share the encryption key.'});
                cleanupTcp(false);
            }
        });
        // setting up error listener
        tcp_socket_ref.current?.removeAllListeners("error");
        tcp_socket_ref.current?.on('error', (error: any) => {
            if(tcp_tries_ref.current < MAXIMUM_TCP_TRIES){
                tcp_tries_ref.current += 1;
                props.setMessage({show: true, text: `TCP connection error. Retrying... (${tcp_tries_ref.current}/${MAXIMUM_TCP_TRIES})`});
                startTcpConnection();
            }
            else{
                tcp_tries_ref.current = 0;
                props.setConnectionStatus("udp-disconnected");
                props.setMessage({show: true, text: 'Failed to establish TCP connection. Please try reconnecting.'});
                cleanupTcp();
            }
        });
        // setting up close listener
        tcp_socket_ref.current?.removeAllListeners("close");
        tcp_socket_ref.current?.on('close', () => {
            console.log('TCP connection closed by remote.');
            tcp_tries_ref.current = 0;
            props.setConnectionStatus("udp-disconnected");
            props.setMessage({show: true, text: 'TCP connection closed. Please try reconnecting.'});
            cleanupTcp();
        });
    };


    const authenticateClient = (master_key: string, encryption_key_ref: React.RefObject<string | null>, hmac_key_ref: React.RefObject<string | null>) => {
        props.setConnectionStatus("tcp-authenticating");

        // Deriving encryption and HMAC keys from master key
        try{
            let derived_keys = deriveKeys(master_key);
            encryption_key_ref.current = derived_keys.encryption_key;
            hmac_key_ref.current = derived_keys.hmac_key;
        }
        catch (e){
            console.warn('Failed to derive keys from master key', e);
        }

        // creating listener for server authentication confirmation
        tcp_socket_ref.current?.removeAllListeners('data');
        tcp_socket_ref.current.on('data', (data: any) => {
            try{
                const message_received = receiveSecureMessage(data.toString(), encryption_key_ref.current, hmac_key_ref.current);
                if(message_received === "CLIENT_AUTHENTICATED"){
                    props.setConnectionStatus("tcp-authenticated");
                    props.setMessage({show: false, text: ''});
                    tcp_tries_ref.current = 0;
                    cleanupTcp(false);
                    props.navigation.navigate('controller');
                }
            }
            catch (e){
                console.warn('Failed to receive or parse authentication message from server:', e);
            }
        });

        // Sending confirmation to server
        if(!tcp_socket_ref.current) return;
        const message = buildMessage('MASTER_KEY_RECEIVED', encryption_key_ref.current, hmac_key_ref.current);
        console.log('Building authentication message and sending: ', message); 
        tcp_socket_ref.current.write(message);

        // Setting timeout for server response
        authentication_timeout_ref.current = setTimeout(() => {
            props.setConnectionStatus("udp-disconnected");
            props.setMessage({show: true, text: 'No authorization response from PC. Please try reconnecting.'});
        }, 5000);
    };


    const reconnectAndAuthenticate = (encryption_key_ref: React.RefObject<string | null>, hmac_key_ref: React.RefObject<string | null>) => {
        // Prevent multiple simultaneous reconnection attempts
        if(is_reconnecting_ref.current) {
            console.log('Reconnection already in progress, skipping...');
            return;
        }
        is_reconnecting_ref.current = true;
        
        cleanupTcp();
        props.setConnectionStatus("tcp-loading");

        if(!props.address_ref.current){
            console.warn('No address to connect to for TCP reconnection');
            props.setConnectionStatus("udp-disconnected");
            is_reconnecting_ref.current = false;
            return;
        }

        console.log('Reconnecting to TCP server at', props.address_ref.current);
        const currentSocket = TcpSocket.createConnection({
            host: props.address_ref.current,
            port: 41235, 
        }, () => {
            // Verify this is still the current socket
            if(tcp_socket_ref.current !== currentSocket) {
                console.log('Socket was replaced, ignoring stale connection callback');
                return;
            }
            console.log('TCP reconnected. Re-authenticating...');
            // Clear retry timeout on successful connection
            if(tcp_retry_timeout_ref.current){
                clearTimeout(tcp_retry_timeout_ref.current);
                tcp_retry_timeout_ref.current = null;
            }
            // Send authentication message
            if(!encryption_key_ref.current || !hmac_key_ref.current) {
                is_reconnecting_ref.current = false;
                return;
            }
            props.setConnectionStatus("tcp-authenticating");
            const message = buildMessage('MASTER_KEY_RECEIVED', encryption_key_ref.current, hmac_key_ref.current);
            console.log('Sending re-authentication message');
            currentSocket.write(message);
        });
        tcp_socket_ref.current = currentSocket;

        // Creating timeout for connection retries
        tcp_retry_timeout_ref.current = setTimeout(() => {
            if(tcp_tries_ref.current < MAXIMUM_TCP_TRIES){
                tcp_tries_ref.current += 1;
                is_reconnecting_ref.current = false; // Allow retry
                reconnectAndAuthenticate(encryption_key_ref, hmac_key_ref);
            }
            else{
                tcp_tries_ref.current = 0;
                is_reconnecting_ref.current = false;
                props.setConnectionStatus("udp-disconnected");
                cleanupTcp();
            }
        }, MAXIMUM_TCP_CONNECTION_TIME_MS);

        // Setting up data listener for authentication confirmation
        currentSocket.on('data', (data: any) => {
            if(tcp_socket_ref.current !== currentSocket) return;
            try{
                const message_received = receiveSecureMessage(data.toString(), encryption_key_ref.current, hmac_key_ref.current);
                if(message_received === "CLIENT_AUTHENTICATED"){
                    console.log('Re-authentication successful');
                    props.setConnectionStatus("tcp-authenticated");
                    tcp_tries_ref.current = 0;
                    is_reconnecting_ref.current = false;
                    if(tcp_retry_timeout_ref.current){
                        clearTimeout(tcp_retry_timeout_ref.current);
                        tcp_retry_timeout_ref.current = null;
                    }
                }
            }
            catch (e){
                console.warn('Failed to parse authentication response:', e);
            }
        });

        // Setting up error listener - trigger retry on error
        currentSocket.on('error', (error: any) => {
            if(tcp_socket_ref.current !== currentSocket) return;
            console.warn('TCP socket error during reconnection:', error);
            // Clear the timeout since we'll handle retry here
            if(tcp_retry_timeout_ref.current){
                clearTimeout(tcp_retry_timeout_ref.current);
                tcp_retry_timeout_ref.current = null;
            }
            // Retry logic
            if(tcp_tries_ref.current < MAXIMUM_TCP_TRIES){
                tcp_tries_ref.current += 1;
                console.log(`Retrying connection... (${tcp_tries_ref.current}/${MAXIMUM_TCP_TRIES})`);
                is_reconnecting_ref.current = false;
                // Delay before retry to avoid hammering the server
                setTimeout(() => {
                    reconnectAndAuthenticate(encryption_key_ref, hmac_key_ref);
                }, 1000);
            }
            else{
                tcp_tries_ref.current = 0;
                is_reconnecting_ref.current = false;
                props.setConnectionStatus("udp-disconnected");
                cleanupTcp();
            }
        });

        // Setting up close listener
        currentSocket.on('close', () => {
            if(tcp_socket_ref.current !== currentSocket) return;
            console.log('TCP connection closed during reconnection');
            // Don't retry on close - the error handler will handle it if there was an error
        });
    };


    return {
        socket_ref: tcp_socket_ref,
        cleanupTcp,
        startTcpConnection,
        authenticateClient,
        reconnectAndAuthenticate
    };
}