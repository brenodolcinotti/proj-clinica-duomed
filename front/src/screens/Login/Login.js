import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet
} from 'react-native';

import * as LocalAuthentication from 'expo-local-authentication';

import {
  salvarToken,
  obterToken
} from '../../services/sessao';

export default function Login({ navigation }) {

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const [temBiometria, setTemBiometria] = useState(false);
  const [verificandoBiometria, setVerificandoBiometria] = useState(true);

  useEffect(() => {
    verificarBiometria();
  }, []);

  const verificarBiometria = async () => {
    try {
      const token = await obterToken();

      // Sem token, não oferecemos login por biometria.
      if (!token) {
        setTemBiometria(false);
        return;
      }

      const temHardware = await LocalAuthentication.hasHardwareAsync();

      if (!temHardware) {
        setTemBiometria(false);
        return;
      }

      const biometriaCadastrada =
        await LocalAuthentication.isEnrolledAsync();

      if (!biometriaCadastrada) {
        setTemBiometria(false);
        return;
      }

      setTemBiometria(true);

    } catch (error) {
      console.log('Erro ao verificar biometria:', error);
      setTemBiometria(false);
    } finally {
      setVerificandoBiometria(false);
    }
  };

  const entrarComSenha = async () => {
    if (!email || !senha) {
      Alert.alert(
        'Atenção',
        'Informe o e-mail e a senha.'
      );
      return;
    }

    try {
      // Sessão local para o projeto.
      // A autenticação real poderá ser ligada à API posteriormente.
      const token = `duomed_${Date.now()}`;

      await salvarToken(token);

      Alert.alert(
        'Login realizado',
        'Você entrou no DuoMed.'
      );

      navigation.replace('Menu');

    } catch (error) {
      Alert.alert(
        'Erro',
        'Não foi possível realizar o login.'
      );
    }
  };

  const entrarComBiometria = async () => {
    try {
      const token = await obterToken();

      if (!token) {
        Alert.alert(
          'Sessão não encontrada',
          'Entre primeiro usando e-mail e senha.'
        );
        return;
      }

      const resultado =
        await LocalAuthentication.authenticateAsync({
          promptMessage: 'Desbloquear DuoMed',
          cancelLabel: 'Cancelar',
          fallbackLabel: 'Usar senha'
        });

      if (resultado.success) {
        navigation.replace('Menu');
        return;
      }

      // Cancelamento não é tratado como erro.
      if (resultado.error === 'user_cancel') {
        return;
      }

      Alert.alert(
        'Biometria',
        'Não foi possível confirmar sua biometria.'
      );

    } catch (error) {
      Alert.alert(
        'Erro',
        'Não foi possível utilizar a biometria.'
      );
    }
  };

  return (
    <View style={styles.container}>

      <Text style={styles.titulo}>
        DuoMed
      </Text>

      <Text style={styles.subtitulo}>
        Acesse sua conta
      </Text>

      <Text style={styles.label}>
        E-mail
      </Text>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Digite seu e-mail"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>
        Senha
      </Text>

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
    backgroundColor: '#f5f5f5'
  },

  titulo: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8
  },

  subtitulo: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30
  },

  label: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 10
  },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 12,
    fontSize: 16
  },

  botao: {
    marginTop: 20
  }
});