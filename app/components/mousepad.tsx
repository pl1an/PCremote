import { useCallback } from 'react';
import { View, StyleSheet, Share } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, runOnJS, SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
// @ts-ignore
import { LongPressProgressRing } from './longPressProgressRing';


interface point{
    x: number;
    y: number;
}

interface MousepadProps {
    onMove: (position: point) => void;
    onScroll: (position: point) => void;
    onClick: (position: point) => void;
    onPinch: (scale: number) => void;
    longPressDuration?: number;
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

    const click_progress = useSharedValue(0);
    const last_click_position = useSharedValue({ x: 0, y: 0 });
    const click_progress_style = useAnimatedStyle(() => {
        return {
            visibility: click_progress.value > 0 ? 'visible' : 'hidden',
            left: last_click_position.value.x - 30,
            top: last_click_position.value.y - 30,
        };
    });
    const tap_gesture = Gesture.LongPress().minDuration(props.longPressDuration ?? 500)
    .onBegin((event) => {
        click_progress.value = withTiming(1, { duration: props.longPressDuration ?? 500 });
        last_click_position.value = { x: event.x, y: event.y };
    })
    .onFinalize(() => {
        click_progress.value = 0;
        cancelAnimation(click_progress);
    })
    .onEnd((event) => {
        runOnJS(handleClick)(event.x, event.y);
    });

    const pinch_gesture = Gesture.Pinch().onUpdate((event) => {
        runOnJS(handlePinch)(event.scale);
    });


    return (
        <GestureDetector gesture={Gesture.Simultaneous(move_gesture, scroll_gesture, tap_gesture, pinch_gesture)}>
            <View style={styles.container}>
                <Animated.View style={[styles.progress_circle_container, click_progress_style]}>
                    <LongPressProgressRing 
                        progress={click_progress}
                        size={100}
                        strokeWidth={4}
                    />
                </Animated.View>
            </View>
        </GestureDetector>
    );
}



const styles = StyleSheet.create({
    container: {
        position: 'relative',
        flex: 1,
    },
    progress_circle_container: {
        position: 'absolute',
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

