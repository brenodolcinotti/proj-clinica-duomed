import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';

export default function Consulta({ navigation }) {
  const [consultas, setConsultas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  const buscarDados = async () => {
    setCarregando(true);
    setErro(null);

    try {
      const [dadosConsultas, dadosPacientes, dadosMedicos] =
        await Promise.all([
          api.get('/consultas'),
          api.get('/pacientes'),
          api.get('/medicos'),
        ]);

      setConsultas(dadosConsultas);
      setPacientes(dadosPacientes);
      setMedicos(dadosMedicos);
    } catch (error) {
      if (error.name === 'SessaoExpirada') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        setErro(error.message);
      }
    } finally {
      setCarregando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      buscarDados();
    }, [])
  );

  const encontrarPaciente = (id) => {
    const paciente = pacientes.find(
      (item) => String(item.id) === String(id)
    );

    return paciente ? paciente.nome : 'Paciente não encontrado';
  };

  const encontrarMedico = (id) => {
    const medico = medicos.find(
      (item) => String(item.id) === String(id)
    );

    return medico ? medico.nome : 'Médico não encontrado';
  };

  const confirmarExclusao = (id) => {
    Alert.alert(
      'Excluir consulta',
      'Tem certeza que deseja excluir esta consulta?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          onPress: () => excluirConsulta(id),
          style: 'destructive',
        },
      ]
    );
  };

  const excluirConsulta = async (id) => {
    try {
      await api.remover(`/consultas/${id}`);
      buscarDados();
    } catch (error) {
      if (error.name === 'SessaoExpirada') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        Alert.alert('Erro', error.message);
      }
    }
  };

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Carregando consultas...</Text>
      </View>
    );
  }

  if (erro) {
    return (
      <View style={styles.center}>
        <Text style={styles.erroText}>{erro}</Text>

        <Button
          title="Tentar novamente"
          onPress={buscarDados}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={consultas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <View style={styles.info}>
              <Text style={styles.nome}>
                {encontrarPaciente(item.pacienteId)}
              </Text>

              <Text style={styles.detalhe}>
                Médico: {encontrarMedico(item.medicoId)}
              </Text>

              <Text style={styles.detalhe}>
                Data: {item.data}
              </Text>

              <Text style={styles.detalhe}>
                Horário: {item.horario}
              </Text>

              <Text style={styles.status}>
                Status: {item.status}
              </Text>
            </View>

            <View style={styles.botoes}>
              <TouchableOpacity
                style={styles.btnEditar}
                onPress={() =>
                  navigation.navigate('CadastroEdicaoConsultaScreen', {
                    consulta: item,
                  })
                }
              >
                <Text style={styles.txtBtn}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnExcluir}
                onPress={() => confirmarExclusao(item.id)}
              >
                <Text style={styles.txtBtn}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Nenhuma consulta cadastrada.
          </Text>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate('CadastroEdicaoConsultaScreen')
        }
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  itemContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    flexDirection: 'row',
  },

  info: {
    flex: 1,
  },

  nome: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },

  detalhe: {
    fontSize: 14,
    color: '#555',
    marginBottom: 3,
  },

  status: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
  },

  botoes: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },

  btnEditar: {
    backgroundColor: '#007BFF',
    padding: 8,
    borderRadius: 5,
  },

  btnExcluir: {
    backgroundColor: '#DC3545',
    padding: 8,
    borderRadius: 5,
    marginLeft: 5,
  },

  txtBtn: {
    color: '#fff',
    fontWeight: 'bold',
  },

  erroText: {
    color: 'red',
    marginBottom: 10,
    fontSize: 16,
  },

  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },

  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#007BFF',
    borderRadius: 28,
    elevation: 8,
  },

  fabText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
});