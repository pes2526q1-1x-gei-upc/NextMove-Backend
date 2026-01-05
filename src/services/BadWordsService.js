import { 
  RegExpMatcher, 
  DataSet,
  englishDataset, 
  englishRecommendedTransformers,
  pattern
} from 'obscenity';
import { SPANISH_OFFENSIVE_WORDS } from './badWords/spanish.js';
import { CATALAN_OFFENSIVE_WORDS } from './badWords/catalan.js';

/**
 * Crea un dataset de palabras ofensivas para un idioma específico
 * @param {string[]} words - Array de palabras ofensivas
 * @returns {DataSet} Dataset construido con las palabras
 */
function createOffensiveWordsDataset(words) {
  const dataset = new DataSet();
  
  words.forEach(word => {
    dataset.addPhrase(phrase => 
      phrase
        .setMetadata({ originalWord: word })
        .addPattern(pattern`${word}`)
    );
  });
  
  return dataset.build();
}

/**
 * Dataset de palabras ofensivas en español
 */
const spanishDataset = createOffensiveWordsDataset(SPANISH_OFFENSIVE_WORDS);

/**
 * Dataset de palabras ofensivas en catalán
 */
const catalanDataset = createOffensiveWordsDataset(CATALAN_OFFENSIVE_WORDS);

/**
 * Matcher que combina los datasets de inglés, español y catalán
 * con los transformadores recomendados para inglés
 */
const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...spanishDataset,
  ...catalanDataset,
  ...englishRecommendedTransformers,
});

/**
 * Verifica si un texto contiene palabras ofensivas en inglés, español o catalán
 * @param {string} text - Texto a verificar
 * @returns {boolean} true si el texto contiene palabras ofensivas, false en caso contrario
 */
export function IsOffensive(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  return matcher.hasMatch(text);
}