import React, { use, useCallback } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';

import { StyleSheet } from 'react-native';
import { themes } from '../styles/themes';
//@ts-ignore
import IonIcon from 'react-native-vector-icons/Ionicons';
import { LongPressProgressRing } from './longPressProgressRing';



interface ShutdownButtonProps {
    sendControlSignal: (command: string) => void;
    setConnectionStatus: (status: string) => void;
    navigation: any;
}



export const ShutdownButton = (props: ShutdownButtonProps) => {

    const shutdow_progress_value = useSharedValue(0);

    const handleShutdown = useCallback(() => {
        props.sendControlSignal('COMMAND:SHUTDOWN');
        props.setConnectionStatus("disconnected");
        props.navigation.navigate("default");
    }, [props]);

    const shutdownGesture = Gesture.LongPress().minDuration(1000)
    .onBegin(() => {
        shutdow_progress_value.value = withTiming(1, { duration: 1000 });
    })
    .onFinalize(() => {
        shutdow_progress_value.value = 0;
        cancelAnimation(shutdow_progress_value);
    })
    .onEnd(() => {
        runOnJS(handleShutdown)();
    });


    return (
        <GestureDetector gesture={shutdownGesture}>
            <Animated.View style={style_sheet.power_button_container}>
                <IonIcon name="power" size={70} color={themes.default.primary}/>
                <LongPressProgressRing 
                    progress={shutdow_progress_value} 
                    style={style_sheet.progress_circle_container}
                    size={200} strokeWidth={6}
                    progress_stroke_color='red'
                />
            </Animated.View>
        </GestureDetector>
    );
};



const style_sheet = StyleSheet.create({
    power_button_container: {
        position: 'relative',
        width: 100,
        height: 100,
        borderRadius: 100,
        backgroundColor: "red",
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
    },
    progress_circle_container: {
        position: 'absolute',
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
