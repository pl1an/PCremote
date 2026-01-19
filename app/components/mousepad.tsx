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
    onScroll: (position: point) => void;
    onClick: (position: point) => void;
    onPinch: (scale: number) => void;
}


export default function Mousepad(props: MousepadProps) {

    const handleMove = useCallback((x: number, y: number) => {
        props.onMove({ x, y });
    }, [props.onMove]);
    const handleScroll = useCallback((x: number, y: number) => {
        props.onScroll({ x, y });
    }, [props.onScroll]);
    const handleClick = useCallback((x: number, y: number) => {
        props.onClick({ x, y });
    }, [props.onClick]);
    const handlePinch = useCallback((scale: number) => {
        props.onPinch(scale);
    }, [props.onPinch]);


    const move_gesture = Gesture.Pan().maxPointers(1).onUpdate((event) => {
        runOnJS(handleMove)(event.translationX, event.translationY);
    });
    const scroll_gesture = Gesture.Pan().minPointers(2).maxPointers(2).onUpdate((event) => {
        runOnJS(handleScroll)(event.translationX, event.translationY);
    });
    const tap_gesture = Gesture.LongPress().minDuration(500).onEnd((event) => {
        runOnJS(handleClick)(event.x, event.y);
    });
    const pinch_gesture = Gesture.Pinch().onUpdate((event) => {
        runOnJS(handlePinch)(event.scale);
    });


    return (
        <GestureHandlerRootView>
            <GestureDetector gesture={Gesture.Simultaneous(move_gesture, scroll_gesture, tap_gesture, pinch_gesture)}>
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
