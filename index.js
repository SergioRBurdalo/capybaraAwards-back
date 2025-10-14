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

// Modelo de usuario (para login)
const userSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() },
  username: String,
  pass: String,
  lastLogin: String,
});
const User = mongoose.model("User", userSchema);

// Modelo de categoría propuesta desde el front
const categoriaNuevaSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() },
  titulo: { type: String, required: true },
  descripcion: { type: String, required: true },
  usuario: { type: String, required: true },
  fechaCreacion: { type: String, default: () => new Date().toISOString() },
});
const CategoriaNueva = mongoose.model("Categorias", categoriaNuevaSchema);

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
    res
      .status(500)
      .json({ message: "Error al actualizar el login", error: err });
  }
});

// 🔹 Guardar nueva categoría desde el formulario del front
app.post("/guardarCategoria", async (req, res) => {
  const { titulo, descripcion, usuario } = req.body;

  try {
    if (!titulo || !descripcion || !usuario) {
      return res
        .status(400)
        .json({ message: "Faltan campos obligatorios: titulo, descripcion o usuario" });
    }

    const nuevaCategoria = new CategoriaNueva({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      usuario: usuario.trim(),
    });

    await nuevaCategoria.save();
    res.json({ message: "Categoría guardada correctamente", categoria: nuevaCategoria });
  } catch (err) {
    console.error("Error guardando la categoría:", err);
    res.status(500).json({ message: "Error al guardar la categoría", error: err });
  }
});

// 🔹 Obtener todas las categorías propuestas
app.get("/getCategorias", async (req, res) => {
  try {
    const categorias = await CategoriaNueva.find().sort({ fechaCreacion: -1 });
    res.json(categorias);
  } catch (err) {
    console.error("Error obteniendo categorías:", err);
    res.status(500).json({ message: "Error al obtener las categorías", error: err });
  }
});

// Exportar la app (para despliegue en Vercel)
module.exports = app;
