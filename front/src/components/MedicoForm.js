import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  ScrollView,
  Image
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

export default function MedicoForm({ medicoInicial, onSave, navigation }) {

  // Estados para os campos do formulário
  const [nome, setNome] = useState(medicoInicial?.nome || '');
  const [especialidade, setEspecialidade] = useState(medicoInicial?.especialidade || '');
  const [crm, setCrm] = useState(medicoInicial?.crm || '');
  const [email, setEmail] = useState(medicoInicial?.email || '');
  const [telefone, setTelefone] = useState(medicoInicial?.telefone || '');
  const [endereco, setEndereco] = useState(medicoInicial?.endereco || '');

  // Estado da foto
  const [fotoUri, setFotoUri] = useState(medicoInicial?.fotoUri || null);

  // Estado para controlar o botão e evitar duplo toque
  const [salvando, setSalvando] = useState(false);

  // Abre a câmera somente depois de verificar a permissão
  const tirarFoto = async () => {

    const permissao = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert(
        'Permissão necessária',
        'Precisamos da permissão da câmera para tirar a foto do médico.'
      );
      return;
    }

    const resultado = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });

    if (resultado.canceled) {
      return;
    }

    setFotoUri(resultado.assets[0].uri);
  };

  const handleSubmit = async () => {

    // Validação simples
    if (!nome || !especialidade || !crm) {
      Alert.alert(
        'Atenção',
        'Preencha os campos obrigatórios: Nome, Especialidade e CRM.'
      );
      return;
    }

    setSalvando(true);

    try {

      const formData = {
        nome,
        especialidade,
        crm,
        email,
        telefone,
        endereco,
        fotoUri
      };

      await onSave(formData);

      Alert.alert('Sucesso', 'Médico salvo com sucesso!');

      navigation.goBack();

    } catch (error) {

      Alert.alert('Erro', error.message);

    } finally {

      setSalvando(false);

    }
  };

  return (
    <ScrollView style={styles.form}>

      {fotoUri && (
        <Image
          source={{ uri: fotoUri }}
          style={styles.foto}
        />
      )}

      <Text style={styles.label}>Nome</Text>

      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Nome do médico"
      />

      <Text style={styles.label}>Especialidade</Text>

      <TextInput
        style={styles.input}
        value={especialidade}
        onChangeText={setEspecialidade}
        placeholder="Ex: Cardiologista"
      />

      <Text style={styles.label}>CRM</Text>

      <TextInput
        style={styles.input}
        value={crm}
        onChangeText={setCrm}
        placeholder="Ex: 12345/MG"
      />

      <Text style={styles.label}>E-mail</Text>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Ex: email@clinica.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Telefone</Text>

      <TextInput
        style={styles.input}
        value={telefone}
        onChangeText={setTelefone}
        placeholder="Ex: (31) 98765-4321"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Endereço</Text>

      <TextInput
        style={styles.input}
        value={endereco}
        onChangeText={setEndereco}
        placeholder="Endereço completo"
      />

      <View style={styles.botaoContainer}>

        <Button
          title="Tirar foto"
          onPress={tirarFoto}
        />

      </View>

      <View style={styles.botaoContainer}>

        <Button
          title={salvando ? 'Salvando...' : 'Salvar'}
          onPress={handleSubmit}
          disabled={salvando}
        />

      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  form: {
    flex: 1
  },

  foto: {
  width: 150,
  height: 150,
  borderRadius: 75,
  alignSelf: 'center',
  marginBottom: 20
  },

  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    marginTop: 10
  },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 10,
    fontSize: 16
  },

  botaoContainer: {
    marginTop: 30,
    marginBottom: 10
  }

});
