import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';

import { api } from '../../services/api';

export default function SinaisVitaisManual({ navigation }) {
  const [frequencia, setFrequencia] = useState('');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvarLeitura = async () => {
    const valor = Number(frequencia.replace(',', '.'));

    if (!frequencia.trim()) {
      Alert.alert(
        'Campo obrigatório',
        'Informe a frequência cardíaca.'
      );
      return;
    }

    if (!Number.isFinite(valor) || valor < 30 || valor > 250) {
      Alert.alert(
        'Valor inválido',
        'Informe uma frequência cardíaca entre 30 e 250 BPM.'
      );
      return;
    }

    if (salvando) return;

    setSalvando(true);

    try {
      const leitura = {
        frequenciaCardiaca: Math.round(valor),
        observacao: observacao.trim(),
        origem: 'manual',
        dataHora: new Date().toISOString(),
      };

      await api.post('/sinaisVitais', leitura);

      Alert.alert(
        'Leitura salva',
        `Registro enviado à API com frequência de ${Math.round(valor)} BPM.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (erro) {
      Alert.alert(
        'Não foi possível salvar',
        erro?.message ||
          'Verifique se a API está em execução e tente novamente.'
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.conteudo}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.titulo}>
        Digitação Manual de Sinais Vitais
      </Text>

      <Text style={styles.descricao}>
        Informe a frequência cardíaca medida pelo equipamento
        ou registrada pelo profissional responsável.
      </Text>

      <Text style={styles.label}>
        Frequência cardíaca (BPM)
      </Text>

      <TextInput
        style={styles.input}
        value={frequencia}
        onChangeText={setFrequencia}
        placeholder="Ex.: 75"
        keyboardType="decimal-pad"
        maxLength={6}
        editable={!salvando}
      />

      <Text style={styles.label}>
        Observação (opcional)
      </Text>

      <TextInput
        style={[styles.input, styles.observacao]}
        value={observacao}
        onChangeText={setObservacao}
        placeholder="Observações sobre a medição"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        editable={!salvando}
      />

      <View style={styles.botao}>
        <Button
          title={salvando ? 'Salvando...' : 'Salvar leitura'}
          onPress={salvarLeitura}
          disabled={salvando}
        />
      </View>

      <View style={styles.botao}>
        <Button
          title="Cancelar"
          color="#666666"
          onPress={() => navigation.goBack()}
          disabled={salvando}
        />
      </View>

      <Text style={styles.aviso}>
        Atenção: a validação nesta tela não substitui a avaliação
        de um profissional de saúde. O registro é enviado à API
        configurada no aplicativo.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  conteudo: {
    padding: 20,
    paddingBottom: 35,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222222',
    marginBottom: 15,
  },
  descricao: {
    fontSize: 15,
    color: '#555555',
    lineHeight: 22,
    marginBottom: 25,
  },
  label: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  observacao: {
    minHeight: 100,
  },
  botao: {
    marginTop: 18,
  },
  aviso: {
    marginTop: 25,
    fontSize: 13,
    color: '#8A2C0D',
    backgroundColor: '#FFF0E8',
    padding: 12,
    borderRadius: 8,
    lineHeight: 19,
  },
});

