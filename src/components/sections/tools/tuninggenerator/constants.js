// ============================================================
// Tuning Generator - Constants & Preset Data
// ============================================================

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const REFERENCE_PITCHES = {
  A440: { name: "A4 = 440 Hz", refNote: 69, refFreq: 440 },
  A432: { name: "A4 = 432 Hz", refNote: 69, refFreq: 432 },
  C528: { name: "C5 = 528 Hz", refNote: 72, refFreq: 528 }
};

export const TEMPERAMENTS = {
  EQUAL: "equal",
  JUST: "just",
  PYTHAGOREAN: "pythagorean",
  ARABIC: "arabic",
  TURKISH: "turkish",
  INDIAN: "indian",
  CUSTOM: "custom"
};

/** Ordered list of all temperament keys for UI rendering. */
export const TEMPERAMENT_LIST = Object.values(TEMPERAMENTS);

/** Temperaments that use preset tables with cent offsets. */
export const PRESET_TEMPERAMENTS = [TEMPERAMENTS.ARABIC, TEMPERAMENTS.TURKISH, TEMPERAMENTS.INDIAN];

export const C_MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

export const JUST_RATIOS = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8];
export const PYTH_RATIOS = [1, 256 / 243, 9 / 8, 32 / 27, 81 / 64, 4 / 3, 729 / 512, 3 / 2, 128 / 81, 27 / 16, 16 / 9, 243 / 128];

