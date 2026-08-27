import React from 'react';
import { View, StyleSheet } from 'react-native';
import PacienteForm from '../../components/PacienteForm'; 
import { api } from '../../services/api';

export default function CadastroEdicaoPacienteScreen({ route, navigation }) {
  const paciente = route.params?.paciente;

  const handleSave = async (dados) => {
    if (paciente) {
      await api.put(`/pacientes/${paciente.id}`, dados);
    } else {
      await api.post('/pacientes', dados);
    }
  };

  return (
    <View style={styles.container}>
      <PacienteForm pacienteInicial={paciente} onSave={handleSave} navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' } });