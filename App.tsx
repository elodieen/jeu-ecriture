import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './data/navigationTypes';
import { GameProvider } from './contexts/GameContext';
import { navigationRef } from './services/navigation';
import AccueilScreen from './screens/01-Accueil';
import CreerRejoindreScreen from './screens/02-CreerRejoindre';
import SalleAttenteScreen from './screens/03-SalleAttente';
import AttenteDemarrageScreen from './screens/04-AttenteDemarrage';
import ChoisirScenarioScreen from './screens/05-ChoisirScenario';
import ChoisirPersonnageScreen from './screens/06-ChoisirPersonnage';
import CestPartiScreen from './screens/CestParti';
import FichePersonnageScreen from './screens/07-FichePersonnage';
import EcritureScreen from './screens/08-Ecriture';
import ChargementIAScreen from './screens/08b-ChargementIA';
import HistoireAssembleeScreen from './screens/09-HistoireAssemblee';
import RoueScreen from './screens/10-Roue';
import ClotureScreen from './screens/11-Cloture';
import TheEndScreen from './screens/12-TheEnd';
import FlipBookScreen from './screens/13-FlipBook';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GameProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator initialRouteName="Accueil" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Accueil" component={AccueilScreen} />
          <Stack.Screen name="CreerRejoindre" component={CreerRejoindreScreen} />
          <Stack.Screen name="SalleAttente" component={SalleAttenteScreen} />
          <Stack.Screen name="AttenteDemarrage" component={AttenteDemarrageScreen} />
          <Stack.Screen name="ChoisirScenario" component={ChoisirScenarioScreen} />
          <Stack.Screen name="ChoisirPersonnage" component={ChoisirPersonnageScreen} />
          <Stack.Screen name="CestParti" component={CestPartiScreen} />
          <Stack.Screen name="FichePersonnage" component={FichePersonnageScreen} />
          <Stack.Screen name="Ecriture" component={EcritureScreen} />
          <Stack.Screen name="ChargementIA" component={ChargementIAScreen} />
          <Stack.Screen name="HistoireAssemblee" component={HistoireAssembleeScreen} />
          <Stack.Screen name="Roue" component={RoueScreen} />
          <Stack.Screen name="Cloture" component={ClotureScreen} />
          <Stack.Screen name="TheEnd" component={TheEndScreen} />
          <Stack.Screen name="FlipBook" component={FlipBookScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GameProvider>
  );
}
