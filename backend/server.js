require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const Product = require('./models/Product');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de Multer para recibir archivos (Excel e Imágenes)
const storage = multer.memoryStorage();
const upload = multer({ storage });
const uploadMemory = multer({ storage: multer.memoryStorage() });
// Conexión a MongoDB



mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB conectado exitosamente'))
  .catch((err) => console.error('Error al conectar a MongoDB:', err));

// 1. IMPORTAR PRODUCTOS DESDE EXCEL A MONGODB
// ENDPOINT PARA IMPORTAR EXCEL (inv.xlsx)
app.post('/api/products/import-excel', uploadMemory.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Función auxiliar para convertir valores de moneda "$7.50" a números (7.50)
    const parseCurrency = (val) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^0-9.-]+/g, '');
        return parseFloat(cleaned) || 0;
      }
      return 0;
    };

    const operations = rawData.map(item => ({
      updateOne: {
        filter: { codigo: String(item['Código'] || item.codigo || '').trim() },
        update: {
          $set: {
            codigo: String(item['Código'] || item.codigo || '').trim(),
            nombre: String(item['Producto'] || item.nombre || '').trim(),
            precioCosto: parseCurrency(item['P. Costo']),
            precioVenta: parseCurrency(item['P. Venta']),
            precioMayoreo: parseCurrency(item['P. Mayoreo']),
            existencia: parseCurrency(item['Existencia']),
            departamento: item['Departamento'] || 'Sin Departamento',
          }
        },
        upsert: true
      }
    }));

    await Product.bulkWrite(operations);
    res.json({ message: 'Productos de inv.xlsx importados con éxito', total: operations.length });
  } catch (error) {
    console.error('Error al importar:', error);
    res.status(500).json({ error: 'Error al procesar el archivo Excel', details: error.message });
  }
});

// 2. OBTENER Y BUSCAR PRODUCTOS

app.get('/api/products', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { nombre: { $regex: search, $options: 'i' } },
          { codigo: { $regex: search, $options: 'i' } },
          { departamento: { $regex: search, $options: 'i' } }
        ]
      };
    }
    const products = await Product.find(query).limit(100);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar productos' });
  }
});

// 3. ACTUALIZAR IMAGEN / DATOS DE UN PRODUCTO
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { imagen, precio, stock, nombre } = req.body;

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { imagen, precio, stock, nombre },
      { new: true }
    );

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

app.listen(5000, () => console.log('Servidor corriendo en puerto 5000'));