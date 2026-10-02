import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import Login from './src/screens/Login/Login';
import MenuScreen from './src/screens/Menu/MenuScreen';

import Consulta from './src/screens/Consulta/Consulta';
import CadastroEdicaoConsultaScreen from './src/screens/Consulta/CadastroEdicaoConsultaScreen';

import MapaScreen from './src/screens/Mapa/MapaScreen';

import Medico from './src/screens/Medico/Medico';
import CadastroEdicaoMedicoScreen from './src/screens/Medico/CadastroEdicaoMedicoScreen';

import Paciente from './src/screens/Paciente/Paciente';
import CadastroEdicaoPacienteScreen from './src/screens/Paciente/CadastroEdicaoPacienteScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">

        <Stack.Screen
          name="Login"
          component={Login}
          options={{ title: 'Login' }}
        />

        <Stack.Screen
          name="Menu"
          component={MenuScreen}
          options={{ title: 'DuoMed' }}
        />

        <Stack.Screen
          name="Mapa"
          component={MapaScreen}
          options={{ title: 'Mapa da Clínica' }}
        />

        <Stack.Screen
          name="Consultas"
          component={Consulta}
          options={{ title: 'Consultas' }}
        />

        <Stack.Screen
          name="CadastroEdicaoConsultaScreen"
          component={CadastroEdicaoConsultaScreen}
          options={{ title: 'Cadastro de Consulta' }}
        />

        <Stack.Screen
          name="Medicos"
          component={Medico}
          options={{ title: 'Lista de Médicos' }}
        />

        <Stack.Screen
          name="CadastroEdicaoMedicoScreen"
          component={CadastroEdicaoMedicoScreen}
          options={{ title: 'Cadastro de Médico' }}
        />

        <Stack.Screen
          name="Pacientes"
          component={Paciente}
          options={{ title: 'Lista de Pacientes' }}
        />

        <Stack.Screen
          name="CadastroEdicaoPacienteScreen"
          component={CadastroEdicaoPacienteScreen}
          options={{ title: 'Cadastro de Paciente' }}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}