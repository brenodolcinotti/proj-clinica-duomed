import React, { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Alert, Button, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';

export default function Paciente({ navigation }) {
  const [pacientes, setPacientes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  const buscarPacientes = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await api.get('/pacientes');
      setPacientes(dados);
    } catch (error) {
      if (error.name === 'SessaoExpirada') {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        setErro(error.message);
      }
    } finally {
      setCarregando(false);
    }
  };

  useFocusEffect(useCallback(() => { buscarPacientes(); }, []));

  const confirmarExclusao = (id) => {
    Alert.alert('Excluir', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', onPress: () => excluirPaciente(id), style: 'destructive' }
    ]);
  };

  const excluirPaciente = async (id) => {
    try {
      await api.remover(`/pacientes/${id}`);
      buscarPacientes(); 
    } catch (error) {
      if (error.name === 'SessaoExpirada') {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        Alert.alert('Erro', error.message);
      }
    }
  };

  if (carregando) return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  if (erro) return <View style={styles.center}><Text>{erro}</Text><Button title="Tentar novamente" onPress={buscarPacientes} /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={pacientes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <View style={styles.info}>
              <Text style={styles.nome}>{item.nome}</Text>
              <Text>CPF: {item.cpf}</Text>
            </View>
            <View style={styles.botoes}>
              <TouchableOpacity style={styles.btnEditar} onPress={() => navigation.navigate('CadastroEdicaoPacienteScreen', { paciente: item })}><Text style={styles.txtBtn}>Editar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnExcluir} onPress={() => confirmarExclusao(item.id)}><Text style={styles.txtBtn}>Excluir</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CadastroEdicaoPacienteScreen')}><Text style={styles.fabText}>+</Text></TouchableOpacity>
    </View>
  );
}

// Mantenha o mesmo StyleSheet do arquivo Medico.js
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#f5f5f5' }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' }, itemContainer: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderColor: '#ccc', flexDirection: 'row' }, info: { flex: 1 }, nome: { fontSize: 18, fontWeight: 'bold' }, botoes: { flexDirection: 'row', gap: 10 }, btnEditar: { backgroundColor: '#007BFF', padding: 8, borderRadius: 5 }, btnExcluir: { backgroundColor: '#DC3545', padding: 8, borderRadius: 5, marginLeft: 5 }, txtBtn: { color: '#fff', fontWeight: 'bold' }, fab: { position: 'absolute', width: 56, height: 56, alignItems: 'center', justifyContent: 'center', right: 20, bottom: 20, backgroundColor: '#007BFF', borderRadius: 28 }, fabText: { fontSize: 24, color: 'white' }});