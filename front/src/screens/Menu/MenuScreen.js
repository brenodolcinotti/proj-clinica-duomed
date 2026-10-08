
import React from 'react';

import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import BotaoMenu from '../../components/BotaoMenu';

const Logo = require('../../../assets/logo.png');
const IconeMedic = require('../../../assets/usuario-md.png');
const IconePaciente = require('../../../assets/utilizador.png');
const IconeConsulta = require('../../../assets/calendario.png');

const MenuScreen = ({ navigation }) => {
  const handleLogout = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.conteudo}
    >
      <Image
        style={styles.logo}
        source={Logo}
      />

      <Text style={styles.header}>
        Gerenciando sua Clínica
      </Text>

      <View style={styles.btns}>
        <Text style={styles.instrucao}>
          Escolha qual seção deseja iniciar.
        </Text>

        <BotaoMenu
          icone={IconeMedic}
          titulo="Médico(a)s"
          onPress={() => navigation.navigate('Medicos')}
        />

        <BotaoMenu
          icone={IconePaciente}
          titulo="Pacientes"
          onPress={() => navigation.navigate('Pacientes')}
        />

        <BotaoMenu
          icone={IconeConsulta}
          titulo="Consultas"
          onPress={() => navigation.push('Consultas')}
        />

        <TouchableOpacity
          onPress={() => navigation.navigate('Mapa')}
          style={styles.botaoMapa}
        >
          <Text style={styles.textoMapa}>
            🗺️ Mapa da Clínica
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          style={styles.botaoSair}
        >
          <Text style={styles.textoSair}>
            Sair
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  conteudo: {
    padding: 20,
    paddingBottom: 40,
  },

  logo: {
    width: '50%',
    height: 100,
    resizeMode: 'contain',
    alignSelf: 'flex-start',
    marginBottom: 1,
  },

  header: {
    fontSize: 12,
    textAlign: 'left',
    fontWeight: 'bold',
  },

  btns: {
    marginTop: 60,
  },

  instrucao: {
    marginBottom: 10,
  },

  botaoMapa: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },

  textoMapa: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  botaoSair: {
    backgroundColor: '#DC3545',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },

  textoSair: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MenuScreen;