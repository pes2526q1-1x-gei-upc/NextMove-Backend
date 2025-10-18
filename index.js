const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

app.get('/mensaje', (req, res) => {
  res.json({ mensaje: '¡Hola desde el backend Express!' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
