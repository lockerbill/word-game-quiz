// Alpha Bucks Category Dataset
// 120+ categories with difficulty ratings

export interface Category {
  id: number;
  name: string;
  difficulty: 1 | 2 | 3; // 1=easy, 2=medium, 3=hard
  emoji: string;
}

export const CATEGORIES: Category[] = [
  // === ANIMALS & NATURE ===
  { id: 1,   name: 'Animal',               difficulty: 1, emoji: '🐾' },
  { id: 2,   name: 'Sea Animal',           difficulty: 2, emoji: '🐠' },
  { id: 3,   name: 'Bird',                 difficulty: 2, emoji: '🐦' },
  { id: 4,   name: 'Insect',               difficulty: 2, emoji: '🐛' },
  { id: 5,   name: 'Fish',                 difficulty: 2, emoji: '🐟' },
  { id: 6,   name: 'Reptile',              difficulty: 3, emoji: '🦎' },
  { id: 7,   name: 'Dog Breed',            difficulty: 2, emoji: '🐕' },
  { id: 8,   name: 'Cat Breed',            difficulty: 3, emoji: '🐈' },
  { id: 9,   name: 'Flower',               difficulty: 2, emoji: '🌸' },
  { id: 10,  name: 'Tree',                 difficulty: 2, emoji: '🌳' },

  // === GEOGRAPHY ===
  { id: 11,  name: 'Country',              difficulty: 1, emoji: '🌍' },
  { id: 12,  name: 'City',                 difficulty: 1, emoji: '🏙️' },
  { id: 13,  name: 'Capital City',         difficulty: 2, emoji: '🏛️' },
  { id: 14,  name: 'US State',             difficulty: 2, emoji: '🇺🇸' },
  { id: 15,  name: 'River',                difficulty: 2, emoji: '🏞️' },
  { id: 16,  name: 'Mountain',             difficulty: 3, emoji: '⛰️' },
  { id: 17,  name: 'Island',               difficulty: 2, emoji: '🏝️' },
  { id: 18,  name: 'Ocean or Sea',         difficulty: 2, emoji: '🌊' },
  { id: 19,  name: 'Desert',               difficulty: 3, emoji: '🏜️' },
  { id: 20,  name: 'Lake',                 difficulty: 3, emoji: '🏞️' },

  // === FOOD & DRINK ===
  { id: 21,  name: 'Fruit',                difficulty: 1, emoji: '🍎' },
  { id: 22,  name: 'Vegetable',            difficulty: 1, emoji: '🥦' },
  { id: 23,  name: 'Food',                 difficulty: 1, emoji: '🍔' },
  { id: 24,  name: 'Dessert',              difficulty: 1, emoji: '🍰' },
  { id: 25,  name: 'Drink',                difficulty: 1, emoji: '🥤' },
  { id: 26,  name: 'Spice or Herb',        difficulty: 2, emoji: '🌶️' },
  { id: 27,  name: 'Cheese',               difficulty: 3, emoji: '🧀' },
  { id: 28,  name: 'Pasta Type',           difficulty: 3, emoji: '🍝' },
  { id: 29,  name: 'Cocktail',             difficulty: 2, emoji: '🍸' },
  { id: 30,  name: 'Candy or Chocolate',   difficulty: 2, emoji: '🍬' },

  // === ENTERTAINMENT ===
  { id: 31,  name: 'Movie',                difficulty: 1, emoji: '🎬' },
  { id: 32,  name: 'TV Show',              difficulty: 1, emoji: '📺' },
  { id: 33,  name: 'Song',                 difficulty: 2, emoji: '🎵' },
  { id: 34,  name: 'Book',                 difficulty: 2, emoji: '📚' },
  { id: 35,  name: 'Video Game',           difficulty: 1, emoji: '🎮' },
  { id: 36,  name: 'Board Game',           difficulty: 2, emoji: '🎲' },
  { id: 37,  name: 'Musical Instrument',   difficulty: 2, emoji: '🎸' },
  { id: 38,  name: 'Dance Style',          difficulty: 3, emoji: '💃' },
  { id: 39,  name: 'Music Genre',          difficulty: 2, emoji: '🎶' },
  { id: 40,  name: 'Anime',                difficulty: 2, emoji: '⚡' },

  // === PEOPLE ===
  { id: 41,  name: 'Singer or Band',       difficulty: 1, emoji: '🎤' },
  { id: 42,  name: 'Actor or Actress',     difficulty: 1, emoji: '🎭' },
  { id: 43,  name: 'Historical Figure',    difficulty: 2, emoji: '📜' },
  { id: 44,  name: 'Scientist',            difficulty: 2, emoji: '🔬' },
  { id: 45,  name: 'Author',               difficulty: 2, emoji: '✍️' },
  { id: 46,  name: 'Athlete',              difficulty: 2, emoji: '🏅' },
  { id: 47,  name: 'Cartoon Character',    difficulty: 1, emoji: '🧸' },
  { id: 48,  name: 'Superhero',            difficulty: 1, emoji: '🦸' },
  { id: 49,  name: 'Disney Character',     difficulty: 1, emoji: '✨' },
  { id: 50,  name: 'Fictional Character',  difficulty: 2, emoji: '📖' },

  // === SPORTS ===
  { id: 51,  name: 'Sport',                difficulty: 1, emoji: '⚽' },
  { id: 52,  name: 'Olympic Sport',        difficulty: 2, emoji: '🥇' },
  { id: 53,  name: 'Football (Soccer) Team', difficulty: 2, emoji: '⚽' },
  { id: 54,  name: 'NBA Team',             difficulty: 2, emoji: '🏀' },
  { id: 55,  name: 'Sports Equipment',     difficulty: 2, emoji: '🏸' },

  // === BRANDS & BUSINESS ===
  { id: 56,  name: 'Brand',                difficulty: 1, emoji: '🏷️' },
  { id: 57,  name: 'Car Brand',            difficulty: 1, emoji: '🚗' },
  { id: 58,  name: 'Fashion Brand',        difficulty: 2, emoji: '👗' },
  { id: 59,  name: 'Tech Company',         difficulty: 2, emoji: '💻' },
  { id: 60,  name: 'Fast Food Chain',      difficulty: 1, emoji: '🍟' },
  { id: 61,  name: 'Airline',              difficulty: 2, emoji: '✈️' },
  { id: 62,  name: 'Social Media Platform', difficulty: 1, emoji: '📱' },

  // === PROFESSIONS & WORK ===
  { id: 63,  name: 'Occupation',           difficulty: 1, emoji: '💼' },
  { id: 64,  name: 'Medical Profession',   difficulty: 2, emoji: '🏥' },
  { id: 65,  name: 'School Subject',       difficulty: 1, emoji: '📐' },
  { id: 66,  name: 'University',           difficulty: 2, emoji: '🎓' },

  // === TECHNOLOGY ===
  { id: 67,  name: 'Programming Language', difficulty: 2, emoji: '👨‍💻' },
  { id: 68,  name: 'App or Website',       difficulty: 1, emoji: '🌐' },
  { id: 69,  name: 'Operating System',     difficulty: 3, emoji: '🖥️' },
  { id: 70,  name: 'Computer Hardware',    difficulty: 2, emoji: '🔧' },

  // === HOUSEHOLD ===
  { id: 71,  name: 'Household Object',     difficulty: 1, emoji: '🏠' },
  { id: 72,  name: 'Furniture',            difficulty: 1, emoji: '🛋️' },
  { id: 73,  name: 'Tool',                 difficulty: 1, emoji: '🔨' },
  { id: 74,  name: 'Kitchen Utensil',      difficulty: 2, emoji: '🍴' },
  { id: 75,  name: 'Clothing Item',        difficulty: 1, emoji: '👕' },
  { id: 76,  name: 'Fabric or Material',   difficulty: 2, emoji: '🧵' },

  // === SCIENCE ===
  { id: 77,  name: 'Chemical Element',     difficulty: 2, emoji: '⚗️' },
  { id: 78,  name: 'Planet or Space Object', difficulty: 2, emoji: '🪐' },
  { id: 79,  name: 'Body Part',            difficulty: 1, emoji: '🫀' },
  { id: 80,  name: 'Disease or Condition', difficulty: 2, emoji: '🏥' },
  { id: 81,  name: 'Gemstone or Mineral',  difficulty: 3, emoji: '💎' },

  // === MYTHOLOGY & FANTASY ===
  { id: 82,  name: 'Greek God',            difficulty: 2, emoji: '⚡' },
  { id: 83,  name: 'Mythological Creature', difficulty: 2, emoji: '🐉' },
  { id: 84,  name: 'Zodiac Sign',          difficulty: 2, emoji: '♈' },

  // === VEHICLES & TRANSPORT ===
  { id: 85,  name: 'Vehicle Type',         difficulty: 1, emoji: '🚗' },
  { id: 86,  name: 'Motorcycle Brand',     difficulty: 3, emoji: '🏍️' },
  { id: 87,  name: 'Ship or Boat Type',    difficulty: 3, emoji: '🚢' },

  // === COLORS & MISC ===
  { id: 88,  name: 'Color',                difficulty: 1, emoji: '🎨' },
  { id: 89,  name: 'Language',             difficulty: 1, emoji: '🗣️' },
  { id: 90,  name: 'Currency',             difficulty: 2, emoji: '💰' },
  { id: 91,  name: 'Holiday or Festival',  difficulty: 2, emoji: '🎉' },
  { id: 92,  name: 'Emotion or Feeling',   difficulty: 1, emoji: '😊' },
  { id: 93,  name: 'Weather Phenomenon',   difficulty: 2, emoji: '🌦️' },

  // === MORE NICHE ===
  { id: 94,  name: 'Harry Potter Character', difficulty: 2, emoji: '⚡' },
  { id: 95,  name: 'Pokemon',              difficulty: 2, emoji: '⚡' },
  { id: 96,  name: 'Marvel Character',     difficulty: 1, emoji: '🦸' },
  { id: 97,  name: 'DC Character',         difficulty: 2, emoji: '🦇' },
  { id: 98,  name: 'Star Wars Character',  difficulty: 2, emoji: '⭐' },
  { id: 99,  name: 'Horror Movie',         difficulty: 2, emoji: '👻' },
  { id: 100, name: 'Comedy Movie',         difficulty: 2, emoji: '😂' },

  // === ADDITIONAL CATEGORIES ===
  { id: 101, name: 'Boy Name',             difficulty: 1, emoji: '👦' },
  { id: 102, name: 'Girl Name',            difficulty: 1, emoji: '👧' },
  { id: 103, name: 'Baby Name',            difficulty: 1, emoji: '👶' },
  { id: 104, name: 'Verb',                 difficulty: 1, emoji: '📝' },
  { id: 105, name: 'Adjective',            difficulty: 1, emoji: '📝' },
  { id: 106, name: 'Noun',                 difficulty: 1, emoji: '📝' },
  { id: 107, name: 'Three-Letter Word',    difficulty: 2, emoji: '🔤' },
  { id: 108, name: 'Four-Letter Word',     difficulty: 2, emoji: '🔤' },
  { id: 109, name: 'Something Round',      difficulty: 2, emoji: '🔵' },
  { id: 110, name: 'Something You Find in a Kitchen', difficulty: 1, emoji: '🍳' },
  { id: 111, name: 'Something You Find at the Beach', difficulty: 1, emoji: '🏖️' },
  { id: 112, name: 'Something Cold',       difficulty: 1, emoji: '❄️' },
  { id: 113, name: 'Something Hot',        difficulty: 1, emoji: '🔥' },
  { id: 114, name: 'Something Soft',       difficulty: 1, emoji: '🧸' },
  { id: 115, name: 'Something You Wear',   difficulty: 1, emoji: '👔' },
  { id: 116, name: 'Type of Dance',        difficulty: 2, emoji: '💃' },
  { id: 117, name: 'Type of Music',        difficulty: 1, emoji: '🎵' },
  { id: 118, name: 'Tourist Attraction',   difficulty: 2, emoji: '🗽' },
  { id: 119, name: 'Toy',                  difficulty: 1, emoji: '🧸' },
  { id: 120, name: 'Candy',                difficulty: 1, emoji: '🍭' },
];

// Get category by ID
export function getCategoryById(id: number): Category | undefined {
  return CATEGORIES.find(c => c.id === id);
}

// Select N random categories
export function selectRandomCategories(count: number = 10, maxDifficulty: number = 3): Category[] {
  const eligible = CATEGORIES.filter(c => c.difficulty <= maxDifficulty);
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
