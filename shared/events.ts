// Shared socket event names — imported by both server/ and client code.
export const EV = {
  // Session
  SESSION_CREATE:        'session:create',
  SESSION_CREATED:       'session:created',
  SESSION_JOIN:          'session:join',
  SESSION_JOINED:        'session:joined',
  SESSION_PLAYER_JOINED: 'session:player_joined',
  SESSION_READY:         'session:ready',
  SESSION_STATE:         'session:state',
  SESSION_ERROR:         'session:error',

  // Navigation (server → all clients in room, or per socket)
  GAME_NAVIGATE_TO:      'game:navigateTo',

  // Readiness
  PLAYER_READY:            'player:ready',

  // Scenario selection
  SCENARIO_SELECT:         'scenario:select',
  SCENARIO_SELECTED:       'scenario:selected',

  // Character selection
  CHARACTER_CHOOSE:        'character:choose',
  CHARACTER_TAKEN:         'character:taken',
  CHARACTER_ALREADY_TAKEN: 'character:already_taken',
  CHARACTER_ALL_CHOSEN:    'character:all_chosen',
  CHARACTER_BACK:          'character:back',

  // Timer
  WRITING_START:         'writing:start',
  TIMER_TICK:            'timer:tick',
  TIMER_ALERT:           'timer:alert',
  TIMER_EXPIRED:         'timer:expired',

  // Roue
  ROUE_SPIN:             'roue:spin',
  ROUE_CONTRAINTE:       'roue:contrainte',
  ROUE_NOTIFICATION:     'roue:notification',
  NOTIF_LU:              'notif:lu',

  // Dialogue — client → server
  DIALOGUE_INVITE:            'dialogue:invite',
  DIALOGUE_RESPOND:           'dialogue:respond',
  DIALOGUE_SITUATION_UPDATE:  'dialogue:situation:update',
  DIALOGUE_SITUATION_READY:   'dialogue:situation:ready',
  DIALOGUE_REPLIQUE:          'dialogue:replique',
  DIALOGUE_TERMINER:          'dialogue:terminer',

  // Dialogue — server → client
  DIALOGUE_INVITATION:        'dialogue:invitation',
  DIALOGUE_ACCEPTED:          'dialogue:accepted',
  DIALOGUE_REFUSED:           'dialogue:refused',
  DIALOGUE_SITUATION_SYNC:        'dialogue:situation:sync',
  DIALOGUE_SITUATION_PEER_READY:  'dialogue:situation:peer_ready',
  DIALOGUE_CHAT_START:            'dialogue:chat:start',
  DIALOGUE_REPLIQUE_RECEIVED: 'dialogue:replique:received',
  DIALOGUE_DONE:              'dialogue:done',

  // Écriture
  ECRITURE_PRET:         'ecriture:pret',
  ECRITURE_SUBMIT:       'ecriture:submit',
  ECRITURE_RECEIVED:     'ecriture:received',
  AI_DONE:               'ai:done',

  // Clôture
  CLOTURE_TITRE:         'cloture:titre',

  // Lecture confirmée
  HISTOIRE_LU:           'histoire:lu',
  FICHE_LU:              'fiche:lu',

  // Reconnexion
  SESSION_REJOIN:             'session:rejoin',
  GAME_STATE_SYNC:            'game:state_sync',
  SESSION_PLAYER_DISCONNECTED:'session:player_disconnected',

  // Misc
  PING:                  'ping',
  PONG:                  'pong',
} as const;

export type EventName = typeof EV[keyof typeof EV];
