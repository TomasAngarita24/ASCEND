import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { colors } from '../theme';

type Props = {
  name: string;
  size?: number;
  color?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export default function IconButton({
  name,
  size = 20,
  color = colors.text,
  onPress,
  style,
  accessibilityLabel,
}: Props) {
  return (
    <TouchableOpacity accessibilityLabel={accessibilityLabel} onPress={onPress} style={[styles.button, style]}>
      <MaterialIcons name={name} size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 999,
  },
});
