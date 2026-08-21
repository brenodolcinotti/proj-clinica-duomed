import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Importação das Telas
import Medico from './src/screens/Medico/Medico';
import CadastroEdicaoMedicoScreen from './src/screens/Medico/CadastroEdicaoMedicoScreen';

// Importação corrigida conforme o Passo 3 do exercício
import Paciente from './src/screens/Paciente/Paciente';
import CadastroEdicaoPacienteScreen from './src/screens/Paciente/CadastroEdicaoPacienteScreen';

// Se você tiver uma tela de Menu, Home ou Splash, lembre-se de importar e ajustar o caminho aqui:
// import Menu from './src/screens/Menu/Menu'; 

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      {/* Altere o initialRouteName para 'Menu' se o seu app começar por ele */}
      <Stack.Navigator initialRouteName="Medicos"> 
        
        {/* Rota do Menu (Descomente caso já tenha a tela Menu feita) */}
        {/* <Stack.Screen 
          name="Menu" 
          component={Menu} 
          options={{ title: 'DuoMed' }} 
        /> */}

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

        {/* Rota de Pacientes ativada e apontando para o novo componente Paciente */}
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