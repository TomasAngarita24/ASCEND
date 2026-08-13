import React from 'react';
import { Animated, Pressable, PressableProps, PressableStateCallbackType, StyleProp, ViewStyle } from 'react-native';

type PressableChildren = (state: PressableStateCallbackType) => React.ReactNode;

type Props = PressableProps & {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode | PressableChildren;
};

export default function AnimatedPressable({ children, style, ...rest }: Props) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, mass: 1 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, mass: 1 }).start();

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} {...rest}>
      {(state: PressableStateCallbackType) => (
        <Animated.View style={[{ transform: [{ scale }] }, style as StyleProp<ViewStyle>]}>
          {typeof children === 'function' ? (children as PressableChildren)(state) : (children as React.ReactNode)}
        </Animated.View>
      )}
    </Pressable>
  );
}
