import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
} from 'react-native';

import * as LocalAuthentication from 'expo-local-authentication';

import {
  salvarToken,
  obterToken,
  salvarPreferenciaBiometria,
  obterPreferenciaBiometria,
} from '../../services/sessao';

export default function Login({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [temBiometria, setTemBiometria] = useState(false);
  const [verificandoBiometria, setVerificandoBiometria] =
    useState(true);

  useEffect(() => {
    verificarBiometria();
  }, []);

  const verificarBiometria = async () => {
    try {
      const preferenciaBiometria =
        await obterPreferenciaBiometria();

      const temHardware =
        await LocalAuthentication.hasHardwareAsync();

      const biometriaCadastrada =
        await LocalAuthentication.isEnrolledAsync();

      setTemBiometria(
        preferenciaBiometria &&
          temHardware &&
          biometriaCadastrada
      );
    } catch (error) {
      console.log('Erro ao verificar biometria:', error);
      setTemBiometria(false);
    } finally {
      setVerificandoBiometria(false);
    }
  };

  const entrarComSenha = async () => {
    if (!email.trim() || !senha) {
      Alert.alert(
        'Atenção',
        'Informe o e-mail e a senha.'
      );
      return;
    }

    try {
      // Sessão local de demonstração do projeto.
      // A autenticação real deverá ser validada pela API.
      const token = `duomed_${Date.now()}`;

      await salvarToken(token);

      const temHardware =
        await LocalAuthentication.hasHardwareAsync();

      const biometriaCadastrada =
        await LocalAuthentication.isEnrolledAsync();

      if (temHardware && biometriaCadastrada) {
        await salvarPreferenciaBiometria();
      }

      Alert.alert(
        'Login realizado',
        'Você entrou no DuoMed.',
        [
          {
            text: 'OK',
            onPress: () => navigation.replace('Menu'),
          },
        ]
      );
    } catch (error) {
      console.log('Erro ao realizar login:', error);

      Alert.alert(
        'Erro',
        'Não foi possível realizar o login.'
      );
    }
  };

  const entrarComBiometria = async () => {
    try {
      const resultado =
        await LocalAuthentication.authenticateAsync({
          promptMessage: 'Desbloquear DuoMed',
          cancelLabel: 'Cancelar',
          fallbackLabel: 'Usar senha',
        });

      if (!resultado.success) {
        if (resultado.error !== 'user_cancel') {
          Alert.alert(
            'Biometria',
            'Não foi possível confirmar sua biometria.'
          );
        }
        return;
      }

      const token = await obterToken();

      if (!token) {
        Alert.alert(
          'Sessão encerrada',
          'Sua biometria foi confirmada, mas sua sessão terminou. Entre com e-mail e senha para iniciar uma nova sessão.'
        );
        return;
      }

      navigation.replace('Menu');
    } catch (error) {
      console.log('Erro no login biométrico:', error);

      Alert.alert(
        'Erro',
        'Não foi possível utilizar a biometria.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>DuoMed</Text>

      <Text style={styles.subtitulo}>
        Acesse sua conta
      </Text>

      <Text style={styles.label}>E-mail</Text>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Digite seu e-mail"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Senha</Text>

      <TextInput
        style={styles.input}
        value={senha}
        onChangeText={setSenha}
        placeholder="Digite sua senha"
        secureTextEntry
      />

      <View style={styles.botao}>
        <Button
          title="Entrar com e-mail e senha"
          onPress={entrarComSenha}
        />
      </View>

      {!verificandoBiometria && temBiometria && (
        <View style={styles.botao}>
          <Button
            title="Entrar com biometria"
            onPress={entrarComBiometria}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },

  titulo: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },

  subtitulo: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
  },

  label: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 10,
  },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
  },

  botao: {
    marginTop: 20,
  },
});