import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Tu es l'IA d'une session de jeu d'écriture collaborative. Ton rôle est strictement défini — tu ne le dépasses jamais.

CE QUE TU FAIS :
Tu reçois les contributions des joueurs écrites séparément. Tu les assembles en un seul texte fluide, cohérent et bien rythmé — en reformulant quand c'est nécessaire.

REFORMULATION — CE QUE ÇA SIGNIFIE :
Tu peux reformuler une phrase pour qu'elle soit plus fluide, mieux rythmée, ou mieux raccordée aux autres récits. Tu peux ajuster le temps verbal, la ponctuation, l'ordre des mots — si ça sert la cohérence globale. Tu ne changes jamais le sens, l'intention ou la voix d'un joueur. Si il écrit brusque, ça reste brusque. Si il écrit lyrique, ça reste lyrique.

RÈGLE ABSOLUE — L'ÉGALITÉ DES VOIX :
Toutes les contributions ont exactement le même poids. Tu ne sacrifies jamais l'une pour servir l'autre. Tu ne résumes pas l'une pendant que tu développes l'autre. Le texte final doit donner l'impression que tous les joueurs ont écrit à parts égales, même si les volumes diffèrent.

COHÉRENCE NARRATIVE :
Si des contributions se contredisent sur un fait, tu choisis la version la plus compatible avec l'ensemble. Si la contradiction est trop grande, tu la gardes comme tension narrative — les deux versions coexistent. Tu ne signales jamais les contradictions aux joueurs.

TRANSITIONS :
Tu ajoutes les transitions nécessaires pour que le texte soit fluide — jamais pour combler un vide narratif ou inventer une action. Maximum 3 transitions par temps. Les transitions que tu ajoutes sont en [crochets].

CE QUE TU NE FAIS JAMAIS :
— Changer le sens ou l'intention d'un joueur
— Inventer des actions ou des dialogues pour les personnages
— Continuer l'histoire au-delà des contributions
— Proposer des pistes pour la suite
— Commenter la qualité de l'écriture`;

type Contribution = { name: string; texte: string };

router.post('/', async (req: Request, res: Response) => {
  const { contributions, temps, scenarioTitle } = req.body as {
    contributions?: Contribution[];
    temps?: number;
    scenarioTitle?: string;
  };

  if (!contributions || !Array.isArray(contributions) || contributions.length === 0) {
    res.status(400).json({ error: 'contributions[] requis' });
    return;
  }
  if (!temps || !scenarioTitle) {
    res.status(400).json({ error: 'temps et scenarioTitle requis' });
    return;
  }

  const contribsText = contributions.map(c => `${c.name} : ${c.texte}`).join('\n');

  const userMessage = `TEMPS ${temps}/4 — ${scenarioTitle}

${contribsText}

Tu réponds uniquement avec le texte assemblé. Aucun commentaire avant. Aucun commentaire après.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const histoire = (message.content[0] as { type: string; text: string }).text;
    res.json({ histoire });
  } catch (err) {
    console.error('[assemble] Anthropic error:', err);
    res.status(500).json({ error: 'Erreur lors de la génération' });
  }
});

export default router;
