import React, { useRef, useState } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { Alert } from 'react-native';
import { themes } from '../styles/themes';

import dgram from 'react-native-udp';
import TcpSocket from 'react-native-tcp-socket';
import { Buffer } from 'buffer';
import { useTcp } from '../contexts/tcpContext';

//@ts-expect-error
import Icon from 'react-native-vector-icons/Ionicons';

import LoadingAnimation from '../components/loadingAnimation';



export const Controller: React.FC = () => {

    const tcp_socket_ref = useTcp();


    const sendControlSignal = (signal: string) => {
        if(tcp_socket_ref.current){
            const message = Buffer.from(signal, 'utf-8');
            tcp_socket_ref.current.write(message);
        }
    };


    return (
        <View style={style_sheet.container}>
            <TouchableOpacity style={style_sheet.powerButton} onPress={() => sendControlSignal('POWER_TOGGLE')}>
                <Icon name="power" size={100} color={themes.default.primary}/>
            </TouchableOpacity>
        </View>
    );
};



const style_sheet = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    powerButton: {
        width: 150,
        height: 150,
        borderRadius: 100,
        backgroundColor: "red",
        alignItems: 'center',
        justifyContent: 'center',
    },
});



export default Controller;