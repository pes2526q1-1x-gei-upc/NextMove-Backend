import { 
  RegExpMatcher, 
  DataSet,
  englishDataset, 
  englishRecommendedTransformers,
  pattern
} from 'obscenity';

const spanishDataset = new DataSet()
  .addPhrase(phrase => phrase.setMetadata({ originalWord: 'puta' }).addPattern(pattern`puta`))
  .addPhrase(phrase => phrase.setMetadata({ originalWord: 'mierda' }).addPattern(pattern`mierda`))
  .addPhrase(phrase => phrase.setMetadata({ originalWord: 'maricon' }).addPattern(pattern`maricon`))
  .addPhrase(phrase => phrase.setMetadata({ originalWord: 'guarra' }).addPattern(pattern`guarra`))
  .addPhrase(phrase => phrase.setMetadata({ originalWord: 'negrata' }).addPattern(pattern`negrata`))
  .addPhrase(phrase => phrase.setMetadata({ originalWord: 'gilipollas' }).addPattern(pattern`gilipollas`))
  .addPhrase(phrase => phrase.setMetadata({ originalWord: 'imbecil' }).addPattern(pattern`imbecil`))
  .build();

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...spanishDataset,
  ...englishRecommendedTransformers,
});

export function IsOffensive(text) {
  console.log("Comprobando si el texto es ofensivo: " + text);
  console.log(matcher.hasMatch(text));
  return matcher.hasMatch(text);
}