import type { Character, Wheel, PrivateNotification, Scenario } from './types';

const INTRODUCTION = `La saison des mariages a commencé il y a trois jours.

Séraphine, princesse de sang, sœur du roi, l'a voulue grandiose — et elle l'est. Les chandelles brûlent jusqu'à l'aube, les robes coûtent ce que certaines familles gagnent en un an, et les sourires sont si bien travaillés qu'on finirait par croire qu'ils sont sincères. La princesse préside tout avec cette grâce particulière qu'elle a — celle qui rend la manipulation invisible. Tout le monde l'adore. Tout le monde lui confie des choses. C'est exactement ce qu'elle veut.

Le roi, lui, n'est pas là. Il ne l'a pas été depuis le début de la saison. Séraphine dit qu'il est occupé. Personne ne pose de questions. On continue de danser. On continue de négocier. On fait comme si son absence n'avait aucune importance.

Les familles nobles sont arrivées les unes après les autres, avec leurs fils bien habillés, leurs filles bien dressées, et leurs dettes soigneusement cachées sous les broderies. Chacun cherche quelque chose. Un nom. De l'argent. Du pouvoir. Une alliance qui tienne. Personne ne dit vraiment quoi.

Ce soir, ces six histoires vont se percuter.`;

const CHARACTERS: Character[] = [
  {
    id: 'alienor',
    name: 'Aliénor Varel',
    tagline: "La fille qu'on a envoyée sauver sa famille",
    facePublique:
      "Dernière héritière des Varel, envoyée à la cour pour sauver sa famille. Franche jusqu'à la maladresse, attachante malgré elle — absolument convaincue qu'elle aurait dû être épargnée par tout ce cirque. Elle aime sa famille. Elle joue le jeu. Elle n'espère pas y trouver l'amour, juste un mari un peu gentil.",
    faceCachee:
      "Tu aimes Hadrien Maren depuis des années — en secret, parce que vos familles sont ennemies et que ça n'a aucun sens. Tu es arrivée à la cour en te disant que tu le reverrais et que ça suffirait. Sauf qu'un homme que tu ne connais pas — Edran — t'a parlé hier soir comme si le reste de la salle n'existait pas. Tu n'as pas dormi. Tu ne sais pas encore ce que ça signifie.",
    objectif: "Trouver un moyen de sauver ta famille sans épouser quelqu'un que tu n'as pas choisi.",
    relations: [
      {
        character: 'dameVarel',
        label: 'Amour familial',
        description: "Matriarche des Varel. Élégante, froide en apparence. Tient la façade à tout prix.",
      },
      {
        character: 'hadrien',
        label: 'Amour secret et impossible',
        description: "Fils du clan Maren, ennemi des Varel. Charmant et snob. Sa présence est une provocation.",
      },
      {
        character: 'celeste',
        label: 'Amie de circonstance',
        description: "Noble ambitieuse. Raffinée, calculatrice. S'est liée d'amitié avec Aliénor dès le premier jour.",
      },
      {
        character: 'seraphine',
        label: 'Méfiance instinctive',
        description: "Princesse de sang, sœur du roi. Préside la saison. Sait tout sur tout le monde.",
      },
      {
        character: 'edran',
        label: 'Inconnu sympa et troublant avec qui elle aime discuter',
        description: "Inconnu accepté à la cour par Séraphine. Mystérieux, discret, charmant. Personne ne sait qui il est.",
      },
    ],
  },
  {
    id: 'edran',
    name: 'Edran',
    tagline: "L'inconnu que personne ne connaît encore",
    facePublique:
      "Personne ne l'avait vu à la cour avant cette saison. Mystérieux, distant, suffisamment charmant pour que tout le monde cherche à comprendre qui il est. La seule chose certaine : Séraphine l'a accepté à la cour. Ce que ça signifie exactement, personne ne le dit — mais tout le monde y pense.",
    faceCachee:
      "Tu es le frère cadet du roi — élevé loin de la cour pour éviter toute rivalité. Ton frère est mourant. Il t'a fait revenir en secret pour préparer la succession — personne n'est au courant, pas même Séraphine. Il profite que personne ne te connaisse pour te confier une mission : surveiller la famille Drave, qui manigance des alliances pour faire valoir une créance royale ancienne et explosive. Tu as repéré leurs négociations simultanées avec les Maren et les Varel. Tu dois tout faire pour faire capoter ces alliances. Dans ta surveillance, tu as discuté avec Aliénor Varel. Tu t'attendais à une conversation de plus — ça a été autre chose. Tu as parlé, vraiment parlé, et tu en as oublié ta mission le temps d'une soirée. Une chose est sûre : Aliénor est trop franche pour cacher quoi que ce soit.",
    objectif:
      "Faire capoter toutes les alliances avec les Drave — et ne pas laisser Aliénor Varel te faire perdre le fil de ce pour quoi tu es là.",
    relations: [
      {
        character: 'alienor',
        label: 'Attachement naissant et inattendu',
        description: "Dernière héritière des Varel. Franche, attachante, envoyée à la cour pour sauver sa famille.",
      },
      {
        character: 'hadrien',
        label: 'Adversaire à surveiller',
        description: "Fils du clan Maren, ennemi des Varel. Charmant et snob. Sa présence est une provocation.",
      },
      {
        character: 'dameVarel',
        label: 'Obstacle potentiel',
        description: "Matriarche des Varel. Élégante, froide en apparence. Tient la façade à tout prix.",
      },
      {
        character: 'celeste',
        label: 'Inconnue à évaluer',
        description: "Noble ambitieuse. Raffinée, calculatrice. S'est liée d'amitié avec Aliénor dès le premier jour.",
      },
      {
        character: 'seraphine',
        label: 'Confiance de famille',
        description: "Princesse de sang, sœur du roi. Préside la saison. Sait tout sur tout le monde.",
      },
    ],
  },
  {
    id: 'hadrien',
    name: 'Hadrien Maren',
    tagline: 'Le fils du clan ennemi — avec un plan',
    facePublique:
      "Fils du clan Maren, ennemi héréditaire des Varel. Sa seule présence dans cette salle est une provocation. Charmant, peu accessible, avec cette tendance à regarder le monde de haut qui agace autant qu'il attire. Il sourit rarement. Quand il le fait, les gens ont tendance à oublier de se méfier.",
    faceCachee:
      "Tu es venu à la cour pour une seule raison : finaliser l'alliance entre les Maren et la famille Drave. Les Drave détiennent une créance sur la couronne — une arme politique que les Maren veulent utiliser pour peser sur la succession. Tu sais exactement ce que tu fais et pourquoi. Ce que tu n'avais pas prévu : Aliénor est là. Tes sentiments pour elle sont réels — et ils sont exactement le problème. Tu sais que ta mission va détruire sa famille. Tu continues quand même. Ou du moins, c'est ce que tu te dis.",
    objectif:
      "Conclure l'alliance Maren-Drave avant la fin de la saison — sans que tes sentiments pour Aliénor ne compromettent ce que tu es venu faire.",
    relations: [
      {
        character: 'alienor',
        label: 'Amour réel et problématique',
        description: "Dernière héritière des Varel. Franche, attachante, envoyée à la cour pour sauver sa famille.",
      },
      {
        character: 'dameVarel',
        label: 'Cible à affaiblir',
        description: "Matriarche des Varel. Élégante, froide en apparence. Tient la façade à tout prix.",
      },
      {
        character: 'celeste',
        label: 'Connaissance sans intérêt',
        description: "Noble ambitieuse. Raffinée, calculatrice. S'est liée d'amitié avec Aliénor dès le premier jour.",
      },
      {
        character: 'edran',
        label: 'Inconnu suspect',
        description: "Inconnu accepté à la cour par Séraphine. Mystérieux, discret, charmant. Personne ne sait qui il est.",
      },
      {
        character: 'seraphine',
        label: 'Autorité à ne pas contrarier',
        description: "Princesse de sang, sœur du roi. Préside la saison. Sait tout sur tout le monde.",
      },
    ],
  },
  {
    id: 'celeste',
    name: 'Céleste',
    tagline: 'Celle qui calcule — et qui commence à recalculer',
    facePublique:
      "Noble ambitieuse d'une grande famille de la cour. Raffinée, incontournable en société — elle est arrivée la première et a eu le temps de cartographier la salle avant que quiconque ne la remarque. S'est liée d'amitié avec Aliénor dès le premier jour, même si ce n'est pas des amis qu'elle est venue chercher ici.",
    faceCachee:
      "Tu ne sais pas encore qui est Edran. Mais tu as remarqué qu'il circule avec une discrétion qui ne ressemble pas à quelqu'un d'ordinaire — et que Séraphine ne l'a pas fait écarter. Ça suffit pour que tu le cibles. Tu te sers d'Aliénor comme écran : si Edran s'intéresse à elle, tu peux l'observer sans qu'il te remarque. Tu vas te renseigner discrètement — sur son origine, ses liens, ce qu'il fait ici. Si c'est le meilleur parti, tu veux le savoir avant tout le monde.",
    objectif:
      "Épouser le meilleur parti disponible — et déterminer si Edran en est un avant que quelqu'un d'autre ne s'en aperçoive.",
    relations: [
      {
        character: 'alienor',
        label: 'Outil utile',
        description: "Dernière héritière des Varel. Franche, attachante, envoyée à la cour pour sauver sa famille.",
      },
      {
        character: 'edran',
        label: 'Cible à évaluer en priorité',
        description: "Inconnu accepté à la cour par Séraphine. Mystérieux, discret, charmant. Personne ne sait qui il est.",
      },
      {
        character: 'hadrien',
        label: 'Connaissance écartée',
        description: "Fils du clan Maren, ennemi des Varel. Charmant et snob. Sa présence est une provocation.",
      },
      {
        character: 'dameVarel',
        label: 'Sans intérêt',
        description: "Matriarche des Varel. Élégante, froide en apparence. Tient la façade à tout prix.",
      },
      {
        character: 'seraphine',
        label: 'Méfiance respectueuse',
        description: "Princesse de sang, sœur du roi. Préside la saison. Sait tout sur tout le monde.",
      },
    ],
  },
  {
    id: 'dameVarel',
    name: 'Dame Varel',
    tagline: 'La mère qui tient la façade',
    facePublique:
      "Matriarche des Varel. A traversé la salle d'entrée avec la grâce de quelqu'un qui n'a peur de rien — c'est un mensonge qu'elle perfectionne depuis vingt ans. Élégante, froide en apparence. Tient la façade à tout prix.",
    faceCachee:
      "La ruine est bien plus grave qu'Aliénor ne le sait. Tu as déjà vendu des actifs familiaux sans lui en parler. Il vous reste une saison — peut-être moins. Tu as repéré la famille Drave depuis leur arrivée : riches, discrets, revenus à la cour après des années d'absence. Tu veux marier Aliénor au fils Drave. Séraphine sait pour tes dettes — tu en es certaine. Tu te méfies d'elle, tu ne veux pas la contrarier, tu fais tout pour rester dans ses bonnes grâces tout en avançant tes pions discrètement.",
    objectif:
      "Conclure l'alliance avec les Drave avant que la vérité sur les dettes n'éclate — sans mettre Séraphine à dos.",
    relations: [
      {
        character: 'alienor',
        label: 'Amour maternel',
        description: "Dernière héritière des Varel. Franche, attachante, envoyée à la cour pour sauver sa famille.",
      },
      {
        character: 'seraphine',
        label: 'Méfiance constante',
        description: "Princesse de sang, sœur du roi. Préside la saison. Sait tout sur tout le monde.",
      },
      {
        character: 'hadrien',
        label: 'Ennemi héréditaire',
        description: "Fils du clan Maren, ennemi des Varel. Charmant et snob. Sa présence est une provocation.",
      },
      {
        character: 'celeste',
        label: 'Connaissance neutre',
        description: "Noble ambitieuse. Raffinée, calculatrice. S'est liée d'amitié avec Aliénor dès le premier jour.",
      },
      {
        character: 'edran',
        label: 'Inconnu',
        description: "Inconnu accepté à la cour par Séraphine. Mystérieux, discret, charmant. Personne ne sait qui il est.",
      },
    ],
  },
  {
    id: 'seraphine',
    name: 'Séraphine',
    tagline: 'La princesse qui tient la saison — et cache le reste',
    facePublique:
      "Princesse de sang, sœur du roi. Préside la saison des mariages avec une grâce particulière — celle qui rend la manipulation invisible. Tout le monde l'adore. Tout le monde lui confie des choses. C'est exactement ce qu'elle veut.",
    faceCachee:
      "Tu sais que ton frère est mourant — et tu es la seule à la cour à le savoir. Tu fais tout pour que ça ne se voie pas : une saison grandiose, des festivités impeccables, une façade parfaite. Tu sais que la famille Drave détient une créance sur la couronne — une dette royale ancienne et explosive. Quand tu as vu Dame Varel s'approcher des Drave, tu as immédiatement compris le danger pour ta saison. Tu vas tout balancer sur leur situation financière pour faire capoter la négociation. Ton frère t'a imposé d'accepter à la cour un certain Edran, sans te donner d'explication. Tu dois te renseigner discrètement pour comprendre qui il est et ce qu'il fait là.",
    objectif:
      "Que cette saison soit la plus belle qu'on ait vue — et maintenir l'illusion que tout va bien assez longtemps pour garder la main sur ce qui vient.",
    relations: [
      {
        character: 'alienor',
        label: 'Menace potentielle',
        description: "Dernière héritière des Varel. Franche, attachante, envoyée à la cour pour sauver sa famille.",
      },
      {
        character: 'dameVarel',
        label: 'Neutralisée',
        description: "Matriarche des Varel. Élégante, froide en apparence. Tient la façade à tout prix.",
      },
      {
        character: 'hadrien',
        label: 'Danger à surveiller',
        description: "Fils du clan Maren, ennemi des Varel. Charmant et snob. Sa présence est une provocation.",
      },
      {
        character: 'celeste',
        label: 'Connaissance sans importance',
        description: "Noble ambitieuse. Raffinée, calculatrice. S'est liée d'amitié avec Aliénor dès le premier jour.",
      },
      {
        character: 'edran',
        label: 'Mystère imposé par son frère',
        description: "Inconnu accepté à la cour par Séraphine. Mystérieux, discret, charmant. Personne ne sait qui il est.",
      },
    ],
  },
];

