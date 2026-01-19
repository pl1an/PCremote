import LottieView from 'lottie-react-native';
import { useCallback } from 'react';
import { View, StyleSheet, Share } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS, SharedValue, useSharedValue } from 'react-native-reanimated';


interface point{
    x: number;
    y: number;
}

interface MousepadProps {
    onMove: (position: point) => void;
    onClick: (position: point) => void;
}


export default function Mousepad(props: MousepadProps) {
    const handleMove = useCallback((x: number, y: number) => {
        props.onMove({ x, y });
    }, [props.onMove]);

    const handleClick = useCallback((x: number, y: number) => {
        props.onClick({ x, y });
    }, [props.onClick]);

    const pan_gesture = Gesture.Pan().onUpdate((event) => {
        runOnJS(handleMove)(event.translationX, event.translationY);
    });

    const tap_gesture = Gesture.Tap().onEnd((event) => {
        runOnJS(handleClick)(event.x, event.y);
    });

    return (
        <GestureHandlerRootView>
            <GestureDetector gesture={Gesture.Simultaneous(pan_gesture, tap_gesture)}>
                <View style={styles.container}>
                </View>
            </GestureDetector>
        </GestureHandlerRootView>
    );
}



const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
