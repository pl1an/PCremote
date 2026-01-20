import React, { use, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Button, StyleSheet, TouchableOpacity, TextInput, Keyboard } from 'react-native';
import { Alert } from 'react-native';
import { themes } from '../styles/themes';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import TcpSocket from 'react-native-tcp-socket';

import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Mousepad from '../components/mousepad';
import { ShutdownButton } from '../components/shutdownButton';

import { useSecureKeyContext } from '../contexts/secureKeyContext';
import { useConnectionStatusContext } from '../contexts/connectionStatusContext';

import { receiveSecureMessage } from '../protocols/receiveMaster';
import { buildMessage } from '../protocols/sendMaster';

import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
//@ts-ignore
import FeatherIcon from 'react-native-vector-icons/Feather';
//@ts-ignore
import EntypoIcon from 'react-native-vector-icons/Entypo';
//@ts-ignore
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useTcp } from '../hooks/useTcp';



type ControllerProps = {
    navigation: any;
}


export const Controller: React.FC<ControllerProps> = ({ navigation }) => {

    const connection = useConnectionStatusContext();
    const { encryption_key_ref, hmac_key_ref } = useSecureKeyContext();
    const tcp = useTcp({ address_ref: connection.connection_address_ref, setConnectionStatus: connection.setConnectionStatus, setMessage: () => {}, navigation });

    const tcp_buffer_ref = useRef<string>("");

    const [command, setCommand] = useState<"none"|"keyboard"|"mouse"|"load">("none");
    const keyboard_input_ref = useRef<TextInput | null>(null);
    const [keyboard_input, setKeyboardInput] = useState<string>("");

    const MAX_MOUSE_EVENT_FREQUENCY = 20;
    const MOUSE_EVENT_INTERVAL = 1000 / MAX_MOUSE_EVENT_FREQUENCY;
    let pending_mouse_delta_x = 0;
    let pending_mouse_delta_y = 0;
    let last_mouse_event_time = 0;

    const MAX_SCROLL_EVENT_FREQUENCY = 20;
    const SCROLL_EVENT_INTERVAL = 1000 / MAX_SCROLL_EVENT_FREQUENCY;
    let pending_scroll_delta = 0;
    let last_scroll_event_time = 0;

    const pending_acks_ref = useRef<Map<string, any>>(new Map());


    const sendControlSignal = (signal: string) => {
        if(!tcp.socket_ref.current || !encryption_key_ref.current || !hmac_key_ref.current) return;
        if(tcp.socket_ref.current == null){
            tcp.startTcpConnection();
            tcp.authenticateClient(connection.connection_address_ref.current!, encryption_key_ref, hmac_key_ref);
        }

        // Setting up acknowledgment timeout
        const ack_timeout = setTimeout(() => {
            pending_acks_ref.current.delete(signal);
            console.log("Acknowledgment timeout for signal: " + signal);
            tcp.startTcpConnection();
            tcp.authenticateClient(connection.connection_address_ref.current!, encryption_key_ref, hmac_key_ref);
        }, 1000);
        pending_acks_ref.current.set(signal, ack_timeout);

        // Sending message
        const message = buildMessage(signal, encryption_key_ref.current, hmac_key_ref.current);
        try{
            tcp.socket_ref.current.write(message);
        }
        catch (e){
            if(e instanceof Error && (e.message.includes("Socket is closed") || e.message.includes("write EPIPE"))){
                tcp.startTcpConnection();
                tcp.authenticateClient(connection.connection_address_ref.current!, encryption_key_ref, hmac_key_ref);
            }
        }
    };


    // Setting up listener for acknowledgments
    useEffect(() => {
        if(!tcp.socket_ref.current) return;

        const onData = (data: Buffer) => {
            tcp_buffer_ref.current += data.toString();
            while(tcp_buffer_ref.current.includes("\n")){
                let current_packet = tcp_buffer_ref.current.split("\n")[0];
                tcp_buffer_ref.current = tcp_buffer_ref.current.slice(current_packet.length + 1);
                const message = receiveSecureMessage(current_packet, encryption_key_ref.current!, hmac_key_ref.current!);
                if(!message || !message.startsWith("ACK:")) return;
                const original_signal = message.slice(4);
                if(pending_acks_ref.current.has(original_signal)){
                    clearTimeout(pending_acks_ref.current.get(original_signal));
                    pending_acks_ref.current.delete(original_signal);
                    // Handling specific acknowledgments
                    if(original_signal === "COMMAND:DISCONNECT"){
                        tcp.cleanupTcp();
                        connection.setConnectionStatus("udp-disconnected");
                        navigation.goBack();
                    }
                }
            }
        }

        tcp.socket_ref.current.removeAllListeners("data");
        tcp.socket_ref.current.on('data', onData);
        return () => {
            tcp.socket_ref.current?.off("data", onData);
        }
    }, [tcp.socket_ref.current]);
    

    useFocusEffect(useCallback(() => {
        const onBackPress = () => {
            if(command !== "none"){
                setCommand("none");
                return true;
            }
            if(command === "none"){
                sendControlSignal('COMMAND:DISCONNECT');
                return true;
            }
            return false;
        }
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [command]));

    // Listen for keyboard hide event to exit keyboard command mode
    useFocusEffect(useCallback(() => {
        const subscription = Keyboard.addListener('keyboardDidHide', () => {
            if(command === "keyboard"){
                setKeyboardInput("");
                setCommand("none");
            }
        });
        return () => subscription.remove();
    }, [command]));

    // Focus the keyboard input when entering keyboard command mode
    useEffect(() => {
        setTimeout(() => {
            if(command === "keyboard" && keyboard_input_ref.current){
                keyboard_input_ref.current.focus();
            }
        }, 100);
    }, [command]);


    // Listening for the keyboard height changes to adjust the UI accordingly
    const [keyboard_height, setKeyboardHeight] = useState(0);
    useEffect(() => {
        const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardHeight(e.endCoordinates.height);
        });
        return () => {
            showSubscription.remove();
        };
    }, []);


    const onMouseMove = (x: number, y: number) => {
        pending_mouse_delta_x = x;
        pending_mouse_delta_y = y;
        const now = Date.now();
        if(now - last_mouse_event_time >= MOUSE_EVENT_INTERVAL){
            last_mouse_event_time = now;
            sendControlSignal("COMMAND:MOUSE_MOVE<" + pending_mouse_delta_x + "," + pending_mouse_delta_y + ">")
        }
    }
    const onMouseClick = (x: number, y: number) => {
        sendControlSignal("COMMAND:MOUSE_CLICK")
    }
    const onMouseScroll = (x: number, y: number) => {
        sendControlSignal("COMMAND:MOUSE_SCROLL<" + x + "," + y + ">")
    }
    const onMousePinch = (scale: number) => {
        pending_scroll_delta = scale;
        const now = Date.now();
        if(now - last_scroll_event_time >= SCROLL_EVENT_INTERVAL){
            last_scroll_event_time = now;
            sendControlSignal("COMMAND:MOUSE_PINCH<" + scale + ">")
        }
    } 


    return (
        <View style={style_sheet.container}>
            {command === "none" && (<>
                <ShutdownButton 
                    sendControlSignal={sendControlSignal} 
                    setConnectionStatus={connection.setConnectionStatus} 
                    navigation={navigation}
                />
                <View>
                    <TouchableOpacity style={{...style_sheet.generic_button, marginBottom: 30, width: '80%', height: 60}} onPress={() => setCommand("keyboard")}>
                        <Text style={style_sheet.button_text} onPress={() => setCommand("keyboard")}>Keyboard</Text>
                        <EntypoIcon name="keyboard" size={40} color={themes.default.primary} style={{...style_sheet.button_icon, }}/>
                    </TouchableOpacity>
                    <TouchableOpacity style={{...style_sheet.generic_button, width: '80%', height: 60}} onPress={() => setCommand("mouse")}>
                        <Text style={style_sheet.button_text} onPress={() => setCommand("mouse")}>Mouse</Text>
                        <MaterialIcon name="mouse" size={40} color={themes.default.primary} style={style_sheet.button_icon}/>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={{...style_sheet.generic_button, marginTop: 30, backgroundColor: themes.default.primary, width: '80%', height: 60}} 
                        onPress={() => tcp.cleanupTcp()}>
                    </TouchableOpacity>
                </View>
            </>)}
            {command === "keyboard" && (
                <View style={style_sheet.text_input_container}>
                    <TextInput 
                        ref={keyboard_input_ref} 
                        cursorColor={themes.default.primary} style={style_sheet.text_input} autoCapitalize='none' 
                        multiline={true} numberOfLines={1} value={keyboard_input}
                        onChangeText={(new_text) =>{
                            if(new_text.endsWith('\n')){
                                new_text = new_text.slice(0, -1);
                                sendControlSignal("COMMAND:KEYPRESS<" + new_text + ">");
                                setKeyboardInput("");
                                return;
                            }
                            setKeyboardInput(new_text);
                        }}
                    />
                    <View style={{flexDirection: 'row', justifyContent: 'center', width: '80%'}}>
                        <TouchableOpacity 
                            style={{...style_sheet.generic_button, width: '40%', height: 60, marginTop: 30, marginRight: 10}} 
                            onPress={() => sendControlSignal("COMMAND:VOLUME_DOWN")}
                        >
                            <FeatherIcon name="volume-1" size={30} color={themes.default.primary} style={{marginLeft: 8}}/>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={{...style_sheet.generic_button, width: '40%', height: 60, marginTop: 30}} 
                            onPress={() => sendControlSignal("COMMAND:VOLUME_UP")}
                        >
                            <FeatherIcon name="volume-2" size={30} color={themes.default.primary} style={{}}/>
                        </TouchableOpacity>
                    </View>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', width: '100%', position: 'absolute', bottom: keyboard_height}}>
                        <TouchableOpacity 
                            style={{...style_sheet.generic_button, width: '30%', marginBottom: 10}} 
                            onPress={() => sendControlSignal("COMMAND:KEYPRESS_BACKSPACE")}
                        >
                            <MaterialDesignIcons name="keyboard-backspace" size={25} color={themes.default.primary} style={style_sheet.button_icon}/>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={{...style_sheet.generic_button, width: '30%', marginBottom: 10}} 
                            onPress={() => sendControlSignal("COMMAND:KEYPRESS_ENTER")}
                        >
                            <MaterialDesignIcons name="keyboard-return" size={25} color={themes.default.primary} style={style_sheet.button_icon}/>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            {command === "mouse" && (
                <View style={style_sheet.mousepad_container}>
                    <Mousepad
                        onClick={(coordinates) => onMouseClick(coordinates.x, coordinates.y)}
                        onScroll={(coordinates) => onMouseScroll(coordinates.x, coordinates.y)}
                        onMove={(coordinates) => onMouseMove(coordinates.x, coordinates.y)}
                        onPinch={(scale) => onMousePinch(scale)}
                    />
                    <MaterialIcon name="mouse" size={40} color={themes.default.primary} style={{...style_sheet.button_icon, bottom: 10}}/>
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
    generic_button_container: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-evenly',
    },
    generic_button: {
        position: 'relative',
        height: 45,
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
    mousepad_container: {
        position: 'relative',
        height: '70%',
        width: '90%',
        borderWidth: 3,
        borderColor: themes.default.secondary,
        borderRadius: 10,
    },
});



export default Controller;