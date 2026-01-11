import React, { useRef, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { Alert } from 'react-native';
import { themes } from '../styles/themes';

import dgram from 'react-native-udp';
import { Buffer } from 'buffer';

import LoadingAnimation from '../components/loadingAnimation';



export const Default: React.FC = () => {

    const socketRef = useRef<null>(null);
    const [loading, setLoading] = useState(false);


    const connectBroadcast = () => {
        setLoading(true);

        // Tries to create a UDP socket
        let socket: any;
        if(socketRef.current){
            socket = socketRef.current;
        }
        else{
            try{
                console.log('Creating UDP socket');
                //@ts-ignore
                socket = dgram.createSocket('udp4');
                socket.bind(0, () => {});
                socketRef.current = socket;
            }
            catch (err){
                Alert.alert(
                    'UDP unavailable or bind failed',
                    'Failed to initialize UDP socket. The native UDP module appears unavailable in this environment.'
                );
                console.warn('error creating and binding socket ', err);
                return;
            }
        }

        // Sending a broadcast message to discover the PC
        if (!socket) return;
        try{
            // Sending message
            let closeTimeout: any
            console.log('Sending broadcast message');
            const message = Buffer.from('DISCOVER_PC');
            socket.send(message, 0, message.length, 41234, '255.255.255.255', (err: any) => {
                if (err) console.warn('UDP send error', err);
            });

            // Awaiting response
            closeTimeout = setTimeout(() => {
                setLoading(false);
                try{
                    socket.close(); 
                } 
                catch (e){
                    console.warn('UDP socket close error', e);
                }
                socketRef.current = null;
                Alert.alert(
                    'No response',
                    'No PC responded to the broadcast message.'
                );
            }, 3000);
            socket.on('error', (err: any) => {
                console.warn('UDP socket error', err);
                setLoading(false);
                try{
                    socket.close();
                }
                catch (e){
                    console.warn('UDP socket close error', e);
                }
                if (closeTimeout) clearTimeout(closeTimeout);
                socketRef.current = null;
            });
            socket.on('message', (msg: any, rinfo: any) => {
                console.log('PC found:', msg.toString(), rinfo && rinfo.address);
                setLoading(false);
                try {
                    socket.close();
                }
                catch (e) {
                    console.warn('UDP socket close error', e);
                }
                if (closeTimeout) clearTimeout(closeTimeout);
                socketRef.current = null;
            });
        }

        // Catching runtime errors
        catch (err) {
            Alert.alert(
                'UDP error',
                'An error occurred while using the UDP module. Check that the native module is linked or use a custom dev client.'
            );
            console.warn('react-native-udp runtime error', err);
            try {
                socket && socket.close && socket.close();
            }
            catch (e) {
            }
        }
    };


    const connectIp = () => {
    };


    return (
        <View style={style_sheet.default_container}>
            <Text style={style_sheet.default_text}>Connect to your PC</Text>
            {!loading && (
                <>
                    <Button title="Connect through Broadcast" onPress={() => connectBroadcast()} />
                    <Button title="Connect through IP" onPress={() => {}} />
                </>
            )}
            {loading && <LoadingAnimation />}
        </View>
    );
};



const style_sheet = StyleSheet.create({
  default_container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  default_text: {
    fontSize: 18,
    color: themes['default'].primary,
  },
});