import { OAuth2Client } from 'google-auth-library';

import { env } from '../../config/env';
import { HttpError } from '../../errors/http-error';

export interface VerifiedGoogleUser {
  email: string;
  googleId: string;
}

export type GoogleTokenVerifier = (idToken: string) => Promise<VerifiedGoogleUser>;

let customVerifier: GoogleTokenVerifier | null = null;

export function setGoogleTokenVerifier(verifier: GoogleTokenVerifier | null): void {
  customVerifier = verifier;
}

const client = new OAuth2Client();

const VALID_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleUser> {
  if (customVerifier) {
    return customVerifier(idToken);
  }

  try {
    const ticket = await client.verifyIdToken({
      audience: env.googleClientIds.length > 0 ? env.googleClientIds : undefined,
      idToken,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new HttpError(401, 'INVALID_GOOGLE_TOKEN', 'Google ID token payload is missing.');
    }

    if (!payload.iss || !VALID_ISSUERS.has(payload.iss)) {
      throw new HttpError(401, 'INVALID_GOOGLE_TOKEN', 'Google ID token issuer is invalid.');
    }

    const { sub: googleId, email, email_verified: emailVerified } = payload;

    if (!googleId || !email) {
      throw new HttpError(401, 'INVALID_GOOGLE_TOKEN', 'Google ID token is missing required user identity.');
    }

    if (emailVerified !== true) {
      throw new HttpError(400, 'UNVERIFIED_GOOGLE_EMAIL', 'Google account email is not verified.');
    }

    return {
      email: email.trim().toLowerCase(),
      googleId,
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(401, 'INVALID_GOOGLE_TOKEN', 'Google ID token is invalid or expired.');
  }
}
