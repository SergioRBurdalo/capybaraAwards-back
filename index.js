const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const app = express();
require("dotenv").config();

console.log("MONGODB_URI:", process.env.MONGODB_URI);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Conexión exitosa a MongoDB"))
  .catch((err) => console.error("❌ Error conectando a MongoDB", err));

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));

/* -------------------------  MODELOS ------------------------- */

// 🔹 Modelo de usuario (para login)
const userSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() },
  username: String,
  pass: String,
  lastLogin: String,
});
const User = mongoose.model("User", userSchema);

/* -------------------------  MODELO: Votaciones ------------------------- */

const votacionCategoriaSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.Mixed },

    tituloCategoria: String,
    descripcion: String,
    multichoise: Boolean,
    Orden: Number,
    hidden: Boolean,

    candidatos: [
      {
        idCandidato: String,
        nombreCandidato: String,
        idImagen: String,
        descripcion: String,
        usuarioPropuesto: String,

        // Voto single
        totalVotos: { type: Number, default: 0 },
        votadoPor: { type: [String], default: [] },

        // 🔥 VOTO MULTI (3–2–1 puntos)
        votosMulti: {
          type: [
            {
              usuario: String,
              puntos: Number,
            },
          ],
          default: [],
        },
      },
    ],
  },
  { collection: "votaciones" }
);

const VotacionCategoria = mongoose.model(
  "VotacionCategoria",
  votacionCategoriaSchema
);


// 🔹 Modelo de categoría propuesta desde el front
const categoriaNuevaSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() },
  titulo: { type: String, required: true },
  descripcion: { type: String, required: true },
  usuario: { type: String, required: true },
  fechaCreacion: { type: String, default: () => new Date().toISOString() },
});
const CategoriaNueva = mongoose.model("Categorias", categoriaNuevaSchema);

const candidatoSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => uuidv4() }, // UUID real
    nombreCandidato: { type: String, required: true },
    imagen: { type: String, required: true },
    username: { type: String, required: true },
    descripcion: { type: String, default: "" },
    activo: { type: Boolean, default: true },
    fechaCreacion: { type: String, default: () => new Date().toISOString() },
  },
  { collection: "candidatos" }
);

const Candidato = mongoose.model("Candidato", candidatoSchema);

// 🔹 Modelo de categoría oficial (categoríaAwards)
const categoriaOficialSchema = new mongoose.Schema(
  {
    nombre: String,
    descripcion: String,
    anio: Number,
    candidatos: [
      {
        id: { type: String, default: () => uuidv4() },
        nombreCandidato: String,
        motivo: String,
        usuario: String,
        fecha: String,
        votos: { type: Number, default: 0 },
        estado: { type: String, default: "pendiente" },
        version: { type: Number, default: 1 },
      },
    ],
  },
  { collection: "categoriaAwards" } // 👈 Nombre exacto de la colección
);

const CategoriaOficial = mongoose.model(
  "CategoriaOficial",
  categoriaOficialSchema
);

/* -------------------------  RUTAS ------------------------- */

// 🔹 Actualizar lastLogin (login del usuario)
app.post("/updateLastLogin", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username: username.trim() });

    if (user) {
      if (user.pass === password) {
        user.lastLogin = new Date().toISOString();
        await user.save();
        res.json({ message: "Login actualizado correctamente" });
      } else {
        res.status(401).json({ message: "Usuario o contraseña incorrecta" });
      }
    } else {
      res.status(404).json({ message: "Usuario no encontrado" });
    }
  } catch (err) {
    console.error("Error guardando usuario:", err);
    res.status(500).json({
      message: "Error al actualizar el login",
      error: err,
    });
  }
});

// 🔹 Guardar nueva categoría desde el formulario del front
app.post("/guardarCategoria", async (req, res) => {
  const { titulo, descripcion, usuario } = req.body;

  try {
    if (!titulo || !descripcion || !usuario) {
      return res.status(400).json({
        message:
          "Faltan campos obligatorios: titulo, descripcion o usuario",
      });
    }

    const nuevaCategoria = new CategoriaNueva({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      usuario: usuario.trim(),
    });

    await nuevaCategoria.save();
    res.json({
      message: "Categoría guardada correctamente",
      categoria: nuevaCategoria,
    });
  } catch (err) {
    console.error("Error guardando la categoría:", err);
    res.status(500).json({
      message: "Error al guardar la categoría",
      error: err,
    });
  }
});

// 🔹 Obtener todas las categorías oficiales
app.get("/getCategorias", async (req, res) => {
  try {
    const categorias = await CategoriaOficial.find().sort({ anio: -1 });
    res.json(categorias);
  } catch (err) {
    console.error("Error obteniendo categorías:", err);
    res.status(500).json({
      message: "Error al obtener las categorías",
      error: err,
    });
  }
});

// 🔹 Agregar candidato a una categoría oficial
app.post("/agregarCandidato", async (req, res) => {
  const { categoriaId, candidato, motivo, usuario } = req.body;

  try {
    if (!categoriaId || !candidato || !motivo || !usuario) {
      return res.status(400).json({
        message:
          "Faltan campos obligatorios: categoriaId, candidato, motivo o usuario",
      });
    }

    // Buscar la categoría por ID
    const categoria = await CategoriaOficial.findById(categoriaId);

    if (!categoria) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }

    // Crear nuevo candidato
    const nuevoCandidato = {
      id: uuidv4(),
      nombreCandidato: candidato.trim(),
      motivo: motivo.trim(),
      usuario: usuario.trim(),
      fecha: new Date().toISOString(),
      votos: 0,
      estado: "pendiente",
      version: 1,
    };

    // Inicializar array si no existe
    if (!Array.isArray(categoria.candidatos)) {
      categoria.candidatos = [];
    }

    // Agregar candidato al inicio
    categoria.candidatos.unshift(nuevoCandidato);

    // Guardar cambios
    await categoria.save();

    res.json({
      message: "Candidato añadido correctamente",
      categoriaId,
      candidato: nuevoCandidato,
    });
  } catch (err) {
    console.error("Error agregando candidato:", err);
    res.status(500).json({
      message: "Error al agregar el candidato",
      error: err,
    });
  }
});

