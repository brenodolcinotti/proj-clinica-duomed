import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import { consultarCep } from '../services/viacep';

export default function PacienteForm({
  pacienteInicial,
  onSave,
  navigation,
}) {
  // Dados do paciente
  const [nome, setNome] = useState(pacienteInicial?.nome || '');
  const [cpf, setCpf] = useState(pacienteInicial?.cpf || '');
  const [dataNascimento, setDataNascimento] = useState(
    pacienteInicial?.dataNascimento || ''
  );
  const [telefone, setTelefone] = useState(
    pacienteInicial?.telefone || ''
  );
  const [email, setEmail] = useState(
    pacienteInicial?.email || ''
  );

  // Dados de endereço
  const [cep, setCep] = useState(pacienteInicial?.cep || '');
  const [logradouro, setLogradouro] = useState(
    pacienteInicial?.logradouro || ''
  );
  const [bairro, setBairro] = useState(
    pacienteInicial?.bairro || ''
  );
  const [cidade, setCidade] = useState(
    pacienteInicial?.cidade || ''
  );
  const [uf, setUf] = useState(
    pacienteInicial?.uf || ''
  );

  // Estados de carregamento
  const [consultandoCep, setConsultandoCep] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Consulta o ViaCEP quando o usuário sai do campo CEP
  const handleCepBlur = async () => {
    const cepLimpo = cep.replace(/\D/g, '');

    // Não faz requisição se não tiver 8 dígitos
    if (cepLimpo.length !== 8) {
      return;
    }

    setConsultandoCep(true);

    try {
      const endereco = await consultarCep(cepLimpo);

      // Preenche os campos com os dados encontrados
      setLogradouro(endereco.logradouro);
      setBairro(endereco.bairro);
      setCidade(endereco.cidade);
      setUf(endereco.uf);

    } catch (error) {
      console.error('Erro ao consultar ViaCEP:', error);

      Alert.alert(
        'Consulta de CEP',
        error.message ||
          'Não foi possível consultar o CEP. Você pode preencher o endereço manualmente.'
      );

    } finally {
      setConsultandoCep(false);
    }
  };

  const handleSubmit = async () => {
    if (!nome || !cpf) {
      Alert.alert(
        'Atenção',
        'Preencha os campos obrigatórios: Nome e CPF.'
      );

      return;
    }

    setSalvando(true);

    try {
      const formData = {
        nome,
        cpf,
        dataNascimento,
        telefone,
        email,
        cep,
        logradouro,
        bairro,
        cidade,
        uf,
      };

      await onSave(formData);

      Alert.alert(
        'Sucesso',
        'Paciente salvo com sucesso!'
      );

      navigation.goBack();

    } catch (error) {
      Alert.alert(
        'Erro',
        error.message
      );

    } finally {
      setSalvando(false);
    }
  };

  return (
    <ScrollView style={styles.form}>

      {/* NOME */}
      <Text style={styles.label}>
        Nome
      </Text>

      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Nome completo do paciente"
      />

      {/* CPF */}
      <Text style={styles.label}>
        CPF
      </Text>

      <TextInput
        style={styles.input}
        value={cpf}
        onChangeText={setCpf}
        placeholder="Ex: 111.111.111-11"
        keyboardType="numeric"
      />

      {/* DATA DE NASCIMENTO */}
      <Text style={styles.label}>
        Data de Nascimento
      </Text>

      <TextInput
        style={styles.input}
        value={dataNascimento}
        onChangeText={setDataNascimento}
        placeholder="Ex: 1990-04-12"
      />

      {/* TELEFONE */}
      <Text style={styles.label}>
        Telefone
      </Text>

      <TextInput
        style={styles.input}
        value={telefone}
        onChangeText={setTelefone}
        placeholder="Ex: (31) 91111-1111"
        keyboardType="phone-pad"
      />

      {/* E-MAIL */}
      <Text style={styles.label}>
        E-mail
      </Text>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Ex: paciente@exemplo.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* CEP */}
      <Text style={styles.label}>
        CEP
      </Text>

      <TextInput
        style={styles.input}
        value={cep}
        onChangeText={setCep}
        onBlur={handleCepBlur}
        placeholder="Ex: 13560-042"
        keyboardType="numeric"
        maxLength={9}
      />

      {/* CARREGANDO CEP */}
      {consultandoCep && (
        <View style={styles.carregando}>
          <ActivityIndicator size="small" />

          <Text style={styles.textoCarregando}>
            Consultando CEP...
          </Text>
        </View>
      )}

      {/* LOGRADOURO */}
      <Text style={styles.label}>
        Logradouro
      </Text>

      <TextInput
        style={styles.input}
        value={logradouro}
        onChangeText={setLogradouro}
        placeholder="Rua, avenida, etc."
      />

      {/* BAIRRO */}
      <Text style={styles.label}>
        Bairro
      </Text>

      <TextInput
        style={styles.input}
        value={bairro}
        onChangeText={setBairro}
        placeholder="Bairro"
      />

      {/* CIDADE */}
      <Text style={styles.label}>
        Cidade
      </Text>

      <TextInput
        style={styles.input}
        value={cidade}
        onChangeText={setCidade}
        placeholder="Cidade"
      />

      {/* UF */}
      <Text style={styles.label}>
        UF
      </Text>

      <TextInput
        style={styles.input}
        value={uf}
        onChangeText={setUf}
        placeholder="Ex: SP"
        maxLength={2}
        autoCapitalize="characters"
      />

      {/* BOTÃO SALVAR */}
      <View style={styles.botaoContainer}>
        <Button
          title={salvando ? 'Salvando...' : 'Salvar'}
          onPress={handleSubmit}
          disabled={salvando || consultandoCep}
        />
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: {
    flex: 1,
    padding: 10,
  },

  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    marginTop: 10,
  },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
  },

  carregando: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  textoCarregando: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },

  botaoContainer: {
    marginTop: 30,
    marginBottom: 40,
  },
});