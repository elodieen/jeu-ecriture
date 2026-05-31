export type RootStackParamList = {
  Accueil: undefined;
  CreerRejoindre: { mode: 'creer' | 'rejoindre' };
  SalleAttente: { playerCount: number; isCreator: boolean; sessionCode: string; initialConnected: number };
  AttenteDemarrage: { isCreator: boolean };
  ChoisirScenario: { isCreator: boolean };
  ChoisirPersonnage: { isCreator: boolean };
  CestParti: undefined;
  FichePersonnage: { characterId: string; isCreator: boolean };
  Ecriture: { temps: 1 | 2 | 3 | 4; isCreator: boolean; contrainte?: string };
  ChargementIA: { contribution?: string; temps: 1 | 2 | 3 | 4; isCreator: boolean };
  HistoireAssemblee: { histoire: string; temps: 1 | 2 | 3 | 4; isCreator: boolean };
  Roue: { roueNumber: 1 | 2 | 3; isCreator: boolean };
  Cloture: { isCreator: boolean };
  TheEnd: { titre: string };
  FlipBook: { titre: string };
};
