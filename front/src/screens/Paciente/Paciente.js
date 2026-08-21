import React, { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Alert, Button, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// IMPORTANTE: Lembre-se de colocar o mesmo IP que você usou no Medico.js
const BASE_URL = 'http://SEU_IP_AQUI:3000'; 

export default function Paciente({ navigation }) {
  const [pacientes, setPacientes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  // Busca os dados na API via GET /pacientes
  const buscarPacientes = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await fetch(`${BASE_URL}/pacientes`);
      if (!resposta.ok) throw new Error('Erro ao carregar os dados da API');
      const dados = await resposta.json();
      setPacientes(dados);
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  };

  // Recarrega a lista toda vez que a tela recebe o foco
  useFocusEffect(
    useCallback(() => {
      buscarPacientes();
    }, [])
  );

  // Confirmação antes de excluir
  const confirmarExclusao = (id) => {
    Alert.alert('Excluir', 'Tem certeza que deseja excluir este paciente?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', onPress: () => excluirPaciente(id), style: 'destructive' }
    ]);
  };

  // Exclui o paciente na API usando DELETE e recarrega a lista
  const excluirPaciente = async (id) => {
    try {
      const resposta = await fetch(`${BASE_URL}/pacientes/${id}`, { method: 'DELETE' });
      if (!resposta.ok) throw new Error('Erro ao excluir na API');
      buscarPacientes(); 
    } catch (error) {
      Alert.alert('Erro', error.message);
    }
  };

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Carregando pacientes...</Text>
      </View>
    );
  }
  
  if (erro) {
    return (
      <View style={styles.center}>
        <Text style={styles.erroText}>{erro}</Text>
        <Button title="Tentar novamente" onPress={buscarPacientes} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={pacientes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <View style={styles.infoContainer}>
              <Text style={styles.nome}>{item.nome}</Text>
              <Text style={styles.detalhes}>CPF: {item.cpf}</Text>
              <Text style={styles.detalhes}>{item.email} | {item.telefone}</Text>
            </View>
            
            <View style={styles.botoesContainer}>
              <TouchableOpacity 
                style={styles.botaoEditar}
                // Ajuste o nome da rota se necessário no seu projeto
                onPress={() => navigation.navigate('CadastroEdicaoPacienteScreen', { paciente: item })}
              >
                <Text style={styles.textoBotao}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.botaoExcluir}
                onPress={() => confirmarExclusao(item.id)}
              >
                <Text style={styles.textoBotao}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum paciente encontrado na API.</Text>}
        contentContainerStyle={{ paddingBottom: 80 }} // Espaço extra no final para o FAB não cobrir o último item
      />
      
      {/* Botão Flutuante (FAB) para cadastrar novo paciente */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('CadastroEdicaoPacienteScreen')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  itemContainer: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#ccc', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoContainer: { flex: 1, paddingRight: 10 },
  nome: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  detalhes: { fontSize: 14, color: '#666', marginTop: 4 },
  botoesContainer: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  botaoEditar: { backgroundColor: '#007BFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 5, marginRight: 8 },
  botaoExcluir: { backgroundColor: '#DC3545', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 5 },
  textoBotao: { color: '#fff', fontWeight: 'bold' },
  erroText: { color: 'red', marginBottom: 10, fontSize: 16 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#666' },
  fab: { position: 'absolute', width: 56, height: 56, alignItems: 'center', justifyContent: 'center', right: 20, bottom: 20, backgroundColor: '#007BFF', borderRadius: 28, elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 2 }, shadowRadius: 2 },
  fabText: { fontSize: 24, color: 'white', fontWeight: 'bold' }
});