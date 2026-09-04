require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const Product = require('./models/Product');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Configuración única de Multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

/// Conexión a MongoDB especificando la base de datos 'test'
mongoose.connect(process.env.MONGO_URI, {
  dbName: 'test'
})
  .then(() => console.log('MongoDB conectado exitosamente a la base de datos: test'))
  .catch((err) => console.error('Error al conectar a MongoDB:', err));
// 1. IMPORTAR PRODUCTOS DESDE EXCEL A MONGODB
app.post('/api/products/import-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const parseCurrency = (val) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const cleaned = val.replace(/[^0-9.-]+/g, '');
        return parseFloat(cleaned) || 0;
      }
      return 0;
    };

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
app.get('/api/products', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search && search.trim() !== '') {
      const cleanSearch = search.trim();
      query = {
        $or: [
          { nombre: { $regex: cleanSearch, $options: 'i' } },
          { codigo: { $regex: cleanSearch, $options: 'i' } },
          { departamento: { $regex: cleanSearch, $options: 'i' } }
        ]
      };
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error('Error al obtener productos:', err);
    res.status(500).json({ error: 'Error al consultar productos' });
  }
});

// 3. SUBIR IMAGEN DE PRODUCTO
app.post('/api/products/:id/upload-image', upload.single('imagen'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });

    const mimeType = req.file.mimetype;
    const base64Image = `data:${mimeType};base64,${req.file.buffer.toString('base64')}`;

    const product = await Product.findByIdAndUpdate(
      id,
      { imagen: base64Image },
      { new: true }
    );

    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    res.json({ message: 'Imagen actualizada exitosamente', product });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    res.status(500).json({ error: 'Error al guardar la imagen' });
  }
});

// 4. ACTUALIZAR DATOS DE UN PRODUCTO
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));