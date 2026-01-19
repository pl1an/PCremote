import React from "react";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useAnimatedProps,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import themes from "../styles/themes";



interface ProgressCircleProps {
    progress: SharedValue<number>;
    style?: object;
    size?: number;
    strokeWidth?: number;
    base_fill_color?: string;
    base_stroke_color?: string;
    progress_fill_color?: string;
    progress_stroke_color?: string;
}


const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function LongPressProgressRing(props: ProgressCircleProps) {

    const RADIUS = ((props.size ?? 100) - (props.strokeWidth ?? 4)) / 2;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: CIRCUMFERENCE * (1 - props.progress.value),
        strokeOpacity: props.progress.value === 0 ? 0 : 1,
    }));

    return (
        <Svg width={props.size} height={props.size} style={props.style ?? {}}>
            <Circle
                cx={(props.size ?? 100) / 2}
                cy={(props.size ?? 100) / 2}
                r={RADIUS}
                stroke={props.base_stroke_color ?? "none"}
                strokeWidth={props.strokeWidth ?? 4}
                fill={props.base_fill_color ?? "none"}
            />

            <AnimatedCircle
                cx={(props.size ?? 100) / 2}
                cy={(props.size ?? 100) / 2}
                r={RADIUS}
                stroke={props.progress_stroke_color ?? themes.default.primary}
                strokeWidth={props.strokeWidth ?? 4}
                fill={props.progress_fill_color ?? "none"}
                strokeDasharray={CIRCUMFERENCE}
                animatedProps={animatedProps}
                strokeLinecap="round"
            />
        </Svg>
    );
}