app.get("/getAllCandidatos", async (req, res) => {
  try {
    const candidatos = await Candidato.find().sort({ nombreCandidato: 1 });
    res.json(candidatos);
  } catch (err) {
    console.error("Error obteniendo candidatos:", err);
    res.status(500).json({
      message: "Error al obtener los candidatos",
      error: err,
    });
  }
});

/* ----------------------------------------------------
   🗳️ VOTAR SINGLE (un solo candidato por categoría)
   Busca el candidato dentro de la categoría
---------------------------------------------------- */
app.post("/votarSingle", async (req, res) => {
  const { categoriaId, candidatoId, usuario } = req.body;

  if (!categoriaId || !candidatoId || !usuario) {
    return res.status(400).json({
      message: "Faltan datos: categoriaId, candidatoId o usuario",
    });
  }

  try {
    // 1. Buscar la categoría
    const categoria = await VotacionCategoria.findById(categoriaId);

    if (!categoria) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }

    // 2. Verificar si el usuario ya votó en esta categoría
    const yaVotado = categoria.candidatos.some((c) =>
      c.votadoPor.includes(usuario)
    );

    if (yaVotado) {
      return res.status(400).json({
        message: "Ya has votado en esta categoría",
      });
    }

    // 3. Buscar el candidato dentro de la categoría
    const candidato = categoria.candidatos.find(
      (c) => c.idCandidato === candidatoId
    );

    if (!candidato) {
      return res.status(404).json({
        message: "Candidato no encontrado dentro de la categoría",
      });
    }

    // 4. Registrar el voto
    candidato.totalVotos = (candidato.totalVotos || 0) + 1;
    candidato.votadoPor.push(usuario);

    // 5. Guardar
    await categoria.save();

    res.json({
      message: "Voto registrado correctamente",
      categoriaId,
      candidatoId,
      usuario,
    });
  } catch (err) {
    console.error("❌ Error en votarSingle:", err);
    res.status(500).json({
      message: "Error al registrar el voto",
      error: err,
    });
  }
});

// 🔹 Obtener categorías de votaciones (para el front de votación)
app.get("/votaciones", async (req, res) => {
  try {
    const categorias = await VotacionCategoria.find().sort({ Orden: 1 });
    res.json(categorias);
  } catch (err) {
    console.error("Error obteniendo votaciones:", err);
    res.status(500).json({
      message: "Error al obtener votaciones",
      error: err,
    });
  }
});

app.post("/votarMulti", async (req, res) => {
  const { categoriaId, candidatoIds, usuario } = req.body;

  if (!categoriaId || !Array.isArray(candidatoIds) || candidatoIds.length === 0 || !usuario) {
    return res.status(400).json({
      message: "Datos inválidos. Se requiere categoriaId, candidatoIds[] y usuario",
    });
  }

  try {
    // 1. Buscar categoría
    const categoria = await VotacionCategoria.findById(categoriaId);
    if (!categoria) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }

    // 2. Comprobar si el usuario ya votó
    const yaVotado = categoria.candidatos.some(c =>
      Array.isArray(c.votosMulti) &&
      c.votosMulti.some(v => v.usuario === usuario)
    );

    if (yaVotado) {
      return res.status(400).json({ message: "Ya has votado en esta categoría" });
    }

    // 3. Puntos → 3, 2, 1
    const puntosAsignados = [3, 2, 1];

    candidatoIds.forEach((id, index) => {
      const candidato = categoria.candidatos.find(c => c.idCandidato === id);

      if (!candidato) return;

      // Crear array si no existe
      if (!Array.isArray(candidato.votosMulti)) {
        candidato.votosMulti = [];
      }

      const puntos = puntosAsignados[index] || 1;

      candidato.votosMulti.push({
        usuario,
        puntos
      });

      // Sumar bien los puntos
      candidato.totalVotos = (candidato.totalVotos || 0) + puntos;
    });

    // NECESARIO para que Mongoose persista arrays profundos
    categoria.markModified("candidatos");

    await categoria.save();

    res.json({
      message: "Voto múltiple registrado correctamente",
      categoriaId,
      resultados: candidatoIds.map((id, i) => ({
        candidatoId: id,
        puntos: puntosAsignados[i] || 1
      }))
    });

  } catch (err) {
    console.error("❌ Error en votarMulti:", err);
    res.status(500).json({
      message: "Error al registrar el voto múltiple",
      error: err,
    });
  }
});


// 🔹 Obtener candidatos de una categoría oficial (opcional)
app.get("/getCandidatos/:id", async (req, res) => {
  try {
    const categoria = await CategoriaOficial.findById(req.params.id);
    if (!categoria) {
      return res.status(404).json({ message: "Categoría no encontrada" });
    }
    res.json(categoria.candidatos || []);
  } catch (err) {
    console.error("Error obteniendo candidatos:", err);
    res.status(500).json({
      message: "Error al obtener candidatos",
      error: err,
    });
  }
});

// Exportar la app (para despliegue en Vercel)
module.exports = app;