const ROUES: Wheel[] = [
  {
    number: 1,
    title: 'La perturbation',
    subtitle: 'La rumeur sur la ruine des Varel se répand',
    variants: [
      {
        id: 'C1',
        text: "Séraphine glisse à l'oreille d'une noble en vue pendant le bal : ils font bonne figure, mais il n'y a plus rien derrière la façade. En une heure, toute la salle a compris que les Varel jouent un rôle qu'ils n'ont plus les moyens de tenir.",
      },
      {
        id: 'C2',
        text: "Un billet anonyme circule de table en table pendant le bal. Trois lignes seulement : la robe d'Aliénor est louée, le carrosse des Varel appartient à un créancier, et la famille n'a plus un sou vaillant depuis six mois. Quand il arrive aux mains d'Aliénor, la moitié de la salle l'a déjà lu.",
      },
      {
        id: 'C3',
        text: "Deux nobles s'arrêtent de danser pour observer Aliénor traverser la salle. L'un dit à l'autre : tout ça est emprunté — la robe, les bijoux, le sourire. Ce n'est pas chuchoté. C'est dit à voix normale.",
      },
      {
        id: 'C4',
        text: "Pendant le bal, un prétendant qui courtisait Aliénor ce matin salue Dame Varel avec une froideur nouvelle. Il ne demande pas à danser. Il s'éloigne. Le message est clair pour qui sait lire — et ce soir, tout le monde sait lire.",
      },
      {
        id: 'C5',
        text: "Hadrien demande à Aliénor de danser au moment précis où la rumeur atteint son pic. Tout le monde les regarde — un fils Maren qui danse avec une Varel qui fait semblant. Les commentaires fusent dans leur dos.",
      },
      {
        id: 'C6',
        text: "Dame Varel surprend un groupe de nobles qui se taisent à son approche. L'une d'elles baisse les yeux sur la robe de Dame Varel — une seconde de trop. Dame Varel comprend. La façade qu'elle a tenue pendant des années vient de s'effondrer en une soirée.",
      },
    ],
  },
  {
    number: 2,
    title: "L'escalade",
    subtitle: 'Les Drave débarquent et affichent leur alliance avec les Maren',
    variants: [
      {
        id: 'C1',
        text: "Les Drave font leur entrée dans la salle avec une assurance qui surprend tout le monde. Hadrien Maren se lève pour les accueillir — un geste discret, mais remarqué par ceux qui observent. Le lien entre les deux familles ne fait plus de doute.",
      },
      {
        id: 'C2',
        text: "La fille Drave s'installe à la table des Maren sans y être invitée — ou du moins c'est ce que tout le monde croit. Hadrien tire sa chaise. Personne ne dit rien. Tout le monde regarde.",
      },
      {
        id: 'C3',
        text: "Le patriarche Drave prend la parole dans un salon bondé et mentionne les Maren comme ses alliés naturels — le mot est lâché sans détour, devant une vingtaine de nobles. Il sourit en disant ça. Il sait exactement ce qu'il fait.",
      },
      {
        id: 'C4',
        text: "Hadrien et la fille Drave sont vus ensemble dans les jardins. Pas de discrétion, pas d'excuse. Quand on leur pose des questions, la fille Drave répond à la place d'Hadrien — avec l'aisance de quelqu'un qui a déjà décidé.",
      },
      {
        id: 'C5',
        text: "Le patriarche Drave s'approche de Séraphine pendant le bal et lui dit à voix basse — mais pas assez — que sa famille est revenue pour ce qui lui appartient, et que les Maren comprennent ça mieux que quiconque à la cour.",
      },
      {
        id: 'C6',
        text: "Un émissaire Drave remet officiellement un document scellé à Hadrien Maren au milieu de la salle. Personne ne sait ce qu'il contient. Tout le monde a vu le sceau des Drave. La menace est publique, assumée, et personne ne sait encore comment y répondre.",
      },
    ],
  },
  {
    number: 3,
    title: 'Le pivot final',
    subtitle: 'Le roi est mort — Edran est le successeur désigné',
    variants: [
      {
        id: 'C1',
        text: "Un messager royal entre dans la salle en plein bal et annonce la mort du roi à voix haute. Le silence tombe. Séraphine se lève. Elle annonce elle-même, d'une voix parfaitement contrôlée, que le roi avait un successeur désigné — un homme présent dans cette salle ce soir. Elle se tourne vers Edran. Le patriarche Drave se lève immédiatement et brandit un document scellé : la créance royale. La succession est contestée avant même d'être proclamée.",
      },
      {
        id: 'C2',
        text: "Un émissaire royal entre discrètement et remet un pli scellé à Edran. Il le lit. Il se lève. Il annonce lui-même qui il est et ce qui vient de se passer. La cour se fige. Les Maren et les Drave échangent un regard — et le patriarche Drave prend la parole pour contester la légitimité de la succession au nom de la dette que la couronne n'a jamais honorée.",
      },
      {
        id: 'C3',
        text: "La nouvelle arrive par rumeur d'abord — le roi est mort, chuchoté de table en table. Puis un officier royal entre et confirme. Il annonce qu'un successeur a été désigné en secret — et prononce le nom d'Edran. Dans le chaos qui suit, Hadrien Maren se lève et déclare publiquement que la succession ne peut être validée tant que la créance Drave n'est pas honorée.",
      },
      {
        id: 'C4',
        text: "Séraphine reçoit la nouvelle en privé — un billet glissé dans sa main pendant le bal. Elle le lit sans changer d'expression. Elle frappe son verre pour obtenir le silence. Elle annonce la mort de son frère, puis la succession d'Edran — qu'elle découvre en lisant le billet. Sa voix ne tremble pas. Pendant qu'elle parle, le patriarche Drave murmure quelque chose à Hadrien Maren. Ils se lèvent ensemble.",
      },
      {
        id: 'C5',
        text: "C'est la fille Drave qui parle la première — avant toute annonce officielle. Elle se lève au milieu du bal et dit à voix haute qu'elle a appris la mort du roi et qu'avant toute succession, sa famille exige que la couronne honore sa dette. Hadrien Maren se lève à ses côtés. L'annonce officielle de la succession d'Edran arrive dans ce chaos — et tombe dans une salle déjà en guerre.",
      },
      {
        id: 'C6',
        text: "Un officier royal entre et remet deux documents simultanément : l'un à Séraphine, annonçant la mort du roi — l'autre à Edran, confirmant sa succession. Les deux lisent en même temps. La salle observe sans comprendre. Quand Edran lève les yeux, le patriarche Drave est déjà debout, la créance royale à la main, la voix assez forte pour que toute la cour entende : cette succession est illégitime tant que cette dette n'est pas soldée.",
      },
    ],
  },
];

