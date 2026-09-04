const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  codigo: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  precioCosto: { type: Number, default: 0 },
  precioVenta: { type: Number, default: 0 },
  precioMayoreo: { type: Number, default: 0 },
  existencia: { type: Number, default: 0 },
  departamento: { type: String, default: 'Sin Departamento' },
  imagen: { type: String, default: '' }, // URL de Cloudinary
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);