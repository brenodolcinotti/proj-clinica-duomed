
import * as SecureStore from 'expo-secure-store';

const CHAVE_TOKEN = 'duomed_token';
const CHAVE_BIOMETRIA = 'duomed_biometria_habilitada';

export async function salvarToken(token) {
  await SecureStore.setItemAsync(CHAVE_TOKEN, token);
}

export async function obterToken() {
  return await SecureStore.getItemAsync(CHAVE_TOKEN);
}

export async function limparToken() {
  await SecureStore.deleteItemAsync(CHAVE_TOKEN);
}

export async function salvarPreferenciaBiometria() {
  await SecureStore.setItemAsync(CHAVE_BIOMETRIA, 'true');
}

export async function obterPreferenciaBiometria() {
  const valor = await SecureStore.getItemAsync(CHAVE_BIOMETRIA);
  return valor === 'true';
}