const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

app.get('/mensaje', (req, res) => {
  res.json({ mensaje: '¡Hola soy la instancia de EC2!' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});

