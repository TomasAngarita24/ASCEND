import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import AnimatedPressable from '../../components/AnimatedPressable';
import { colors, typography, spacing } from '../../theme';
import Card from '../../components/Card';

import { ApiError } from '../../lib/api-client';
import type { AuthSession } from './auth.types';
import { AuthService } from './auth.service';

interface AuthScreenProps {
  authService: AuthService;
  onAuthenticated: (session: AuthSession) => void;
  onGoogleSignIn?: () => Promise<string | null>;
}

export function AuthScreen({ authService, onAuthenticated, onGoogleSignIn }: AuthScreenProps): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
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

  const handleGoogleSignIn = async () => {
    if (!onGoogleSignIn) {
      setError('Google Sign-In no está configurado en este entorno.');
      return;
    }
    setIsGoogleSubmitting(true);
    setError(null);
    try {
      const idToken = await onGoogleSignIn();
      if (!idToken) {
        return;
      }
      const session = await authService.loginWithGoogle(idToken);
      onAuthenticated(session);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible autenticar con Google.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <View style={styles.background}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <View style={styles.overlay} />

      <View style={styles.brandHeader}>
        <Text style={styles.brandName}>ASCEND</Text>
      </View>

      <View style={styles.content}>
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{isRegistering ? 'Crea tu cuenta' : 'Inicia sesión'}</Text>
            <Text style={styles.subtitle}>
              {isRegistering
                ? 'Comienza tu plan de entrenamiento con energía y foco.'
                : 'Tu próxima sesión empieza aquí.'}
            </Text>
          </View>
          <View style={styles.form}>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Correo electrónico"
              placeholderTextColor="#8b95a8"
              style={styles.input}
              value={email}
            />
            <TextInput
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              onChangeText={setPassword}
              placeholder="Contraseña"
              placeholderTextColor="#8b95a8"
              secureTextEntry
              style={styles.input}
              value={password}
            />
            {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <AnimatedPressable
              accessibilityRole="button"
              disabled={isSubmitting || isGoogleSubmitting}
              onPress={submit}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting ? 'Procesando...' : isRegistering ? 'Crear cuenta' : 'Ingresar'}
              </Text>
            </AnimatedPressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.dividerLine} />
            </View>

            <AnimatedPressable
              accessibilityRole="button"
              disabled={isSubmitting || isGoogleSubmitting}
              onPress={handleGoogleSignIn}
              style={styles.googleButton}
            >
              <Text style={styles.googleButtonText}>
                {isGoogleSubmitting ? 'Conectando con Google...' : 'Continuar con Google'}
              </Text>
            </AnimatedPressable>
          </View>
        </Card>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {isRegistering ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
        </Text>
        <AnimatedPressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={() => setIsRegistering((value) => !value)}
        >
          <Text style={styles.footerLink}>
            {isRegistering ? 'Inicia sesión' : 'Crear una cuenta'}
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    backgroundColor: colors.background,
    flex: 1,
  },
  brandHeader: {
    alignItems: 'center',
    paddingBottom: spacing(2),
    paddingTop: spacing(4),
  },
  brandName: {
    color: colors.accentAlt,
    fontSize: typography.h1,
    fontWeight: '800',
    letterSpacing: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 28,
    borderWidth: 1,
    gap: spacing(2.5),
    marginHorizontal: spacing(3),
    padding: spacing(3),
  },
  cardHeader: {
    gap: spacing(1),
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  error: {
    color: colors.danger,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: spacing(4),
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2),
  },
  footerLink: {
    color: colors.accentAlt,
    fontWeight: '700',
  },
  footerText: {
    color: colors.muted,
  },
  form: {
    gap: 12,
  },
  glowBottom: {
    backgroundColor: 'rgba(34, 197, 94, 0.20)',
    borderRadius: 999,
    bottom: -40,
    height: 220,
    position: 'absolute',
    right: -80,
    width: 220,
  },
  glowTop: {
    backgroundColor: 'rgba(125, 211, 252, 0.18)',
    borderRadius: 999,
    height: 180,
    left: -70,
    position: 'absolute',
    top: 50,
    width: 180,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    paddingHorizontal: spacing(1.75),
    paddingVertical: spacing(1.6),
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.42)',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: spacing(1.75),
  },
  primaryButtonText: {
    color: '#052e16',
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  title: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: '700',
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing(1.5),
    marginVertical: spacing(0.5),
  },
  dividerLine: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  googleButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: spacing(1.75),
  },
  googleButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
