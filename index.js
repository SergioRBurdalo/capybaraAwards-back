const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');  // Para generar UUID v4
const app = express();
require('dotenv').config();  // Cargar variables de entorno

console.log('MONGODB_URI:', process.env.MONGODB_URI);  // Verifica si la URI se está cargando correctamente

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Conexión exitosa a MongoDB');
})
.catch((err) => {
  console.error('Error conectando a MongoDB', err);
});
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

// Definir el esquema y el modelo del usuario
const userSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() }, 
  username: String,
  pass: String,
  lastLogin: String,
});

const User = mongoose.model('User', userSchema);

// Definir el esquema y el modelo de la categoría con candidatos
const categoriaSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() }, 
  idCategoria: Number,
  nombre: String,
  candidatos: [
    {
      nombreCandidato: String,
      fechaVotacion: String,  // Almacenado como string en lugar de ISODate
      votadoPor: [String]  // Array de strings que contiene los nombres de los votantes
    }
  ]
});

const Categoria = mongoose.model('Categoria', categoriaSchema);

// Ruta para actualizar el lastLogin
app.post('/updateLastLogin', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username: username.trim() });

    if (user) {
      if (user.pass === password) {
        // Convertir la fecha a un string ISO antes de guardarla
        user.lastLogin = new Date().toISOString();
        await user.save();  // Guardar el usuario actualizado
        res.json({ message: 'Login actualizado correctamente' });
      } else {
        res.status(401).json({ message: 'Usuario o contraseña incorrecta' });
      }
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (err) {
    console.error('Error guardando usuario:', err);
    res.status(500).json({ message: 'Error al actualizar el login', error: err });
  }
});

app.get('/getCategorias', async (req, res) => {
  try {
    const categorias = await Categoria.find({}, '_id titulo descripcion');  // Seleccionar solo _id, nombre y descripcion
    res.json(categorias);  // Devuelve las categorías en formato JSON
  } catch (err) {
    console.error('Error obteniendo categorías:', err);
    res.status(500).json({ message: 'Error al obtener las categorías', error: err });
  }
});


// Exportar la app para que funcione en Vercel
module.exports = app;
