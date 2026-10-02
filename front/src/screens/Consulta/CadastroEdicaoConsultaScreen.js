import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import { Picker } from '@react-native-picker/picker';
import { api } from '../../services/api';

export default function CadastroEdicaoConsultaScreen({
  route,
  navigation,
}) {
  const consulta = route.params?.consulta;

  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);

  const [pacienteId, setPacienteId] = useState(
    consulta?.pacienteId ? String(consulta.pacienteId) : ''
  );

  const [medicoId, setMedicoId] = useState(
    consulta?.medicoId ? String(consulta.medicoId) : ''
  );

  const [data, setData] = useState(consulta?.data || '');
  const [horario, setHorario] = useState(consulta?.horario || '');
  const [status, setStatus] = useState(
    consulta?.status || 'Agendada'
  );

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [dadosPacientes, dadosMedicos] =
        await Promise.all([
          api.get('/pacientes'),
          api.get('/medicos'),
        ]);

      setPacientes(dadosPacientes);
      setMedicos(dadosMedicos);
    } catch (error) {
      if (error.name === 'SessaoExpirada') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        Alert.alert(
          'Erro',
          'Não foi possível carregar pacientes e médicos.'
        );
      }
    } finally {
      setCarregando(false);
    }
  };

  const salvar = async () => {
    if (!pacienteId || !medicoId || !data || !horario) {
      Alert.alert(
        'Atenção',
        'Preencha paciente, médico, data e horário.'
      );
      return;
    }

    setSalvando(true);

    try {
      const dados = {
        pacienteId,
        medicoId,
        data,
        horario,
        status,
      };

      if (consulta) {
        await api.put(`/consultas/${consulta.id}`, dados);
      } else {
        await api.post('/consultas', dados);
      }

      Alert.alert(
        'Sucesso',
        consulta
          ? 'Consulta atualizada com sucesso!'
          : 'Consulta cadastrada com sucesso!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      if (error.name === 'SessaoExpirada') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        Alert.alert(
          'Erro',
          error.message || 'Não foi possível salvar a consulta.'
        );
      }
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.conteudo}
    >
      <Text style={styles.titulo}>
        {consulta ? 'Editar Consulta' : 'Nova Consulta'}
      </Text>

      <Text style={styles.label}>Paciente</Text>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={pacienteId}
          onValueChange={(valor) => setPacienteId(valor)}
        >
          <Picker.Item
            label="Selecione um paciente"
            value=""
          />

          {pacientes.map((paciente) => (
            <Picker.Item
              key={String(paciente.id)}
              label={paciente.nome}
              value={String(paciente.id)}
            />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Médico</Text>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={medicoId}
          onValueChange={(valor) => setMedicoId(valor)}
        >
          <Picker.Item
            label="Selecione um médico"
            value=""
          />

          {medicos.map((medico) => (
            <Picker.Item
              key={String(medico.id)}
              label={`${medico.nome} - ${medico.especialidade}`}
              value={String(medico.id)}
            />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Data</Text>

      <TextInput
        style={styles.input}
        value={data}
        onChangeText={setData}
        placeholder="AAAA-MM-DD"
        keyboardType="numbers-and-punctuation"
      />

      <Text style={styles.exemplo}>
        Exemplo: 2026-10-15
      </Text>

      <Text style={styles.label}>Horário</Text>

      <TextInput
        style={styles.input}
        value={horario}
        onChangeText={setHorario}
        placeholder="HH:MM"
        keyboardType="numbers-and-punctuation"
      />

      <Text style={styles.exemplo}>
        Exemplo: 14:30
      </Text>

      <Text style={styles.label}>Status</Text>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={status}
          onValueChange={(valor) => setStatus(valor)}
        >
          <Picker.Item
            label="Agendada"
            value="Agendada"
          />

          <Picker.Item
            label="Realizada"
            value="Realizada"
          />

          <Picker.Item
            label="Cancelada"
            value="Cancelada"
          />
        </Picker>
      </View>

      <TouchableOpacity
        style={styles.botaoSalvar}
        onPress={salvar}
        disabled={salvando}
      >
        <Text style={styles.textoBotao}>
          {salvando ? 'Salvando...' : 'Salvar consulta'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.botaoCancelar}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.textoCancelar}>
          Cancelar
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  conteudo: {
    padding: 16,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 12,
  },

  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    overflow: 'hidden',
  },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
  },

  exemplo: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },

  botaoSalvar: {
    backgroundColor: '#007BFF',
    padding: 14,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 25,
  },

  botaoCancelar: {
    backgroundColor: '#6c757d',
    padding: 14,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },

  textoBotao: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  textoCancelar: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});