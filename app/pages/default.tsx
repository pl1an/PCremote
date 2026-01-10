import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { themes } from '../styles/themes';
import { Buffer } from 'buffer';
import { Alert } from 'react-native';

export const Default: React.FC = () => {


    const connectBroadcast = () => {
        // Dynamically importing udp
        let dgram: any;
        try{
            dgram = require('react-native-udp');
        }
        catch (e){
        dgram = null;
        }
        if (!dgram || typeof dgram.createSocket !== 'function'){
            Alert.alert(
                'UDP unavailable',
                'The native UDP module is not available in this environment. Use the bare workflow or a custom dev client to enable UDP.'
            );
            console.warn('react-native-udp native module missing or not linked');
            return;
        }
        // Tries to create a UDP socket
        let socket: any;
        try{
            socket = dgram.createSocket('udp4');
        }
        catch (err){
            Alert.alert(
                'UDP unavailable',
                'Failed to initialize UDP socket. The native UDP module appears unavailable in this environment.'
            );
            console.warn('react-native-udp createSocket failed', err);
            return;
        }
        // Sends a broadcast message to discover the PC
        try{
            socket.bind(0, () => {
                socket.setBroadcast(true);

                const message = Buffer.from('DISCOVER_PC');
                socket.send(message, 0, message.length, 41234, '255.255.255.255', (err: any) => {
                if (err) console.warn('UDP send error', err);
                socket.close();
                });
            });

            socket.on('message', (msg: any, rinfo: any) => {
                console.log('PC found:', msg.toString(), rinfo && rinfo.address);
            });
        }
        catch (err) {
            Alert.alert(
                'UDP error',
                'An error occurred while using the UDP module. Check that the native module is linked or use a custom dev client.'
            );
            console.warn('react-native-udp runtime error', err);
            try {
                socket && socket.close && socket.close();
            } catch (e) {
                // ignore
            }
        }
    };


    const connectIp = () => {
    };


    return (
        <View style={style_sheet.default_container}>
            <Text style={style_sheet.default_text}>Connect to your PC</Text>
            <Button title="Connect through Broadcast" onPress={() => connectBroadcast()} />
            <Button title="Connect through IP" onPress={() => {}} />
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