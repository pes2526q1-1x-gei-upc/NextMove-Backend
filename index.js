import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { createHandler } from 'graphql-http/lib/use/express';
import express from 'express';
import { ruruHTML } from 'ruru/server';

const app = express();
const PORT = process.env.PORT || 3000;

/*
    Try to go to /api/gql/playground to see the GraphQL playground
    and type the following query:
    query {
      hello
    }
*/

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      hello: { 
        type: GraphQLString,
        resolve: () => 'Hello world!'
      },
    },
  }),
});

app.all(
  '/graphql',
  createHandler({
    schema: schema,
  }),
);

app.use(express.json());

app.get('/api/gql/playground', (_req, res) => {
  res.type('html');
  res.end(ruruHTML({ endpoint: '/graphql' }));
});

app.get('/', (req, res) => {
  res.send('NextMove Backend funcionando');
});


app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
