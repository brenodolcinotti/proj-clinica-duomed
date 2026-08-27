import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, ScrollView } from 'react-native';

export default function PacienteForm({ pacienteInicial, onSave, navigation }) {
  // Estados para os campos do formulário baseados no db_clinica
  const [nome, setNome] = useState(pacienteInicial?.nome || '');
  const [cpf, setCpf] = useState(pacienteInicial?.cpf || '');
  const [dataNascimento, setDataNascimento] = useState(pacienteInicial?.dataNascimento || '');
  const [telefone, setTelefone] = useState(pacienteInicial?.telefone || '');
  const [email, setEmail] = useState(pacienteInicial?.email || '');
  
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async () => {
    if (!nome || !cpf) {
      Alert.alert('Atenção', 'Preencha os campos obrigatórios: Nome e CPF.');
      return;
    }

    setSalvando(true);
    
    try {
      const formData = { nome, cpf, dataNascimento, telefone, email };
      
      await onSave(formData);
      
      Alert.alert('Sucesso', 'Paciente salvo com sucesso!');
      navigation.goBack();
      
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ScrollView style={styles.form}>
      <Text style={styles.label}>Nome</Text>
      <TextInput 
        style={styles.input} 
        value={nome} 
        onChangeText={setNome} 
        placeholder="Nome completo do paciente" 
      />
      
      <Text style={styles.label}>CPF</Text>
      <TextInput 
        style={styles.input} 
        value={cpf} 
        onChangeText={setCpf} 
        placeholder="Ex: 111.111.111-11" 
        keyboardType="numeric"
      />
      
      <Text style={styles.label}>Data de Nascimento</Text>
      <TextInput 
        style={styles.input} 
        value={dataNascimento} 
        onChangeText={setDataNascimento} 
        placeholder="Ex: 1990-04-12" 
      />

      <Text style={styles.label}>Telefone</Text>
      <TextInput 
        style={styles.input} 
        value={telefone} 
        onChangeText={setTelefone} 
        placeholder="Ex: (31) 91111-1111" 
        keyboardType="phone-pad" 
      />

      <Text style={styles.label}>E-mail</Text>
      <TextInput 
        style={styles.input} 
        value={email} 
        onChangeText={setEmail} 
        placeholder="Ex: paciente@exemplo.com" 
        keyboardType="email-address" 
        autoCapitalize="none"
      />
      
      <View style={styles.botaoContainer}>
        <Button 
          title={salvando ? "Salvando..." : "Salvar"} 
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
    marginBottom: 40 
  }
});