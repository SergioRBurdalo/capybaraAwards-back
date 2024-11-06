const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');  // Para generar UUID v4
const app = express();
require('dotenv').config();  // Cargar variables de entorno

console.log('MONGODB_URI:', process.env.MONGODB_URI);  // Verifica si la URI se está cargando correctamente

mongoose.connect(process.env.MONGODB_URI, {
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
      candidato: String,  // Nombre del candidato o "Otro" si fue seleccionado.
      nombreOtro: String,  // El nombre ingresado si el candidato es "Otro".
      fechaGuardado: String,  // Fecha de votación guardada como string.
      motivo: String,
      usuario: String  // El usuario que propuso el candidato.
    }
  ]
});

const Categoria = mongoose.model('Categoria', categoriaSchema);

// Definir el esquema y el modelo de votaciones
const votacionSchema = new mongoose.Schema({
  idCategoria: String,
  tituloCategoria: String,
  descripcion: String,
  Orden: Number,
  candidatos: [
    {
      idCandidato: String,
      nombreCandidato: String,
      idImagen: String,
      descripcion: String,
      usuarioPropuesto: String,
      totalVotos: Number
    }
  ],
  votaciones: [
    {
      nombreUsuario: String,
      fechaVotacion: String,
      nombreCandidato: String
    }
  ]
});

const Votacion = mongoose.model('Votaciones', votacionSchema);

// Ruta para obtener todas las votaciones
app.get('/getVotaciones', async (req, res) => {
  try {
    // Obtiene todos los documentos
    const votaciones = await Votacion.find();

    // Ordena los documentos en el array por la propiedad `Orden`
    const votacionesOrdenadas = votaciones.sort((a, b) => a.Orden - b.Orden);

    console.log('Votaciones encontradas:', votacionesOrdenadas);
    res.json(votacionesOrdenadas);
  } catch (err) {
    console.error('Error obteniendo votaciones:', err);
    res.status(500).json({ message: 'Error al obtener las votaciones', error: err });
  }
});


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

// Ruta para guardar un voto
app.post('/guardarVoto', async (req, res) => {
  const { idCategoria, nombreCandidato, nombreUsuario } = req.body;

  try {
    // Busca la votación por ID de categoría
    const votacion = await Votacion.findOne({ idCategoria });

    if (!votacion) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Verificar si el usuario ya ha votado en esta categoría
    const yaVotado = votacion.votaciones.some(
      (voto) => voto.nombreUsuario === nombreUsuario
    );

    if (yaVotado) {
      return res.status(400).json({ message: 'El usuario ya ha votado en esta categoría' });
    }

    // Agregar el nuevo voto
    const nuevoVoto = {
      nombreUsuario,
      fechaVotacion: new Date().toISOString(),
      nombreCandidato,
    };

    votacion.votaciones.push(nuevoVoto);

    // Guardar la votación actualizada en la base de datos
    await votacion.save();

    res.json({ message: 'Voto registrado exitosamente' });
  } catch (err) {
    console.error('Error guardando el voto:', err);
    res.status(500).json({ message: 'Error al guardar el voto', error: err });
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

app.post('/guardarCandidato', async (req, res) => {
  const { categoriaId, candidato, nombreOtro, motivo, usuario } = req.body;

  console.log('Recibido en /guardarCandidato:', { categoriaId, candidato, nombreOtro, usuario });

  try {
    const candidatoAGuardar = {
      candidato,  // Nombre del candidato, o "Otro" si fue seleccionado.
      nombreOtro, // El nombre escrito si fue seleccionado "Otro".
      fechaGuardado: new Date().toISOString(),  // Fecha actual.
      motivo,
      usuario,  // Usuario que realizó la votación.
    };

    // Verifica si categoriaId es un string
    if (typeof categoriaId !== 'string' || !categoriaId.trim()) {
      return res.status(400).json({ message: 'categoriaId es inválido o vacío' });
    }

    // Buscar la categoría por ID como string
    const categoria = await Categoria.findOne({ _id: categoriaId.trim() });

    // Verificar si se encontró la categoría
    if (!categoria) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    // Agregar el candidato al array de candidatos
    categoria.candidatos.push(candidatoAGuardar);

    // Guardar la categoría actualizada
    await categoria.save();

    res.json({ categoria, message: 'Candidato guardado correctamente' });
  } catch (err) {
    console.error('Error guardando candidato:', err);
    res.status(500).json({ message: 'Error al guardar el candidato' });
  }
});

// Exportar la app para que funcione en Vercel
module.exports = app;
