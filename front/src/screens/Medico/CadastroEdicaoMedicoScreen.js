import React from 'react';
import { View, StyleSheet } from 'react-native';
import MedicoForm from '../../components/MedicoForm'; 
import { api } from '../../services/api'; // Importa a API[cite: 3]

export default function CadastroEdicaoMedicoScreen({ route, navigation }) {
  const medico = route.params?.medico;

  const handleSave = async (dados) => {
    // A API agora injeta o header de autorização automaticamente[cite: 3]
    if (medico) {
      await api.put(`/medicos/${medico.id}`, dados);
    } else {
      await api.post('/medicos', dados);
    }
  };

  return (
    <View style={styles.container}>
      <MedicoForm medicoInicial={medico} onSave={handleSave} navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' } });