import { useContext, useRef } from "react";
import { Alert } from "react-native";
import { Buffer } from "buffer";

import { UdpContext } from "../contexts/udpContext";
import dgram from 'react-native-udp';
import { ConnectionStatusContextType } from "../contexts/connectionStatusContext";



interface UdpHookProps {
    address_ref: React.RefObject<string | null>;
    setMessage: React.Dispatch<React.SetStateAction<{show: boolean; text: string}>>;
    setConnectionStatus: React.Dispatch<React.SetStateAction<ConnectionStatusContextType["connection_status"]>>;
}

interface UdpHookReturnType {
    udp_socket_ref: React.RefObject<any | null>;
    cleanupUdp: () => void;
    sendUdpBroadcast: () => void;
}



export const useUdp = (props: UdpHookProps): UdpHookReturnType => {

    const MAXIMUM_BROADCAST_TRIES = 5;
    const BROADCAST_TIMEOUT_MS = 3000;

    const context = useContext(UdpContext);
    if(!context) throw new Error("useUdp must be used within a UdpProvider");
    const { udp_socket_ref } = context;

    const broadcast_tries_ref = useRef<number>(0);
    const udp_brodcast_timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);


    const cleanupUdp  = () => {
        if(udp_brodcast_timeout_ref.current){
            clearTimeout(udp_brodcast_timeout_ref.current);
            udp_brodcast_timeout_ref.current = null;
        }
        if(udp_socket_ref.current){
            try{
                udp_socket_ref.current.removeAllListeners();
                udp_socket_ref.current.close();
                udp_socket_ref.current = null;
            }
            catch (e){
                console.warn('Failed to cleanup UDP socket', e);
            }
        }
    };


    const sendUdpBroadcast = () => {
        cleanupUdp();
        props.setConnectionStatus("udp-broadcasting");

        // Tries to create a UDP socket
        try{
            console.log('Creating UDP socket');
            udp_socket_ref.current = dgram.createSocket({ type: 'udp4' });
        }
        catch (err){
            props.setConnectionStatus("udp-disconnected");
            props.setMessage({show: true, text: 'UDP unavailable. Cannot discover PC.'});
            return;
        }

        try{
            udp_socket_ref.current.bind(0, () => {
                // Sending a broadcast message to discover the PC
                try{
                    if(broadcast_tries_ref.current == 0) props.setMessage({show: true, text: 'Sending broadcast message to discover PC...'});
                    const message = Buffer.from('DISCOVER_PC');
                    udp_socket_ref.current.send(message, 0, message.length, 41234, '255.255.255.255');
                }
                catch (e){
                    console.warn('Failed to send UDP broadcast message', e);
                    props.setConnectionStatus("udp-disconnected");
                    props.setMessage({show: true, text: 'Failed to send UDP broadcast message.'});
                    return;
                }
            });
        }
        catch (err){
            props.setConnectionStatus("udp-disconnected");
            props.setMessage({show: true, text: 'UDP bind failed.'});
            return;
        }


        // Creating broadcast retry timeout
        const my_gen = broadcast_tries_ref.current;
        if(!udp_brodcast_timeout_ref.current){
            udp_brodcast_timeout_ref.current = setTimeout(() => {
                if(my_gen !== broadcast_tries_ref.current) return;
                console.log('UDP broadcast timeout reached');
                if(broadcast_tries_ref.current < MAXIMUM_BROADCAST_TRIES){
                    broadcast_tries_ref.current += 1;
                    props.setMessage({show: true, text: `No response from PC. Retrying broadcast... (${broadcast_tries_ref.current}/${MAXIMUM_BROADCAST_TRIES})`});
                    sendUdpBroadcast();
                }
                else{
                    broadcast_tries_ref.current = 0;
                    props.setConnectionStatus("udp-disconnected");
                    props.setMessage({show: true, text: 'No response from PC. Please ensure the PC application is running and try again.'});
                    cleanupUdp();
                }
            }, BROADCAST_TIMEOUT_MS);
        }

        // Setting socket error listener if necessary 
        udp_socket_ref.current.removeAllListeners('error');
        udp_socket_ref.current.on('error', (err: any) => {
            broadcast_tries_ref.current = 0;
            props.setConnectionStatus("udp-disconnected");
            cleanupUdp();
        });
        // Setting socket message listener if necessary 
        udp_socket_ref.current.removeAllListeners('message');
        udp_socket_ref.current.on('message', (msg: any, rinfo: any) => {
            if(msg.toString() === "PC_HERE"){
                props.setMessage({show: true, text: 'PC found at ' + rinfo.address + '. Establishing TCP connection...'});
                props.address_ref.current = rinfo.address;
                props.setConnectionStatus("udp-connected");
                broadcast_tries_ref.current = 0;
                cleanupUdp();
            };
        });
    };


    return {
        udp_socket_ref,
        cleanupUdp, sendUdpBroadcast
    };
}