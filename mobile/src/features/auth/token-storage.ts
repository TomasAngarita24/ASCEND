import * as Keychain from 'react-native-keychain';

import type { Tokens } from './auth.types';

const service = 'ascend.auth';
const username = 'tokens';

export class TokenStorage {
  async read(): Promise<Tokens | null> {
    const credentials = await Keychain.getGenericPassword({ service });
    if (!credentials) {
      return null;
    }
    try {
      return JSON.parse(credentials.password) as Tokens;
    } catch {
      await this.clear();
      return null;
    }
  }

  async save(tokens: Tokens): Promise<void> {
    await Keychain.setGenericPassword(username, JSON.stringify(tokens), { service });
  }

  async clear(): Promise<void> {
    await Keychain.resetGenericPassword({ service });
  }
}
