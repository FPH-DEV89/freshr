/**
 * Freshr — Mapping intelligent d'emojis alimentaires 🍎
 *
 * Ce module associe automatiquement un emoji à un nom d'aliment
 * en effectuant une recherche par mot-clé dans le nom (insensible à la casse et aux accents).
 * Utilisé dans la liste de courses et le dashboard stock pour un rendu visuel premium.
 */

interface FoodEmojiRule {
  keywords: string[];
  emoji: string;
}

const FOOD_EMOJI_RULES: FoodEmojiRule[] = [
  // 🥬 Légumes
  { keywords: ["carotte", "carottes"], emoji: "🥕" },
  { keywords: ["tomate", "tomates"], emoji: "🍅" },
  { keywords: ["pomme de terre", "pommes de terre", "patate", "patates"], emoji: "🥔" },
  { keywords: ["oignon", "oignons"], emoji: "🧅" },
  { keywords: ["ail"], emoji: "🧄" },
  { keywords: ["poivron", "poivrons"], emoji: "🫑" },
  { keywords: ["brocoli", "brocolis"], emoji: "🥦" },
  { keywords: ["salade", "laitue"], emoji: "🥬" },
  { keywords: ["concombre", "concombres"], emoji: "🥒" },
  { keywords: ["courgette", "courgettes"], emoji: "🥒" },
  { keywords: ["aubergine", "aubergines"], emoji: "🍆" },
  { keywords: ["maïs", "mais"], emoji: "🌽" },
  { keywords: ["champignon", "champignons"], emoji: "🍄" },
  { keywords: ["haricot", "haricots"], emoji: "🫘" },
  { keywords: ["pois", "petit pois"], emoji: "🫛" },
  { keywords: ["avocat", "avocats"], emoji: "🥑" },
  { keywords: ["chou", "chou-fleur", "choux"], emoji: "🥬" },
  { keywords: ["épinard", "épinards", "epinard", "epinards"], emoji: "🥬" },
  { keywords: ["radis"], emoji: "🥕" },
  { keywords: ["céleri", "celeri"], emoji: "🥬" },
  { keywords: ["betterave", "betteraves"], emoji: "🥕" },
  { keywords: ["poireau", "poireaux"], emoji: "🥬" },
  { keywords: ["artichaut", "artichauts"], emoji: "🥬" },
  { keywords: ["navet", "navets"], emoji: "🥔" },
  { keywords: ["piment", "piments"], emoji: "🌶️" },
  { keywords: ["olive", "olives"], emoji: "🫒" },

  // 🍎 Fruits
  { keywords: ["pomme", "pommes"], emoji: "🍎" },
  { keywords: ["banane", "bananes"], emoji: "🍌" },
  { keywords: ["orange", "oranges"], emoji: "🍊" },
  { keywords: ["citron", "citrons"], emoji: "🍋" },
  { keywords: ["fraise", "fraises"], emoji: "🍓" },
  { keywords: ["framboise", "framboises"], emoji: "🫐" },
  { keywords: ["myrtille", "myrtilles"], emoji: "🫐" },
  { keywords: ["raisin", "raisins"], emoji: "🍇" },
  { keywords: ["pêche", "pêches", "peche", "peches"], emoji: "🍑" },
  { keywords: ["cerise", "cerises"], emoji: "🍒" },
  { keywords: ["melon", "melons"], emoji: "🍈" },
  { keywords: ["pastèque", "pasteque"], emoji: "🍉" },
  { keywords: ["ananas"], emoji: "🍍" },
  { keywords: ["mangue", "mangues"], emoji: "🥭" },
  { keywords: ["kiwi", "kiwis"], emoji: "🥝" },
  { keywords: ["poire", "poires"], emoji: "🍐" },
  { keywords: ["abricot", "abricots"], emoji: "🍑" },
  { keywords: ["clémentine", "clementine", "mandarine", "mandarines"], emoji: "🍊" },
  { keywords: ["noix de coco", "coco"], emoji: "🥥" },
  { keywords: ["compote"], emoji: "🍎" },

  // 🥩 Viandes & Poissons
  { keywords: ["poulet", "volaille", "dinde"], emoji: "🍗" },
  { keywords: ["boeuf", "bœuf", "steak"], emoji: "🥩" },
  { keywords: ["porc", "jambon", "lardons", "bacon", "lardon"], emoji: "🥓" },
  { keywords: ["saucisse", "saucisses", "merguez", "chipolata", "knacki", "knaki"], emoji: "🌭" },
  { keywords: ["poisson", "saumon", "cabillaud", "thon", "sardine", "truite", "colin"], emoji: "🐟" },
  { keywords: ["crevette", "crevettes", "gambas"], emoji: "🦐" },
  { keywords: ["agneau"], emoji: "🍖" },
  { keywords: ["viande hachée", "haché", "hachee"], emoji: "🥩" },
  { keywords: ["côtelette", "cotelette", "escalope"], emoji: "🍖" },

  // 🧀 Produits laitiers
  { keywords: ["lait"], emoji: "🥛" },
  { keywords: ["fromage", "comté", "gruyère", "emmental", "camembert", "brie", "roquefort", "mozzarella", "parmesan", "comte", "gruyere", "chevre", "chèvre"], emoji: "🧀" },
  { keywords: ["yaourt", "yogourt", "yoghourt", "danone"], emoji: "🥛" },
  { keywords: ["beurre"], emoji: "🧈" },
  { keywords: ["crème", "creme", "crème fraîche", "creme fraiche"], emoji: "🥛" },
  { keywords: ["oeuf", "oeufs", "œuf", "œufs"], emoji: "🥚" },

  // 🍞 Boulangerie & Céréales
  { keywords: ["pain", "baguette", "brioche"], emoji: "🍞" },
  { keywords: ["croissant", "croissants"], emoji: "🥐" },
  { keywords: ["pâtes", "pates", "spaghetti", "tagliatelle", "penne", "fusilli", "macaroni", "nouille", "nouilles"], emoji: "🍝" },
  { keywords: ["riz"], emoji: "🍚" },
  { keywords: ["céréale", "céréales", "cereale", "cereales", "muesli", "granola"], emoji: "🥣" },
  { keywords: ["farine"], emoji: "🌾" },
  { keywords: ["pizza"], emoji: "🍕" },
  { keywords: ["crêpe", "crepe", "galette"], emoji: "🥞" },
  { keywords: ["gâteau", "gateau", "cake", "muffin", "cupcake"], emoji: "🍰" },
  { keywords: ["biscuit", "biscuits", "cookie", "cookies"], emoji: "🍪" },
  { keywords: ["tartine", "toast"], emoji: "🍞" },

  // 🥫 Conserves & Épicerie
  { keywords: ["conserve", "conserves", "boîte", "boite"], emoji: "🥫" },
  { keywords: ["sauce", "ketchup", "mayonnaise", "moutarde", "vinaigrette"], emoji: "🧴" },
  { keywords: ["huile"], emoji: "🫒" },
  { keywords: ["vinaigre"], emoji: "🍾" },
  { keywords: ["sucre"], emoji: "🍬" },
  { keywords: ["sel"], emoji: "🧂" },
  { keywords: ["poivre", "épice", "epice", "épices", "epices", "curry", "cumin", "paprika"], emoji: "🌶️" },
  { keywords: ["confiture", "confitures", "miel"], emoji: "🍯" },
  { keywords: ["chocolat", "nutella", "cacao"], emoji: "🍫" },
  { keywords: ["café", "cafe", "nescafé", "nescafe"], emoji: "☕" },
  { keywords: ["thé", "the", "tisane", "infusion"], emoji: "🍵" },
  { keywords: ["soupe", "bouillon", "potage", "velouté", "veloute"], emoji: "🍲" },

  // 🥤 Boissons
  { keywords: ["jus", "jus d'orange", "jus de pomme"], emoji: "🧃" },
  { keywords: ["eau", "evian", "vittel", "volvic", "cristalline"], emoji: "💧" },
  { keywords: ["soda", "coca", "sprite", "fanta", "orangina", "schweppes"], emoji: "🥤" },
  { keywords: ["bière", "biere"], emoji: "🍺" },
  { keywords: ["vin", "rouge", "rosé", "rose"], emoji: "🍷" },
  { keywords: ["champagne", "prosecco", "mousseux"], emoji: "🍾" },
  { keywords: ["limonade"], emoji: "🍋" },
  { keywords: ["sirop"], emoji: "🧴" },
  { keywords: ["smoothie"], emoji: "🥤" },

  // 🧊 Surgelés
  { keywords: ["surgelé", "surgelés", "surgele", "surgeles", "glace", "sorbet"], emoji: "🧊" },
  { keywords: ["frites"], emoji: "🍟" },

  // 🌮 Plats Préparés / Divers
  { keywords: ["sandwich", "wrap", "panini", "burger", "hamburger"], emoji: "🍔" },
  { keywords: ["taco", "tacos", "burrito", "fajita"], emoji: "🌮" },
  { keywords: ["sushi", "sushis", "maki"], emoji: "🍣" },
  { keywords: ["ravioli", "raviolis", "tortellini"], emoji: "🥟" },
  { keywords: ["quiche", "tarte"], emoji: "🥧" },
  { keywords: ["croque", "croque-monsieur"], emoji: "🥪" },

  // 🥜 Noix & Graines
  { keywords: ["noix", "amande", "amandes", "noisette", "noisettes", "cacahuète", "cacahuete", "pistache"], emoji: "🥜" },

  // 🧻 Non-alimentaire (utile pour la liste de courses)
  { keywords: ["papier toilette", "pq", "sopalin", "essuie-tout"], emoji: "🧻" },
  { keywords: ["lessive", "détergent", "detergent"], emoji: "🧴" },
  { keywords: ["savon", "gel douche", "shampoing", "shampooing"], emoji: "🧼" },
  { keywords: ["éponge", "eponge"], emoji: "🧽" },
  { keywords: ["sac poubelle", "sac-poubelle"], emoji: "🗑️" },
];

/**
 * Normalise un texte en retirant les accents et en le passant en minuscules.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Retourne l'emoji correspondant à un nom d'aliment.
 * La recherche est insensible à la casse et aux accents.
 * Retourne un emoji par défaut (🛒) si aucun match n'est trouvé.
 */
export function getFoodEmoji(foodName: string): string {
  const normalizedName = normalize(foodName);

  for (const rule of FOOD_EMOJI_RULES) {
    for (const keyword of rule.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (normalizedName.includes(normalizedKeyword)) {
        return rule.emoji;
      }
    }
  }

  return "🛒"; // Fallback générique
}
