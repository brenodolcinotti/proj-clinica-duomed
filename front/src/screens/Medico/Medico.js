import React, { useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Alert, Button, SectionList, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api'; // Importando o cliente HTTP único da Aula 4

export default function Medico({ navigation }) {
  const [medicos, setMedicos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  // Busca os dados na API usando o atalho 'get' centralizado
  const buscarMedicos = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await api.get('/medicos'); // Fetch e BASE_URL foram removidos
      setMedicos(dados);
    } catch (error) {
      if (error.name === 'SessaoExpirada') {
        Alert.alert('Aviso', error.message);
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); // Redireciona para o Login em caso de 401
      } else {
        setErro(error.message);
      }
    } finally {
      setCarregando(false);
    }
  };

  // Recarrega a lista toda vez que a tela recebe o foco
  useFocusEffect(
    useCallback(() => {
      buscarMedicos();
    }, [])
  );

  // Confirmação antes de excluir
  const confirmarExclusao = (id) => {
    Alert.alert('Excluir', 'Tem certeza que deseja excluir este médico?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', onPress: () => excluirMedico(id), style: 'destructive' }
    ]);
  };

  // Exclui o médico usando o atalho 'remover' e recarrega a lista
  const excluirMedico = async (id) => {
    try {
      await api.remover(`/medicos/${id}`); // Fetch e BASE_URL foram removidos
      buscarMedicos(); 
    } catch (error) {
      if (error.name === 'SessaoExpirada') {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); // Redireciona para o Login em caso de 401
      } else {
        Alert.alert('Erro', error.message);
      }
    }
  };

  // Lógica de agrupamento por letra para a SectionList (Mantida intacta)
  const medicosAgrupados = medicos.reduce((acc, medico) => {
    const letraInicial = medico.nome.charAt(0).toUpperCase();
    const secaoIndex = acc.findIndex(secao => secao.title === letraInicial);
    if (secaoIndex > -1) {
      acc[secaoIndex].data.push(medico);
    } else {
      acc.push({ title: letraInicial, data: [medico] });
    }
    return acc;
  }, []);

  // Ordena as seções da lista em ordem alfabética (Mantida intacta)
  medicosAgrupados.sort((a, b) => a.title.localeCompare(b.title));

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Carregando médicos...</Text>
      </View>
    );
  }
  
  if (erro) {
    return (
      <View style={styles.center}>
        <Text style={styles.erroText}>{erro}</Text>
        <Button title="Tentar novamente" onPress={buscarMedicos} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={medicosAgrupados}
        keyExtractor={(item) => item.id.toString()}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.header}>{title}</Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <View style={styles.infoContainer}>
              <Text style={styles.nome}>{item.nome}</Text>
              <Text style={styles.especialidade}>{item.especialidade} - CRM: {item.crm}</Text>
            </View>
            
            <View style={styles.botoesContainer}>
              <TouchableOpacity 
                style={styles.botaoEditar}
                onPress={() => navigation.navigate('CadastroEdicaoMedicoScreen', { medico: item })}
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
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum médico encontrado na API.</Text>}
      />
      
      {/* Botão Flutuante (FAB) para cadastrar novo médico */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('CadastroEdicaoMedicoScreen')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#e0e0e0', padding: 8, fontSize: 16, fontWeight: 'bold', color: '#333' },
  itemContainer: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#ccc', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoContainer: { flex: 1 },
  nome: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  especialidade: { fontSize: 14, color: '#666', marginTop: 4 },
  botoesContainer: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  botaoEditar: { backgroundColor: '#007BFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 5, marginRight: 8 },
  botaoExcluir: { backgroundColor: '#DC3545', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 5 },
  textoBotao: { color: '#fff', fontWeight: 'bold' },
  erroText: { color: 'red', marginBottom: 10, fontSize: 16 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#666' },
  fab: { position: 'absolute', width: 56, height: 56, alignItems: 'center', justifyContent: 'center', right: 20, bottom: 20, backgroundColor: '#007BFF', borderRadius: 28, elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 2 }, shadowRadius: 2 },
  fabText: { fontSize: 24, color: 'white', fontWeight: 'bold' }
});