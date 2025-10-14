// src/graphql/schema.js
import { makeExecutableSchema } from '@graphql-tools/schema';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolvers } from './resolvers/resolvers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const typeDefsArray = loadFilesSync(join(__dirname, 'typeDefs/**/*.graphql'));
const typeDefs = mergeTypeDefs(typeDefsArray);

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

export default schema;