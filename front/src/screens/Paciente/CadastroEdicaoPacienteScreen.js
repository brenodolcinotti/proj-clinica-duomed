import React from 'react';
import { View, StyleSheet } from 'react-native';
import PacienteForm from '../../components/PacienteForm'; 

// IMPORTANTE: Use o mesmo IP da sua máquina aqui também
const BASE_URL = 'http://SEU_IP_AQUI:3000'; 

export default function CadastroEdicaoPacienteScreen({ route, navigation }) {
  // Recebe o paciente se for modo de edição
  const paciente = route.params?.paciente;

  const handleSave = async (dados) => {
    const isEdicao = !!paciente;
    const url = isEdicao ? `${BASE_URL}/pacientes/${paciente.id}` : `${BASE_URL}/pacientes`;
    const method = isEdicao ? 'PUT' : 'POST';

    const resposta = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dados)
    });

    if (!resposta.ok) {
      throw new Error('Falha ao salvar os dados do paciente no servidor.');
    }
  };

  return (
    <View style={styles.container}>
      <PacienteForm 
        pacienteInicial={paciente} 
        onSave={handleSave} 
        navigation={navigation} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: '#f5f5f5' 
  }
});