export const ARABIC_MAQAMAT = [
  { id: "rast", name: "Rast", character: "Noble, uplifting", notes: "Neutral 3rd & 7th (E & B lowered ~24¢)", scale: [0, 2, 4, 5, 7, 9, 11], offsets: [0, 0, -50, 0, 0, 0, -50, 0, 0, 0, 0, 0] },
  {
    id: "bayati",
    name: "Bayati",
    character: "Soulful, emotional",
    notes: "Neutral 2nd (~150¢), foundation of Arabic music",
    scale: [0, 2, 3, 5, 7, 9, 10],
    offsets: [0, 0, -50, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    id: "hijaz",
    name: "Hijaz",
    character: "Exotic, dramatic",
    notes: 'Augmented 2nd (E♭→F#), quintessential "Middle Eastern"',
    scale: [0, 1, 4, 5, 7, 8, 10],
    offsets: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  { id: "nahawand", name: "Nahawand", character: "Arabic minor", notes: "Similar to Western harmonic minor, warm", scale: [0, 2, 3, 5, 7, 8, 11], offsets: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  {
    id: "saba",
    name: "Saba",
    character: "Melancholic, complex",
    notes: "Neutral 2nd, diminished 4th, no octave resolution",
    scale: [0, 2, 3, 5, 6, 9, 10],
    offsets: [0, 0, -50, 0, -50, 0, 0, 0, 0, 0, 0, 0]
  },
  { id: "ajam", name: "Ajam", character: "Bright, joyful", notes: "Closest to Western major scale", scale: [0, 2, 4, 5, 7, 9, 11], offsets: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  {
    id: "sikah",
    name: "Sikah",
    character: "Mystical, ethereal",
    notes: "Starts on neutral 3rd (E half-flat as tonic)",
    scale: [0, 2, 3, 5, 7, 8, 10],
    offsets: [0, 0, -50, 0, -50, 0, -50, 0, -50, 0, 0, 0]
  },
  { id: "kurd", name: "Kurd", character: "Earthy, grounded", notes: "Phrygian-like, common in folk traditions", scale: [0, 1, 3, 5, 7, 8, 10], offsets: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  {
    id: "huzam",
    name: "Huzam",
    character: "Ornate, floating",
    notes: "Sikah-based with raised 4th, delicate character",
    scale: [0, 2, 3, 6, 7, 8, 10],
    offsets: [0, 0, -50, 0, -50, 0, -50, 0, -50, 0, 0, 0]
  },
  {
    id: "nawa_athar",
    name: "Nawa Athar",
    character: "Intense, double harmonic",
    notes: "Two augmented 2nds, dramatic tension",
    scale: [0, 1, 4, 5, 7, 8, 11],
    offsets: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    id: "jiharkah",
    name: "Jiharkah",
    character: "Soft, gentle",
    notes: "Rast variant starting on F, pastoral quality",
    scale: [0, 2, 4, 5, 7, 9, 11],
    offsets: [0, 0, 0, 0, 0, 0, -50, 0, 0, 0, -50, 0]
  },
  { id: "suznak", name: "Suznak", character: "Sweet, lyrical", notes: "Rast lower + Hijaz upper, romantic feel", scale: [0, 2, 4, 5, 7, 9, 10], offsets: [0, 0, -50, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
];

export const TURKISH_MAKAMLAR = [
  {
    id: "rast_turkish",
    name: "Rast",
    character: "Bright, optimistic",
    notes: "Just major 3rd (vs Arabic neutral), 5-limit tuning",
    scale: [0, 2, 4, 5, 7, 9, 11],
    offsets: [0, 0, 4, -14, 0, -2, 6, -12, 0, 0, 6, -12]
  },
  {
    id: "hicaz",
    name: "Hicaz",
    character: "Dramatic, oriental",
    notes: "Augmented 2nd with Turkish koma inflections",
    scale: [0, 1, 4, 5, 7, 8, 10],
    offsets: [0, 14, 0, 0, 0, -2, 16, 0, 0, 0, 0, 0]
  },
  {
    id: "huseyni",
    name: "Hüseyni",
    character: "Minor-like, yearning",
    notes: "Microtonal 2nd & 6th, ascending/descending differ",
    scale: [0, 2, 3, 5, 7, 9, 10],
    offsets: [0, 0, -42, -6, 0, 0, 2, -4, 0, -40, -4, 0]
  },
  { id: "ussak", name: "Uşşak", character: "Melancholic, folk", notes: "Related to Bayati, Turkish folk essential", scale: [0, 2, 3, 5, 7, 9, 10], offsets: [0, 0, -42, -6, 0, 0, 0, 6, 0, 0, -4, 0] },
  { id: "nihavend", name: "Nihavend", character: "Turkish minor", notes: "Harmonic minor with Turkish temperament", scale: [0, 2, 3, 5, 7, 8, 11], offsets: [0, 0, 4, -6, 0, 0, -2, -8, 0, 0, 0, -12] },
  {
    id: "segah",
    name: "Segâh",
    character: "Mystical, meditative",
    notes: "Starts on segah (E↓), Sufi music staple",
    scale: [0, 2, 3, 5, 7, 9, 10],
    offsets: [0, 0, 14, -6, 0, -2, 12, -8, 0, 0, -4, 0]
  },
  {
    id: "saba_turkish",
    name: "Saba",
    character: "Deep sorrow, lamenting",
    notes: "Diminished intervals, Turkish classical essential",
    scale: [0, 2, 3, 4, 5, 7, 10],
    offsets: [0, 0, -42, -6, -70, 0, -2, -8, 0, 0, -4, 0]
  },
  {
    id: "mahur",
    name: "Mahur",
    character: "Joyful, celebratory",
    notes: "Close to Western major, used in festive pieces",
    scale: [0, 2, 4, 5, 7, 9, 11],
    offsets: [0, 0, 4, 8, 0, -2, 6, 10, 0, 0, 6, 10]
  },
  {
    id: "buselik",
    name: "Buselik",
    character: "Natural minor feel",
    notes: "Aeolian-like with Turkish koma adjustments",
    scale: [0, 2, 3, 5, 7, 8, 10],
    offsets: [0, 0, 4, -6, 0, 0, -2, -8, 0, 0, -4, 0]
  },
  {
    id: "karcigar",
    name: "Karcığar",
    character: "Complex, chromatic",
    notes: "Mixed tetrachords, sophisticated modulations",
    scale: [0, 2, 3, 5, 7, 8, 11],
    offsets: [0, 0, 4, -6, 0, 0, -2, -8, 0, 0, 0, -12]
  }
];

/**
 * Maps preset-based temperaments to their presets array and UI title.
 * Only temperaments in PRESET_TEMPERAMENTS have entries here.
 */
export const TEMPERAMENT_CONFIG = {
  [TEMPERAMENTS.ARABIC]: { presets: null, title: "Arabic Maqam" }, // filled below (forward ref)
  [TEMPERAMENTS.TURKISH]: { presets: null, title: "Turkish Makam" },
  [TEMPERAMENTS.INDIAN]: { presets: null, title: "Indian Thaat" }
};

export const INDIAN_THAATS = [
  {
    id: "bilaval",
    name: "Bilaval",
    character: "Serene, morning",
    notes: "Equivalent to Western major/Ionian mode",
    scale: [0, 2, 4, 5, 7, 9, 11],
    offsets: [0, 0, 4, -14, 0, -2, -16, 0, 0, -16, 0, -12]
  },
  {
    id: "kalyan",
    name: "Kalyan / Yaman",
    character: "Devotional, evening",
    notes: "Sharp 4th (Tivra Ma), Lydian mode equivalent",
    scale: [0, 2, 4, 6, 7, 9, 11],
    offsets: [0, 0, 4, -14, 0, 0, -10, 0, 0, -16, 0, -12]
  },
  {
    id: "khamaj",
    name: "Khamaj",
    character: "Romantic, light classical",
    notes: "Flat 7th (Komal Ni), Mixolydian equivalent",
    scale: [0, 2, 4, 5, 7, 9, 10],
    offsets: [0, 0, 4, -14, 0, -2, -16, 0, 0, -16, -4, 0]
  },
  { id: "kafi", name: "Kafi", character: "Pathos, longing", notes: "Flat 3rd & 7th, Dorian mode equivalent", scale: [0, 2, 3, 5, 7, 9, 10], offsets: [0, 0, 4, -6, 0, 0, -2, -16, 0, 0, -16, -4] },
  { id: "asavari", name: "Asavari", character: "Pensive, sad", notes: "Flat 3rd, 6th, 7th - Natural minor/Aeolian", scale: [0, 2, 3, 5, 7, 8, 10], offsets: [0, 0, 4, -6, 0, 0, -2, -8, 0, 0, -4, 0] },
  {
    id: "bhairavi",
    name: "Bhairavi",
    character: "Devotional, dawn",
    notes: "All flat (Komal) except Sa & Pa - Phrygian",
    scale: [0, 1, 3, 5, 7, 8, 10],
    offsets: [0, 12, 0, -6, 0, 0, -2, -8, 0, 0, -4, 0]
  },
  {
    id: "bhairav",
    name: "Bhairav",
    character: "Serious, austere",
    notes: "Flat 2nd & 6th, double harmonic major",
    scale: [0, 1, 4, 5, 7, 8, 11],
    offsets: [0, 12, 0, -14, 0, -2, 0, -8, 0, 0, 0, -12]
  },
  {
    id: "poorvi",
    name: "Poorvi",
    character: "Mysterious, dusk",
    notes: "Flat 2nd & 6th, sharp 4th - twilight raga",
    scale: [0, 1, 4, 6, 7, 8, 11],
    offsets: [0, 12, 0, -14, 0, 0, -10, -8, 0, 0, 0, -12]
  },
  { id: "marwa", name: "Marwa", character: "Restless, sunset", notes: "Flat 2nd, sharp 4th, no 5th emphasis", scale: [0, 1, 4, 6, 7, 9, 11], offsets: [0, 12, 0, -14, 0, 0, -10, 0, 0, -16, 0, -12] },
  { id: "todi", name: "Todi", character: "Intense, profound", notes: "Flat 2nd, 3rd, 6th + sharp 4th - complex", scale: [0, 1, 3, 6, 7, 8, 11], offsets: [0, 12, 0, -6, 0, 0, -10, -8, 0, 0, 0, -12] }
];
// Wire preset arrays into the config map (avoids forward-reference issues)
TEMPERAMENT_CONFIG[TEMPERAMENTS.ARABIC].presets = ARABIC_MAQAMAT;
TEMPERAMENT_CONFIG[TEMPERAMENTS.TURKISH].presets = TURKISH_MAKAMLAR;
TEMPERAMENT_CONFIG[TEMPERAMENTS.INDIAN].presets = INDIAN_THAATS;
