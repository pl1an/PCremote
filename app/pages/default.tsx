import React, { use, useEffect, useRef, useState } from 'react';
import { View, Text, Button, StyleSheet, Touchable, TouchableOpacity } from 'react-native';
import { Alert } from 'react-native';

import { useUdp } from '../hooks/useUdp';
import { useTcp } from '../hooks/useTcp';
import QrcodeScanner from '../components/qrcodeScanner';
import { useSecureKeyContext } from '../contexts/secureKeyContext';

import LoadingAnimation from '../components/loadingAnimation';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../_layout';

import { deriveKeys } from '../protocols/deriveMaster';
import { buildMessage } from '../protocols/sendMaster';
import { receiveSecureMessage } from '../protocols/receiveMaster';

import { themes } from '../styles/themes';
//@ts-expect-error
import Icon from 'react-native-vector-icons/Ionicons';
import { useConnectionStatusContext } from '../contexts/connectionStatusContext';



interface DefaultProps {
    navigation: NativeStackNavigationProp<RootStackParamList, 'default'>;
}

export const Default: React.FC<DefaultProps> = ({navigation}) => {

    const [message, setMessage] = useState({
        show: false,
        text: '',
    });

    const connection = useConnectionStatusContext();
    const udp = useUdp({ address_ref: connection.connection_address_ref, setMessage, setConnectionStatus: connection.setConnectionStatus });
    const tcp = useTcp({ address_ref: connection.connection_address_ref, setConnectionStatus: connection.setConnectionStatus, setMessage, navigation });
    const { master_key_ref, hmac_key_ref, encryption_key_ref } = useSecureKeyContext();

    const [camera_pressed, setCameraPressed] = useState(false);


    useEffect(() => {
        if(connection.connection_status === "udp-connected"){
            tcp.startTcpConnection();
        }
    }, [connection.connection_status]);

    return (
        <View style={style_sheet.default_container}>
            <Text style={style_sheet.title}>Connect to your PC</Text>
            {message.show && <Text style={style_sheet.message_text}>{message.text}</Text>}
            {connection.connection_status === "udp-disconnected" && (<>
                <TouchableOpacity style={{...style_sheet.connect_button, marginTop: 60}} onPress={() => udp.sendUdpBroadcast()}>
                    <Text style={{color: themes['default'].primary, fontSize: 16}}> Connect through Broadcast </Text>
                </TouchableOpacity>
                <TouchableOpacity style={style_sheet.connect_button} onPress={() => {}}>
                    <Text style={{color: themes['default'].primary, fontSize: 16}}> Connect through IP </Text>
                </TouchableOpacity>
            </>)}
            {(connection.connection_status === "tcp-loading" || connection.connection_status === "udp-broadcasting" || connection.connection_status === "tcp-authenticating") && <LoadingAnimation />}
            {!camera_pressed && connection.connection_status === "tcp-connected" && (<>
                <TouchableOpacity style={style_sheet.qrcode_container} onPress={() => setCameraPressed(true)}>
                    <Icon name="camera" size={60} color={themes['default'].primary} />
                </TouchableOpacity>
            </>)}
            {camera_pressed && connection.connection_status === "tcp-connected" && (<>
                <View style={style_sheet.camera_container}>
                    <QrcodeScanner onScanned={(data) => {
                        setCameraPressed(false);
                        setMessage({show: true, text: 'Waiting for authorization from PC...'});
                        tcp.authenticateClient(data, encryption_key_ref, hmac_key_ref);
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