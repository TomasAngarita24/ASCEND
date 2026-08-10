import React from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';

export default function App(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <Text>ASCEND mobile app scaffold</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