const NOTIFICATIONS: PrivateNotification[] = [
  // ALIÉNOR
  {
    characterId: 'alienor',
    roue: 1,
    type: 'FAILLE',
    text: "Tout le monde sait. Tu dois tenir la façade jusqu'à la fin du bal — sourire, danser, saluer. Si tu craques maintenant, la rumeur devient une certitude aux yeux de tous. Trouve ta mère avant qu'elle ne l'apprenne d'une autre bouche que la tienne.",
  },
  {
    characterId: 'alienor',
    roue: 2,
    type: 'FAILLE',
    text: "Tu as le cœur brisé. Tu es persona non grata — plus personne ne veut te parler dans cette salle, sauf Edran. Tu allais confronter Hadrien quand tu surprends une conversation sur une certaine dette royale que les Drave comptent utiliser pour menacer la couronne. Tu gardes cette information pour toi. Tu n'en parles pas à ta mère. Seulement à Edran, au détour d'une conversation.",
  },
  {
    characterId: 'alienor',
    roue: 3,
    type: 'MOTIVATION',
    text: "Edran aussi t'a menti — sur qui il est, sur ce qu'il faisait là. Tu décides de fuir. Tu traverses la salle sans te retourner. Tu as des milliers de questions à lui poser — et c'est exactement pour ça que tu pars.",
  },
  // EDRAN
  {
    characterId: 'edran',
    roue: 1,
    type: 'MOTIVATION',
    text: "Les Drave vont se désintéresser des Varel ruinés — ce qui laisse le champ libre aux Maren. Rapproche-toi d'Hadrien ce soir. Observe ce qu'il fait, à qui il parle. Tu dois savoir où en est sa négociation avec les Drave avant demain matin.",
  },
  {
    characterId: 'edran',
    roue: 2,
    type: 'MOTIVATION',
    text: "Tu trouves un moment pour parler à Aliénor — tu veux savoir comment elle va. Au détour de la conversation, elle te révèle qu'elle a surpris une conversation : les Maren et les Drave ont prévu d'utiliser une dette royale ancienne pour menacer la couronne et contester la succession. C'est plus grave que tu ne le pensais. Tu dois agir vite.",
  },
  {
    characterId: 'edran',
    roue: 3,
    type: 'MOTIVATION',
    text: "Tu vois Aliénor fuir. Tu sais pourquoi — et tu sais que tu le mérites. Tu dois décider si tu la laisses partir ou si tu vas la chercher. La couronne peut attendre cinq minutes. Aliénor, peut-être pas.",
  },
  // HADRIEN
  {
    characterId: 'hadrien',
    roue: 1,
    type: 'MOTIVATION',
    text: "Dame Varel n'a plus le temps — elle va accélérer ses démarches vers les Drave dès cette nuit. Tu dois contacter les Drave avant elle et verrouiller ta position. Ce soir, pendant le bal, c'est maintenant ou jamais.",
  },
  {
    characterId: 'hadrien',
    roue: 2,
    type: 'SECRET',
    text: "Les Drave ont affiché l'alliance sans te consulter et plus tôt que prévu. Tu perds le contrôle. Retrouve le patriarche Drave ce soir et recadre les termes avant qu'il ne prenne trop d'initiatives. Et décide quoi faire d'Aliénor — elle a compris quelque chose.",
  },
  {
    characterId: 'hadrien',
    roue: 3,
    type: 'FAILLE',
    text: "Tu vois Aliénor fuir. Tu viens de te lever contre le futur roi devant toute la cour. Il n'y a plus de retour en arrière sur ta mission — mais il y en a peut-être encore un sur Aliénor. Décide maintenant ce que tu fais. Chaque minute qui passe ferme une porte.",
  },
  // CÉLESTE
  {
    characterId: 'celeste',
    roue: 1,
    type: 'SECRET',
    text: "En espionnant Séraphine, tu as appris trois choses ce soir : c'est elle qui a répandu la rumeur sur les Varel. Les Drave sont interdits de cour par ordre du roi lui-même — ce ne sont pas de bons partis. Et c'est le roi en personne qui a imposé Edran à la cour cette saison. Tu ne sais pas encore qui il est — mais tu vas creuser.",
  },
  {
    characterId: 'celeste',
    roue: 2,
    type: 'SECRET',
    text: "Tu viens d'apprendre qu'Edran est le frère du roi — et que le roi est mourant. Edran est donc le futur héritier. C'est lui le meilleur parti. Tu l'as beaucoup vu parler avec Aliénor mais peu importe — tu veux le meilleur parti. Tu vas te positionner. Ce soir. Maintenant.",
  },
  {
    characterId: 'celeste',
    roue: 3,
    type: 'MOTIVATION',
    text: "Edran est le futur roi et il vient d'être attaqué. C'est maintenant — pas demain. Va le trouver et propose-lui ce que tu sais sur les Drave et les Maren. Tu n'as qu'une seule chance de devenir une alliée plutôt qu'une opportuniste.",
  },
  // DAME VAREL
  {
    characterId: 'dameVarel',
    roue: 1,
    type: 'FAILLE',
    text: "Quelqu'un a parlé. Tu dois trouver qui ce soir — pas demain. Retourne dans la salle, souris, et écoute. La source de la rumeur est encore dans cette salle. Et contacte les Drave avant qu'ils ne t'écartent définitivement.",
  },
  {
    characterId: 'dameVarel',
    roue: 2,
    type: 'MOTIVATION',
    text: "Les Drave sont dans l'impasse. Tu n'as plus le temps de chercher une alliance parfaite — tu dois trouver un parti acceptable ce soir même. Tu scrutes la salle. Il y a un homme que tout le monde regarde sans savoir qui il est — Edran. Tu te renseignes discrètement. Ce que tu apprends t'arrête net : c'est le roi lui-même qui l'a imposé à la cour cette saison. Ce que tu sais en revanche : il passe son temps à parler avec Aliénor. Elle le fait rire. Il revient toujours vers elle. C'est peut-être ta seule option. Tu l'observes.",
  },
  {
    characterId: 'dameVarel',
    roue: 3,
    type: 'MOTIVATION',
    text: "Tu vois Aliénor fuir — tu ne comprends pas ce qui se passe. Dans la confusion, tu t'approches de Séraphine et tu lui révèles ce que tu as découvert dans les affaires de ton mari — ancien conseiller juridique du roi précédent : un acte d'annulation signé par le roi précédent, certifiant que la dette envers les Drave avait été officiellement effacée en échange de leur exil volontaire. Tu ne réalises pas encore l'importance de ce que tu viens de dire.",
  },
  // SÉRAPHINE
  {
    characterId: 'seraphine',
    roue: 1,
    type: 'MOTIVATION',
    text: "La rumeur circule mais pas assez vite, pas assez précisément. Tu as la parole dans dix minutes pour annoncer le programme du lendemain. Glisse ce qu'il faut — un détail précis, un chiffre — pour que personne n'ose encore s'associer aux Varel. Tu en as fini avec eux. Maintenant tu dois savoir qui est Edran.",
  },
  {
    characterId: 'seraphine',
    roue: 2,
    type: 'SECRET',
    text: "Tu vas voir ton frère — tu sais qu'il n'en a plus pour longtemps. C'est votre dernier adieu. Il te prend la main et te dit la vérité : Edran est votre frère. Il sera le futur roi. Ton frère t'a caché son existence pendant toutes ces années. Tu repars dans la salle avec cette information — et tu dois décider quoi en faire.",
  },
  {
    characterId: 'seraphine',
    roue: 3,
    type: 'SECRET',
    text: "Dame Varel vient de te révéler qu'un acte d'annulation signé par le roi précédent efface officiellement la créance des Drave — en échange de leur exil volontaire. Si c'est vrai, les Maren et les Drave viennent de perdre leur seule arme. Tu as la parole. Tu as l'information. C'est le moment de soutenir ton frère — publiquement, maintenant.",
  },
];

export const derniereSaison: Scenario = {
  id: 'derniere-saison',
  title: 'La Dernière Saison',
  tagline: "À la cour, tout a un prix. Même l'amour.",
  shortDescription: "Six nobles à la cour d'une princesse ambitieuse, lors d'un bal qui cache une succession contestée.",
  audience: 'adultes',
  universe: 'Historique',
  tone: 'Sombre',
  minPlayers: 4,
  maxPlayers: 6,
  duration: '~1h30',
  introduction: INTRODUCTION,
  characters: CHARACTERS,
  roues: ROUES,
  notifications: NOTIFICATIONS,
};
