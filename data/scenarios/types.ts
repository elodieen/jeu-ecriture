export type NotificationType = 'FAILLE' | 'MOTIVATION' | 'SECRET';

export type Audience = 'adultes' | 'ados' | 'enfants';

export type Relation = {
  character: string;
  label: string;
  description: string;
};

export type Character = {
  id: string;
  name: string;
  tagline: string;
  facePublique: string;
  faceCachee: string;
  objectif: string;
  relations: Relation[];
};

export type WheelVariant = {
  id: string;
  text: string;
};

export type Wheel = {
  number: 1 | 2 | 3;
  title: string;
  subtitle: string;
  variants: WheelVariant[];
};

export type PrivateNotification = {
  characterId: string;
  roue: 1 | 2 | 3;
  type: NotificationType;
  text: string;
};

export type Scenario = {
  id: string;
  title: string;
  tagline: string;
  shortDescription: string;
  audience: Audience;
  universe: string;
  tone: string;
  minPlayers: number;
  maxPlayers: number;
  duration: string;
  introduction: string;
  characters: Character[];
  roues: Wheel[];
  notifications: PrivateNotification[];
};
