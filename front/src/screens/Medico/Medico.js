
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  Alert,
  Button,
  SectionList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';

export default function Medico({ navigation }) {
  const [medicos, setMedicos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [fotosComErro, setFotosComErro] = useState({});

  const buscarMedicos = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const dados = await api.get('/medicos');

      if (!Array.isArray(dados)) {
        throw new Error(
          'A API não retornou uma lista válida de médicos.'
        );
      }

      setMedicos(dados);
    } catch (error) {
      if (error?.name === 'SessaoExpirada') {
        Alert.alert('Aviso', error.message);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        setErro(
          error?.message || 'Não foi possível carregar os médicos.'
        );
      }
    } finally {
      setCarregando(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      buscarMedicos();
    }, [buscarMedicos])
  );

  const confirmarExclusao = (id) => {
    Alert.alert(
      'Excluir médico',
      'Tem certeza que deseja excluir este médico?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => excluirMedico(id),
        },
      ]
    );
  };

  const excluirMedico = async (id) => {
    try {
      await api.remover(`/medicos/${id}`);
      await buscarMedicos();
    } catch (error) {
      if (error?.name === 'SessaoExpirada') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        Alert.alert(
          'Erro',
          error?.message || 'Não foi possível excluir o médico.'
        );
      }
    }
  };

  const medicosAgrupados = medicos.reduce((acc, medico) => {
    const nome = String(medico?.nome || 'Médico sem nome');
    const letraInicial = nome.charAt(0).toLocaleUpperCase('pt-BR');

    let secao = acc.find(
      (item) => item.title === letraInicial
    );

    if (!secao) {
      secao = { title: letraInicial, data: [] };
      acc.push(secao);
    }

    secao.data.push(medico);

    return acc;
  }, []);

  medicosAgrupados.sort((a, b) =>
    a.title.localeCompare(b.title, 'pt-BR')
  );

  if (carregando && medicos.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1F3B57" />
        <Text>Carregando médicos...</Text>
      </View>
    );
  }

  if (erro && medicos.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.erroText}>{erro}</Text>
        <Button
          title="Tentar novamente"
          onPress={buscarMedicos}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {erro ? (
        <Text style={styles.aviso}>{erro}</Text>
      ) : null}

      <SectionList
        sections={medicosAgrupados}
        keyExtractor={(item) => String(item.id)}
        renderSectionHeader={({ section }) => (
          <Text style={styles.header}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => {
          const fotoUri =
            typeof item.fotoUri === 'string'
              ? item.fotoUri.trim()
              : '';

          const fotoKey = `${item.id}:${fotoUri}`;

          const mostrarFoto =
            Boolean(fotoUri) && !fotosComErro[fotoKey];

          return (
            <View style={styles.itemContainer}>
              {mostrarFoto ? (
                <Image
                  source={{ uri: fotoUri }}
                  style={styles.foto}
                  resizeMode="cover"
                  accessibilityLabel={`Foto de ${item.nome || 'médico'}`}
                  onError={() =>
                    setFotosComErro((estado) => ({
                      ...estado,
                      [fotoKey]: true,
                    }))
                  }
                />
              ) : (
                <View
                  style={styles.fotoPlaceholder}
                  accessibilityLabel="Foto não disponível"
                >
                  <Text style={styles.fotoPlaceholderTexto}>
                    👨‍⚕️
                  </Text>
                </View>
              )}

              <View style={styles.infoContainer}>
                <Text style={styles.nome}>
                  {item.nome || 'Médico sem nome'}
                </Text>

                <Text style={styles.especialidade}>
                  {item.especialidade ||
                    'Especialidade não informada'}
                  {item.crm ? ` · CRM: ${item.crm}` : ''}
                </Text>

                {fotoUri && !mostrarFoto ? (
                  <Text style={styles.fotoIndisponivel}>
                    Foto indisponível neste aparelho
                  </Text>
                ) : null}
              </View>

              <View style={styles.botoesContainer}>
                <TouchableOpacity
                  style={styles.botaoEditar}
                  onPress={() =>
                    navigation.navigate(
                      'CadastroEdicaoMedicoScreen',
                      { medico: item }
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Editar médico ${item.nome || ''}`}
                >
                  <Text style={styles.textoBotao}>
                    Editar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botaoExcluir}
                  onPress={() => confirmarExclusao(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Excluir médico ${item.nome || ''}`}
                >
                  <Text style={styles.textoBotao}>
                    Excluir
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Nenhum médico encontrado na API.
          </Text>
        }
        refreshing={carregando}
        onRefresh={buscarMedicos}
        contentContainerStyle={
          medicos.length === 0 ? styles.listaVazia : undefined
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          navigation.navigate('CadastroEdicaoMedicoScreen')
        }
        accessibilityRole="button"
        accessibilityLabel="Cadastrar novo médico"
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
    padding: 20,
  },

  header: {
    backgroundColor: '#e0e0e0',
    padding: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },

  itemContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },

  foto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e5e7eb',
  },

  fotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fotoPlaceholderTexto: {
    fontSize: 30,
  },

  infoContainer: {
    flex: 1,
  },

  nome: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000',
  },

  especialidade: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },

  fotoIndisponivel: {
    fontSize: 11,
    color: '#9a6700',
    marginTop: 4,
  },

  botoesContainer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },

  botaoEditar: {
    backgroundColor: '#007BFF',
    paddingVertical: 8,
    paddingHorizontal: 9,
    borderRadius: 5,
  },

  botaoExcluir: {
    backgroundColor: '#DC3545',
    paddingVertical: 8,
    paddingHorizontal: 9,
    borderRadius: 5,
  },

  textoBotao: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },

  erroText: {
    color: 'red',
    marginBottom: 10,
    fontSize: 16,
    textAlign: 'center',
  },

  aviso: {
    color: '#8a5a00',
    backgroundColor: '#fff3cd',
    padding: 8,
  },

  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },

  listaVazia: {
    flexGrow: 1,
    justifyContent: 'center',
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
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 2,
  },

  fabText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
});
