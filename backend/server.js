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

    // Helper para limpiar precios/monedas
    const parseCurrency = (val) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^0-9.-]+/g, '');
        return parseFloat(cleaned) || 0;
      }
      return 0;
    };

    // Filtrar filas válidas que contengan un código no vacío
    const validRows = rawData.filter(item => {
      const code = item['Código'] || item['Codigo'] || item['codigo'] || item['CODIGO'];
      return code !== undefined && String(code).trim() !== '';
    });

    if (validRows.length === 0) {
      return res.status(400).json({ 
        error: 'No se encontraron filas válidas con un "Código" en el archivo Excel.' 
      });
    }

    const operations = validRows.map(item => {
      const codigoVal = String(item['Código'] || item['Codigo'] || item['codigo'] || item['CODIGO']).trim();
      const nombreVal = String(item['Producto'] || item['producto'] || item['nombre'] || item['Nombre'] || '').trim();

      return {
        updateOne: {
          filter: { codigo: codigoVal },
          update: {
            $set: {
              codigo: codigoVal,
              nombre: nombreVal,
              precioCosto: parseCurrency(item['P. Costo'] || item['precioCosto'] || item['P.Costo']),
              precioVenta: parseCurrency(item['P. Venta'] || item['precioVenta'] || item['P.Venta']),
              precioMayoreo: parseCurrency(item['P. Mayoreo'] || item['precioMayoreo'] || item['P.Mayoreo']),
              existencia: parseCurrency(item['Existencia'] || item['existencia'] || item['Cantidad']),
              departamento: String(item['Departamento'] || item['departamento'] || 'Sin Departamento').trim(),
            }
          },
          upsert: true
        }
      };
    });

    await Product.bulkWrite(operations);
    res.json({ message: 'Productos importados con éxito', total: operations.length });

  } catch (error) {
    console.error('Error al importar Excel:', error);
    res.status(500).json({ 
      error: 'Error al procesar el archivo Excel', 
      details: error.message 
    });
  }
});

// 2. OBTENER Y BUSCAR PRODUCTOS

// Obtener todos los productos (con soporte para búsqueda)
app.get('/api/products', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    // Filtro flexible por código, nombre o departamento
    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query = {
        $or: [
          { codigo: regex },
          { nombre: regex },
          { departamento: regex }
        ]
      };
    }

    const products = await Product.find(query).sort({ nombre: 1 });
    res.json(products);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al consultar la base de datos', details: error.message });
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