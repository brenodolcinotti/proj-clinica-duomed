import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, ScrollView } from 'react-native';

export default function MedicoForm({ medicoInicial, onSave, navigation }) {
  // Estados para os campos do formulário
  const [nome, setNome] = useState(medicoInicial?.nome || '');
  const [especialidade, setEspecialidade] = useState(medicoInicial?.especialidade || '');
  const [crm, setCrm] = useState(medicoInicial?.crm || '');
  const [email, setEmail] = useState(medicoInicial?.email || '');
  const [telefone, setTelefone] = useState(medicoInicial?.telefone || '');
  const [endereco, setEndereco] = useState(medicoInicial?.endereco || '');
  
  // Estado para controlar o botão e evitar duplo toque (Passo 4)
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async () => {
    // Validação simples para evitar envio de dados vazios
    if (!nome || !especialidade || !crm) {
      Alert.alert('Atenção', 'Preencha os campos obrigatórios: Nome, Especialidade e CRM.');
      return;
    }

    setSalvando(true);
    
    try {
      const formData = { nome, especialidade, crm, email, telefone, endereco };
      
      // Aguarda a resposta do servidor executando a função passada via props (Passo 4)
      await onSave(formData);
      
      // Só avisa sucesso e volta para a tela anterior SE a API confirmar (Passo 4)
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
        {/* Enquanto estiver salvando, o botão mostra "Salvando..." e fica desabilitado (Passo 4) */}
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