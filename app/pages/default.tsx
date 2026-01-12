import React, { useRef, useState } from 'react';
import { View, Text, Button, StyleSheet, Touchable, TouchableOpacity } from 'react-native';
import { Alert } from 'react-native';
import { themes } from '../styles/themes';

import dgram from 'react-native-udp';
import TcpSocket from 'react-native-tcp-socket';
import { Buffer } from 'buffer';
import { useTcp } from '../contexts/tcpContext';
import QrcodeScanner from '../components/qrcodeScanner';
import { useEncryptionKey, useHmacKey, useMasterKey } from '../contexts/secureKeyContext';

import LoadingAnimation from '../components/loadingAnimation';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../_layout';

//@ts-expect-error
import Icon from 'react-native-vector-icons/Ionicons';
import { deriveKeys } from '../protocols/deriveMaster';
import { buildMessage } from '../protocols/messageMaster';



interface DefaultProps {
    navigation: NativeStackNavigationProp<RootStackParamList, 'default'>;
}

export const Default: React.FC<DefaultProps> = ({navigation}) => {

    const udp_socket_ref = useRef<any>(null);
    const tcp_socket_ref = useTcp();

    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({
        show: false,
        text: '',
    });

    const [waiting_for_qr, setWaitingForQr] = useState<"Waiting connection" | "Waiting camera button press" | "Waiting for QR scan" | "Done">("Waiting connection");

    const master_key_ref = useMasterKey();
    const hmac_key_ref = useHmacKey();
    const encryption_key_ref = useEncryptionKey();


    const connectBroadcast = () => {
        setLoading(true);

        // Tries to create a UDP socket
        let socket: any;
        if(udp_socket_ref.current){
            socket = udp_socket_ref.current;
        }
        else{
            try{
                console.log('Creating UDP socket');
                //@ts-ignore
                socket = dgram.createSocket('udp4');
                socket.bind(0, () => {});
                udp_socket_ref.current = socket;
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
            setMessage({show: true, text: 'Sending broadcast message to discover PC...'});
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
                udp_socket_ref.current = null;
                setMessage({show: true, text: 'No response from PC. Please ensure the PC application is running and try again.'});
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
                udp_socket_ref.current = null;
            });
            socket.on('message', (msg: any, rinfo: any) => {
                if(msg.toString() === "PC_HERE"){
                    if (closeTimeout) clearTimeout(closeTimeout);
                    console.log('PC found:', msg.toString(), rinfo && rinfo.address);
                    setMessage({show: true, text: 'PC found at ' + rinfo.address + '. Establishing TCP connection...'});
                    stablishTcpConnection(rinfo.address);
                };
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
            catch (e){
            }
        }
    };


    const connectIp = () => {
    };

    
    const stablishTcpConnection = (address:any) => {
        const server = TcpSocket.createConnection({
            host: address,
            port: 41234, 
        }, () => {
            // wait for confirmation from server
            console.log('TCP connected. Awaiting key sharing...');
            server.on('data', (data) => {
                if(data.toString() === "CONFIRMED_CONNECTION"){
                    setMessage({show: true, text: 'Scan the QR code on your PC to share the encryption key.'});
                    if (tcp_socket_ref && typeof tcp_socket_ref === 'object') {
                        try {
                            tcp_socket_ref.current = server;
                        }
                        catch (e) {
                            console.warn('Failed to set tcp ref current', e);
                        }
                    }
                    else {
                        console.warn('TCP context ref is null or not available');
                    }
                    setLoading(false);
                    setConnected(true);
                    setWaitingForQr("Waiting camera button press");
                }
            });
        });
    };


    const confirmEncryptionKeyReceived = (data: string) => {

        // Deriving encryption and HMAC keys from master key
        try{
            master_key_ref.current = data;
            let derived_keys = deriveKeys(master_key_ref.current);
            encryption_key_ref.current = derived_keys.encryption_key;
            console.log('Derived encryption key:', derived_keys.encryption_key);
            hmac_key_ref.current = derived_keys.hmac_key;
            console.log('Derived hmac key:', derived_keys.hmac_key);
        }
        catch (e){
            console.warn('Failed to derive keys from master key', e);
        }

        // Sending confirmation to server
        if(tcp_socket_ref.current){
            const message = buildMessage('MASTER_KEY_RECEIVED', encryption_key_ref.current, hmac_key_ref.current);
            console.log('Building authentication message and sending: ', message); 
            tcp_socket_ref.current.write(message);
            // Await for authorization from server
            let authenticationTimeout: any;
            tcp_socket_ref.current.on('data', (data: any) => {
                if(data.toString() === "CLIENT_AUTHENTICATED"){
                    console.log('Authentication confirmed by server. Navigating to controller.');
                    setLoading(false);
                    setMessage({show: false, text: ''});
                    if (authenticationTimeout) clearTimeout(authenticationTimeout);
                    navigation.navigate('controller');
                }
            });
            // Setting timeout for server response
            authenticationTimeout = setTimeout(() => {
                setLoading(false);
                setMessage({show: true, text: 'No authorization response from PC. Please try reconnecting.'});
                setConnected(false);
                setWaitingForQr("Waiting connection");
            }, 5000);
        }
    };


    return (
        <View style={style_sheet.default_container}>
            <Text style={style_sheet.title}>Connect to your PC</Text>
            {message.show && <Text style={style_sheet.message_text}>{message.text}</Text>}
            {!loading && waiting_for_qr === "Waiting connection" && !connected && (<>
                <TouchableOpacity style={{...style_sheet.connect_button, marginTop: 60}} onPress={() => connectBroadcast()}>
                    <Text style={{color: themes['default'].primary, fontSize: 16}}> Connect through Broadcast </Text>
                </TouchableOpacity>
                <TouchableOpacity style={style_sheet.connect_button} onPress={() => connectIp()}>
                    <Text style={{color: themes['default'].primary, fontSize: 16}}> Connect through IP </Text>
                </TouchableOpacity>
            </>)}
            {loading && <LoadingAnimation />}
            {waiting_for_qr === "Waiting camera button press" && (<>
                <TouchableOpacity style={style_sheet.qrcode_container} onPress={() => setWaitingForQr("Waiting for QR scan")}>
                    <Icon name="camera" size={60} color={themes['default'].primary} />
                </TouchableOpacity>
            </>)}
            {waiting_for_qr === "Waiting for QR scan" && (<>
                <View style={style_sheet.camera_container}>
                    <QrcodeScanner onScanned={(data) => {
                        setWaitingForQr("Done")
                        setMessage({show: true, text: 'Waiting for authorization from PC...'});
                        setLoading(true);
                        confirmEncryptionKeyReceived(data);
                    }}/>
                </View>
            </>)}
        </View>
    );
};



const style_sheet = StyleSheet.create({
    default_container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 30,
        color: themes['default'].primary,
    },
    connect_button: {
        backgroundColor: themes['default'].secondary,
        padding: 15,
        borderRadius: 10,
        marginTop: 20,
    },
    message_text: {
        paddingHorizontal: 20,
        textAlign: 'center',
        marginTop: 10,
        fontSize: 12,
        color: themes['default'].primary,
        fontStyle: 'italic',
    },
    qrcode_container: {
        marginTop: 60,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: themes['default'].secondary,
        borderRadius: 10,
        padding: 10,
    },
    camera_container: {
        marginTop: 20,
        width: '90%',
        height: '50%',
        overflow: 'hidden',
        borderRadius: 10,
    },
});



export default Default; 