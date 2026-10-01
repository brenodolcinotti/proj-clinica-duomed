import * as SecureStore from 'expo-secure-store';

const CHAVE_TOKEN = 'duomed_token';

export async function salvarToken(token) {
  await SecureStore.setItemAsync(CHAVE_TOKEN, token);
}

export async function obterToken() {
  return await SecureStore.getItemAsync(CHAVE_TOKEN);
}

export async function limparToken() {
  await SecureStore.deleteItemAsync(CHAVE_TOKEN);
}