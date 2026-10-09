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

import {
  agendarLembrete,
  cancelarLembrete,
  testarNotificacao,
  testarLembreteEm10Segundos,
} from '../../services/lembretes';

export default function CadastroEdicaoConsultaScreen({
  route,
  navigation,
}) {
  const consulta = route.params?.consulta;

  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);

  const [pacienteId, setPacienteId] = useState(
    consulta?.pacienteId != null
      ? String(consulta.pacienteId)
      : ''
  );

  const [medicoId, setMedicoId] = useState(
    consulta?.medicoId != null
      ? String(consulta.medicoId)
      : ''
  );

  const [data, setData] = useState(consulta?.data || '');
  const [horario, setHorario] = useState(
    consulta?.horario || ''
  );

  const [status, setStatus] = useState(
    consulta?.status || 'Agendada'
  );

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  // Carrega pacientes e médicos da API.
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

  // Teste de notificação imediata.
  const testarNotificacaoAgora = async () => {
    setTestando(true);

    try {
      const identificador = await testarNotificacao();

      console.log(
        'Notificação de teste agendada:',
        identificador
      );

      Alert.alert(
        'Teste solicitado',
        'A notificação foi agendada. Coloque o DuoMed em segundo plano e confira se o aviso aparece no iPhone.'
      );
    } catch (erro) {
      console.warn(
        'Erro no teste de notificação:',
        erro
      );

      Alert.alert(
        'Erro no teste',
        erro.message ||
          'Não foi possível agendar a notificação de teste.'
      );
    } finally {
      setTestando(false);
    }
  };

  // Teste de notificação automática após 10 segundos.
  const testarLembreteAgora = async () => {
    setTestando(true);

    try {
      const identificador =
        await testarLembreteEm10Segundos();

      console.log(
        'Lembrete de teste agendado:',
        identificador
      );

      Alert.alert(
        'Lembrete agendado!',
        'Coloque o DuoMed em segundo plano. A notificação deverá aparecer em aproximadamente 10 segundos.'
      );
    } catch (erro) {
      console.warn(
        'Erro no teste do lembrete:',
        erro
      );

      Alert.alert(
        'Erro no teste',
        erro.message ||
          'Não foi possível agendar o lembrete de teste.'
      );
    } finally {
      setTestando(false);
    }
  };

  // Salva a consulta e configura o lembrete.
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
        data: data.trim(),
        horario: horario.trim(),
        status,
      };

      let consultaSalva;

      if (consulta) {
        await api.put(
          `/consultas/${consulta.id}`,
          dados
        );

        consultaSalva = {
          ...consulta,
          ...dados,
          id: consulta.id,
        };
      } else {
        consultaSalva = await api.post(
          '/consultas',
          dados
        );
      }

      try {
        if (status === 'Cancelada') {
          if (consultaSalva?.id != null) {
            await cancelarLembrete(consultaSalva.id);
          }
        } else {
          const resultado =
            await agendarLembrete(consultaSalva);

          if (!resultado.agendado) {
            Alert.alert(
              'Consulta salva',
              resultado.motivo ||
                'A consulta foi salva, mas o lembrete não foi agendado.'
            );
          }
        }
      } catch (erroLembrete) {
        console.warn(
          'Erro ao configurar lembrete:',
          erroLembrete
        );

        Alert.alert(
          'Consulta salva',
          'A consulta foi salva, mas não foi possível configurar o lembrete.'
        );
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
          error.message ||
            'Não foi possível salvar a consulta.'
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
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.titulo}>
        {consulta ? 'Editar Consulta' : 'Nova Consulta'}
      </Text>

      <Text style={styles.label}>Paciente</Text>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={pacienteId}
          onValueChange={valor => setPacienteId(valor)}
        >
          <Picker.Item
            label="Selecione um paciente"
            value=""
          />

          {pacientes.map(paciente => (
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
          onValueChange={valor => setMedicoId(valor)}
        >
          <Picker.Item
            label="Selecione um médico"
            value=""
          />

          {medicos.map(medico => (
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
          onValueChange={valor => setStatus(valor)}
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

      {/* Teste de notificação imediata */}
      <TouchableOpacity
        style={styles.botaoTeste}
        onPress={testarNotificacaoAgora}
        disabled={testando || salvando}
      >
        <Text style={styles.textoBotao}>
          {testando
            ? 'Agendando teste...'
            : 'Testar notificação'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.exemplo}>
        Testa se as notificações aparecem no iPhone.
      </Text>

      {/* Teste de notificação após 10 segundos */}
      <TouchableOpacity
        style={styles.botaoTeste10}
        onPress={testarLembreteAgora}
        disabled={testando || salvando}
      >
        <Text style={styles.textoBotao}>
          {testando
            ? 'Agendando teste...'
            : 'Testar lembrete em 10 segundos'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.exemplo}>
        Teste temporário para verificar o disparo automático.
      </Text>

      {/* Salvar consulta */}
      <TouchableOpacity
        style={styles.botaoSalvar}
        onPress={salvar}
        disabled={salvando || testando}
      >
        <Text style={styles.textoBotao}>
          {salvando ? 'Salvando...' : 'Salvar consulta'}
        </Text>
      </TouchableOpacity>

      {/* Cancelar edição */}
      <TouchableOpacity
        style={styles.botaoCancelar}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.textoBotao}>
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

  botaoTeste: {
    backgroundColor: '#6f42c1',
    padding: 14,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 25,
  },

  botaoTeste10: {
    backgroundColor: '#51318f',
    padding: 14,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 12,
  },

  botaoSalvar: {
    backgroundColor: '#007BFF',
    padding: 14,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 15,
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
});

