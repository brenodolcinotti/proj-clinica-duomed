import React from 'react';
import { View, StyleSheet } from 'react-native';
// Certifique-se de que o caminho do import do formulário está correto no seu projeto
import MedicoForm from '../../components/MedicoForm'; 

// IMPORTANTE: Mantenha o mesmo IP usado nos arquivos anteriores
const BASE_URL = 'http://SEU_IP_AQUI:3000'; 

export default function CadastroEdicaoMedicoScreen({ route, navigation }) {
  // Verifica se a tela recebeu um médico por parâmetro (ou seja, modo de Edição)
  const medico = route.params?.medico;

  // Função assíncrona para gravar na API
  const handleSave = async (dados) => {
    const isEdicao = !!medico;
    const url = isEdicao ? `${BASE_URL}/medicos/${medico.id}` : `${BASE_URL}/medicos`;
    const method = isEdicao ? 'PUT' : 'POST';

    const resposta = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dados)
    });

    if (!resposta.ok) {
      throw new Error('Falha ao salvar os dados no servidor.');
    }
  };

  return (
    <View style={styles.container}>
      <MedicoForm 
        medicoInicial={medico} 
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