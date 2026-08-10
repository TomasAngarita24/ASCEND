import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '../../lib/api-client';
import type { AuthSession } from './auth.types';
import { AuthService } from './auth.service';

interface AuthScreenProps {
  authService: AuthService;
  onAuthenticated: (session: AuthSession) => void;
}

export function AuthScreen({ authService, onAuthenticated }: AuthScreenProps): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const session = isRegistering
        ? await authService.register({ email, password })
        : await authService.login({ email, password });
      onAuthenticated(session);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible conectar con ASCEND.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ASCEND</Text>
      <Text style={styles.subtitle}>{isRegistering ? 'Crea tu cuenta' : 'Inicia sesión'}</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Correo electrónico"
        style={styles.input}
        value={email}
      />
      <TextInput
        autoComplete={isRegistering ? 'new-password' : 'current-password'}
        onChangeText={setPassword}
        placeholder="Contraseña"
        secureTextEntry
        style={styles.input}
        value={password}
      />
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={submit} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>{isSubmitting ? 'Procesando...' : isRegistering ? 'Crear cuenta' : 'Ingresar'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={() => setIsRegistering((value) => !value)}>
        <Text style={styles.link}>{isRegistering ? 'Ya tengo una cuenta' : 'Crear una cuenta'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    padding: 24,
  },
  error: {
    color: '#b91c1c',
  },
  input: {
    borderColor: '#9ca3af',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  link: {
    color: '#1d4ed8',
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  subtitle: {
    color: '#4b5563',
    fontSize: 18,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
});
