const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
/// Conectar a MongoDB usando la variable de entorno
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('Conexión exitosa a MongoDB');
})
.catch((err) => {
  console.error('Error conectando a MongoDB', err);
});


// Definir el esquema y el modelo del usuario
const userSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() }, 
  username: String,
  pass: String,
  lastLogin: String,
});

const User = mongoose.model('User', userSchema);

const categoriaSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() }, 
  idCategoria: Number,
  nombre: String,
  opciones: [
    {
      id: Number,
      texto: String,
      votos: [
        {
          usuario: String,
          fecha: String
        }
      ],
      imagen: String
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


// Exportar la app para que funcione en Vercel
module.exports = app;
