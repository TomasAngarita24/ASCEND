import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { colors, shadow } from '../theme';

const Card: React.FC<ViewProps> = ({ children, style, ...rest }) => {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    ...shadow,
  },
});

export default Card;
