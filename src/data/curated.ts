import type { Book } from '../lib/types';

/**
 * The curated shelf: records written by hand rather than generated. These lead
 * the "Recommended" ordering, supply the featured spines on the hero shelf and
 * set the tone for the copy in the rest of the catalog.
 */

type CuratedSeed = Omit<Book, 'id' | 'addedAt' | 'curated'> & { id: string };

const SEEDS: CuratedSeed[] = [
  {
    id: 'the-long-field',
    title: 'The Long Field',
    author: 'Marguerite Ellery',
    genre: 'literary-fiction',
    tags: ['Family', 'Rural Life'],
    year: 2019,
    recommendation: 0.98,
    synopsis:
      'A widow returns to the farm she left at nineteen and finds her older sister still keeping its accounts in the same green ledger. Across one harvest they sort fifty years of small grievances into the things worth saying aloud and the things worth ploughing under. Almost nothing is resolved, and almost everything is understood.',
  },
  {
    id: 'salt-and-thread',
    title: 'Salt and Thread',
    author: 'Inês Cardoso',
    genre: 'literary-fiction',
    tags: ['Coastal', 'Craft'],
    year: 2021,
    recommendation: 0.94,
    synopsis:
      'In a harbour town losing a family a month to the mainland, a seamstress mends the good clothes of everyone about to leave. Her needle ends up keeping the record the parish register gave up on. A novel about departure told entirely from the room people pass through on their way out.',
  },
  {
    id: 'the-lodgers',
    title: 'The Lodgers',
    author: 'Aidan Rook',
    genre: 'literary-fiction',
    tags: ['City', 'Strangers'],
    year: 2017,
    recommendation: 0.88,
    synopsis:
      'Four strangers share a narrow house through one cold spring, joined by nothing but a staircase and a temperamental boiler. The novel listens at each door in turn, then at the landing where their lives briefly overlap.',
  },
  {
    id: 'wintering-at-alderhall',
    title: 'Wintering at Alderhall',
    author: 'Charlotte Ferris',
    genre: 'classics',
    tags: ['Victorian', 'Houses'],
    year: 1876,
    recommendation: 0.96,
    synopsis:
      'A governess arrives at a house where every clock is deliberately kept ten minutes fast. What she takes at first for an eccentricity turns out to be the family’s entire method of avoiding the present. The cold arrives before the truth does.',
  },
  {
    id: 'the-merchants-daughter',
    title: "The Merchant's Daughter",
    author: 'Thomas Ardenne',
    genre: 'classics',
    tags: ['Inheritance', 'Trade'],
    year: 1859,
    recommendation: 0.9,
    synopsis:
      'Left the whole of her father’s shipping interest and none of his authority, Hester Vane spends a decade learning which doors money opens and which it merely rattles. A patient, unsparing novel about a woman doing business in a century that would rather she did not.',
  },
  {
    id: 'letters-from-the-quay',
    title: 'Letters from the Quay',
    author: 'Eleanora Vasse',
    genre: 'classics',
    tags: ['Epistolary', 'Exile'],
    year: 1891,
    recommendation: 0.86,
    synopsis:
      'Eleven years of letters between a translator in exile and the friend who stayed behind, published exactly as they were folded. The gaps where letters went missing say as much as the letters that survived.',
  },
  {
    id: 'the-grain-road',
    title: 'The Grain Road',
    author: 'Yusuf Haddad',
    genre: 'history',
    tags: ['Trade', 'Mediterranean'],
    year: 2020,
    recommendation: 0.95,
    synopsis:
      'Four centuries of Mediterranean history retold through the movement of wheat — who grew it, who taxed it, and which cities starved when the ships were late. Haddad argues that empires were held together less by armies than by the reliability of the next harvest.',
  },
  {
    id: 'nine-winters-in-novgorod',
    title: 'Nine Winters in Novgorod',
    author: 'Piotr Salenko',
    genre: 'history',
    tags: ['Medieval', 'Cities'],
    year: 2015,
    recommendation: 0.89,
    synopsis:
      'A medieval trading republic reconstructed from birch-bark notes: debts, shopping lists, a boy’s writing practice. Salenko builds a whole civic life out of what people scribbled and threw away.',
  },
  {
    id: 'the-cartographers-quarrel',
    title: "The Cartographers' Quarrel",
    author: 'Helena Brandt',
    genre: 'history',
    tags: ['Maps', 'Science'],
    year: 2018,
    recommendation: 0.84,
    synopsis:
      'Two rival survey offices spend thirty years disagreeing about where a border lies, and redraw half a continent in the process. A history of how confident lines get drawn over uncertain ground.',
  },
  {
    id: 'the-weight-of-light',
    title: 'The Weight of Light',
    author: 'Ruth Ovendale',
    genre: 'science',
    tags: ['Physics', 'Instruments'],
    year: 2022,
    recommendation: 0.97,
    synopsis:
      'How a century of astronomers learned to weigh things they could never touch, using nothing but arriving light. Ovendale writes about instruments the way other people write about characters — patiently, and with real affection for their failures.',
  },
  {
    id: 'tidal',
    title: 'Tidal',
    author: 'Kenji Morrow',
    genre: 'science',
    tags: ['Oceans', 'Time'],
    year: 2016,
    recommendation: 0.88,
    synopsis:
      'The moon pulls, the sea answers, and everything that lives at the edge arranges its life around the reply. A slow, clear account of the one rhythm that has never once been interrupted.',
  },
  {
    id: 'a-field-guide-to-uncertainty',
    title: 'A Field Guide to Uncertainty',
    author: 'Amara Osei',
    genre: 'science',
    tags: ['Statistics', 'Method'],
    year: 2021,
    recommendation: 0.85,
    synopsis:
      'A working scientist’s guide to the difference between not knowing, not knowing yet, and not being able to know. Osei treats error bars as the most honest sentence in any paper.',
  },
  {
    id: 'the-slow-signal',
    title: 'The Slow Signal',
    author: 'Vera Kostova',
    genre: 'science-fiction',
    tags: ['First Contact', 'Isolation'],
    year: 2023,
    recommendation: 0.96,
    synopsis:
      'A transmission arrives that will take four hundred years to answer, and the institute built to reply must survive longer than any government has. The novel follows six generations of staff keeping a promise none of them will see kept.',
  },
  {
    id: 'ashfall-station',
    title: 'Ashfall Station',
    author: 'Dmitri Lang',
    genre: 'science-fiction',
    tags: ['Colony', 'Survival'],
    year: 2019,
    recommendation: 0.87,
    synopsis:
      'Nine researchers wait out a volcanic winter on a world that was supposed to be dormant. The rationing is solved long before the loneliness is.',
  },
  {
    id: 'the-quiet-fleet',
    title: 'The Quiet Fleet',
    author: 'Nadia Oyelaran',
    genre: 'science-fiction',
    tags: ['Ships', 'Memory'],
    year: 2020,
    recommendation: 0.83,
    synopsis:
      'The ships remember their crews long after the crews have gone, and one of them has begun editing what it remembers. A restrained, unsettling novel about who gets to keep the official version.',
  },
  {
    id: 'on-being-interrupted',
    title: 'On Being Interrupted',
    author: 'Caspar Lindt',
    genre: 'philosophy',
    tags: ['Attention', 'Ethics'],
    year: 2021,
    recommendation: 0.94,
    synopsis:
      'Lindt takes the interruption — the knock, the notification, the question at the wrong moment — as the basic unit of modern life and asks what we owe the person doing the interrupting. A short book that quietly rearranges how you hold your own time.',
  },
  {
    id: 'the-sufficient-life',
    title: 'The Sufficient Life',
    author: 'Miriam Okonjo',
    genre: 'philosophy',
    tags: ['Enough', 'Virtue'],
    year: 2018,
    recommendation: 0.9,
    synopsis:
      'An argument for sufficiency over accumulation, built from the ancient schools and tested against a very contemporary restlessness. Okonjo is careful never to confuse having less with wanting less.',
  },
  {
    id: 'notes-toward-a-patient-ethics',
    title: 'Notes Toward a Patient Ethics',
    author: 'Abel Veyra',
    genre: 'philosophy',
    tags: ['Time', 'Obligation'],
    year: 2016,
    recommendation: 0.82,
    synopsis:
      'What do we owe people we will never meet, in centuries we will never see? Veyra builds the case slowly, in numbered fragments, and refuses every shortcut that would make it easier.',
  },
  {
    id: 'the-cartographer-of-salt',
    title: 'The Cartographer of Salt',
    author: 'Idris Vance',
    genre: 'fantasy',
    tags: ['Maps', 'Sea'],
    year: 2022,
    recommendation: 0.95,
    synopsis:
      'The inland sea moves each season, and only one guild is permitted to say where it now lies. When a young surveyor maps it honestly, she discovers how much of the kingdom depends on the lie. Invented geography, entirely believable weather.',
  },
  {
    id: 'hollow-crowns-green-fields',
    title: 'Hollow Crowns, Green Fields',
    author: 'Saoirse Mallen',
    genre: 'fantasy',
    tags: ['Succession', 'Folk Magic'],
    year: 2020,
    recommendation: 0.88,
    synopsis:
      'A dying queen leaves her throne to whichever heir can keep the harvest alive, not the army. What follows is less a war of succession than a very tense agricultural season.',
  },
  {
    id: 'the-lantern-keepers',
    title: 'The Lantern Keepers',
    author: 'Wen Ruo',
    genre: 'fantasy',
    tags: ['Guilds', 'Night'],
    year: 2017,
    recommendation: 0.81,
    synopsis:
      'In a city where the dark is genuinely dangerous, the people who light the lamps hold more power than the magistrates. An apprentice learns the routes, the rivalries, and what the guild does with anyone who sleeps through a shift.',
  },
  {
    id: 'what-the-orchard-kept',
    title: 'What the Orchard Kept',
    author: 'Deborah Vane',
    genre: 'mystery',
    tags: ['Village', 'Cold Case'],
    year: 2021,
    recommendation: 0.93,
    synopsis:
      'Forty years after a girl failed to come home, a storm brings down the oldest tree on the estate and the village has to talk about it again. Vane is less interested in who did it than in who has been careful not to ask.',
  },
  {
    id: 'a-death-in-low-season',
    title: 'A Death in Low Season',
    author: 'Gerald Amory',
    genre: 'mystery',
    tags: ['Seaside', 'Detective'],
    year: 2015,
    recommendation: 0.86,
    synopsis:
      'A resort town in February, one hotel still open, and a guest who signed the register in a name nobody can trace. The detective has three days before the trains start running properly again.',
  },
  {
    id: 'the-third-passenger',
    title: 'The Third Passenger',
    author: 'Lise Faber',
    genre: 'mystery',
    tags: ['Trains', 'Witnesses'],
    year: 2019,
    recommendation: 0.8,
    synopsis:
      'Two people agree on everything that happened in the compartment except the presence of a third. Faber takes both accounts seriously for as long as she possibly can.',
  },
  {
    id: 'the-instrument-maker',
    title: 'The Instrument Maker',
    author: 'Clara Mendel',
    genre: 'biography',
    tags: ['Music', 'Craft'],
    year: 2020,
    recommendation: 0.92,
    synopsis:
      'Antón Veres made ninety-one violins and destroyed eleven of them. Mendel follows a life spent in one workshop and finds an unexpectedly large world inside it.',
  },
  {
    id: 'nightwork',
    title: 'Nightwork: The Life of Ada Flint',
    author: 'Solomon Reyes',
    genre: 'biography',
    tags: ['Medicine', 'Reform'],
    year: 2018,
    recommendation: 0.87,
    synopsis:
      'A nurse who reorganised three city hospitals between midnight and six, when nobody senior was awake to object. Reyes reconstructs her from rosters, complaints and the letters her opponents wrote about her.',
  },
  {
    id: 'the-long-apprenticeship',
    title: 'The Long Apprenticeship',
    author: 'Hana Iwase',
    genre: 'biography',
    tags: ['Printing', 'Mastery'],
    year: 2016,
    recommendation: 0.79,
    synopsis:
      'Forty years at the same press, told in the order the skills arrived. A biography about the slowness of getting good at something.',
  },
  {
    id: 'household-weather',
    title: 'Household Weather',
    author: 'June Alvarez',
    genre: 'poetry',
    tags: ['Domestic', 'Lyric'],
    year: 2022,
    recommendation: 0.91,
    synopsis:
      'Poems about the climate inside a family — fronts moving through a kitchen, long dry spells at the dinner table. Alvarez writes short and lands hard.',
  },
  {
    id: 'the-small-hours',
    title: 'The Small Hours',
    author: 'Peter Nkemelu',
    genre: 'poetry',
    tags: ['Night', 'Anthology'],
    year: 2019,
    recommendation: 0.85,
    synopsis:
      'An anthology for the wakeful: ninety poems gathered for the part of the night when the house is quiet and the mind is not. Arranged to be read one at a time.',
  },
  {
    id: 'field-notes-for-a-drowned-village',
    title: 'Field Notes for a Drowned Village',
    author: 'Aoife Brennan',
    genre: 'poetry',
    tags: ['Place', 'Elegy'],
    year: 2021,
    recommendation: 0.78,
    synopsis:
      'A valley flooded for a reservoir, remembered street by street by someone who was seven when the water came. Part elegy, part inventory.',
  },
  {
    id: 'the-habit-of-us',
    title: 'The Habit of Us',
    author: 'Nina Falk',
    genre: 'psychology',
    tags: ['Relationships', 'Behaviour'],
    year: 2021,
    recommendation: 0.93,
    synopsis:
      'Falk studies couples who have been together for decades and finds that most of what holds them is procedural, not romantic — the small routines neither party can quite remember agreeing to. Warm, precise, occasionally uncomfortable.',
  },
  {
    id: 'rooms-we-return-to',
    title: 'Rooms We Return To',
    author: 'Elias Morgenthau',
    genre: 'psychology',
    tags: ['Memory', 'Place'],
    year: 2017,
    recommendation: 0.86,
    synopsis:
      'Why certain rooms hold memory so much better than others, and what that does to grief, homesickness and the way we furnish our lives. A book about space written by someone who thinks in time.',
  },
  {
    id: 'the-listening-cure',
    title: 'The Listening Cure',
    author: 'Priya Raman',
    genre: 'psychology',
    tags: ['Therapy', 'Attention'],
    year: 2020,
    recommendation: 0.8,
    synopsis:
      'A century of talking therapies examined for the one ingredient they all share: someone paying uninterrupted attention. Raman asks what happens when that becomes the scarcest thing we have.',
  },
  {
    id: 'a-year-of-ordinary-mornings',
    title: 'A Year of Ordinary Mornings',
    author: 'Beatrix Hallow',
    genre: 'self-discovery',
    tags: ['Routine', 'Attention'],
    year: 2022,
    recommendation: 0.9,
    synopsis:
      'Twelve months of paying attention to the first hour of the day, recorded without ceremony. Hallow is refreshingly uninterested in optimising anything.',
  },
  {
    id: 'enough-and-then-some',
    title: 'Enough, and Then Some',
    author: 'Malik Serrano',
    genre: 'self-discovery',
    tags: ['Ambition', 'Rest'],
    year: 2019,
    recommendation: 0.84,
    synopsis:
      'On the difficulty of stopping once you have what you wanted. Serrano writes as someone who got there, kept going anyway, and had to work out why.',
  },
  {
    id: 'the-quiet-inventory',
    title: 'The Quiet Inventory',
    author: 'Yara Demir',
    genre: 'self-discovery',
    tags: ['Reflection', 'Practice'],
    year: 2023,
    recommendation: 0.77,
    synopsis:
      'A practice of taking stock — of rooms, obligations, friendships — without turning it into a project. Short chapters, wide margins, no homework.',
  },
];

/** Fixed anchor so "Recently Added" ordering is stable across reloads. */
export const LIBRARY_EPOCH = Date.UTC(2026, 8, 16);

const DAY = 86400000;

export const CURATED_BOOKS: Book[] = SEEDS.map((seed, index) => ({
  ...seed,
  curated: true,
  addedAt: new Date(LIBRARY_EPOCH - index * 3 * DAY).toISOString(),
}));

/**
 * The spines on the hero shelf, in the order they stand. Chosen by hand across
 * ten different shelves so the arrangement reads as a cross-section of the
 * whole library rather than one genre's palette.
 */
export const FEATURED_IDS = [
  'wintering-at-alderhall',
  'the-grain-road',
  'the-long-field',
  'on-being-interrupted',
  'the-slow-signal',
  'household-weather',
  'the-cartographer-of-salt',
  'what-the-orchard-kept',
  'the-weight-of-light',
  'the-instrument-maker',
  'the-habit-of-us',
  'salt-and-thread',
];
