import React, { useRef, useState } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Alert } from 'react-native';
import { themes } from '../styles/themes';

import dgram from 'react-native-udp';
import TcpSocket from 'react-native-tcp-socket';
import { Buffer } from 'buffer';
import { useTcp } from '../contexts/tcpContext';
import { useEncryptionKey, useHmacKey } from '../contexts/secureKeyContext';
import { buildMessage } from '../protocols/messageMaster';

import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
//@ts-ignore
import IonIcon from 'react-native-vector-icons/Ionicons';
//@ts-ignore
import EntypoIcon from 'react-native-vector-icons/Entypo';
//@ts-ignore
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';




export const Controller: React.FC = () => {

    const tcp_socket_ref = useTcp();
    
    const encryption_key_ref = useEncryptionKey(); 
    const hmac_key_ref = useHmacKey();

    const [command, setCommand] = useState<"none"|"keyboard"|"mouse"|"load">("none");
    const [keyboardInput, setKeyboardInput] = useState<string>("");


    const sendControlSignal = (signal: string) => {
        if(tcp_socket_ref.current && encryption_key_ref.current && hmac_key_ref.current){
            const message = buildMessage(signal, encryption_key_ref.current, hmac_key_ref.current);
            console.log("Sending control signal:", message);
            tcp_socket_ref.current.write(message);
        }
    };


    return (
        <View style={style_sheet.container}>
            {command === "none" && (<>
                <TouchableOpacity style={style_sheet.power_button} onPress={() => sendControlSignal('POWER_TOGGLE')}>
                    <IonIcon name="power" size={70} color={themes.default.primary}/>
                </TouchableOpacity>
                <View>
                    <TouchableOpacity style={{...style_sheet.generic_button, marginBottom: 30}} onPress={() => setCommand("keyboard")}>
                        <Text style={style_sheet.button_text} onPress={() => setCommand("keyboard")}>Keyboard</Text>
                        <EntypoIcon name="keyboard" size={40} color={themes.default.primary} style={style_sheet.button_icon}/>
                    </TouchableOpacity>
                    <TouchableOpacity style={style_sheet.generic_button} onPress={() => setCommand("mouse")}>
                        <Text style={style_sheet.button_text} onPress={() => setCommand("mouse")}>Mouse</Text>
                        <MaterialIcon name="mouse" size={40} color={themes.default.primary} style={style_sheet.button_icon}/>
                    </TouchableOpacity>
                </View>
            </>)}
            {command === "keyboard" && (
                <View style={style_sheet.text_input_container}>
                    <TextInput style={style_sheet.text_input} onChangeText={setKeyboardInput} value={keyboardInput}></TextInput>
                    <View style={{flexDirection: 'row', justifyContent: 'center', width: '80%'}}>
                        <TouchableOpacity style={{...style_sheet.generic_button, width: '40%', marginTop: 30, marginRight: 10}} onPress={() => {}}>
                            <MaterialDesignIcons name="keyboard-backspace" size={30} color={themes.default.primary} style={style_sheet.button_icon}/>
                        </TouchableOpacity>
                        <TouchableOpacity style={{...style_sheet.generic_button, width: '40%', marginTop: 30}} onPress={() => {}}>
                            <MaterialDesignIcons name="keyboard-return" size={30} color={themes.default.primary} style={style_sheet.button_icon}/>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};



const style_sheet = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-evenly',
    },
    power_button: {
        width: 100,
        height: 100,
        borderRadius: 100,
        backgroundColor: "red",
        alignItems: 'center',
        justifyContent: 'center',
    },
    generic_button_container: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-evenly',
    },
    generic_button: {
        position: 'relative',
        width: '80%',
        height: 60,
        padding: 15,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: themes['default'].secondary,
    },
    button_text: {
        color: themes.default.primary,
        fontSize: 16,
        flexGrow: 1,
        textAlign: 'center',
    },
    button_icon: {
        position: 'absolute',
        right: 10,
    },
    text_input_container: {
        width: '100%',
        marginTop: 50,
        flex: 1,
        alignItems: 'center',
    },
    text_input: {
        width: '80%',
        height: 50,
        borderColor: themes.default.secondary,
        borderWidth: 3,
        borderRadius: 10,
        paddingHorizontal: 10,
        color: themes.default.primary,
    },
});



export default Controller;