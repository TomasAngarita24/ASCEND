import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

import { RestTimer } from './src/features/rest-timer/rest-timer';

export default function App(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <RestTimer defaultDurationSeconds={90} />
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
