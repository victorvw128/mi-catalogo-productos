import React, { useState, useEffect } from 'react';
import { Search, Upload, Camera, Loader, X, Info } from 'lucide-react';

import React, { useState, useEffect } from 'react';

export default function GestionProductos() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const API_URL = 'https://mi-catalogo-productos.onrender.com';

  const fetchProducts = async (search = '') => {
    setLoading(true);
    try {
      const cleanSearch = search.trim();
      // 1. Agregado /api antes de /products
      const endpoint = cleanSearch
        ? `${API_URL}/api/products?search=${encodeURIComponent(cleanSearch)}`
        : `${API_URL}/api/products`;

      const res = await fetch(endpoint);
      const data = await res.json();
      
      console.log('Respuesta completa del backend:', data);

      let listaProductos = [];
      if (Array.isArray(data)) {
        listaProductos = data;
      } else if (Array.isArray(data.products)) {
        listaProductos = data.products;
      } else if (Array.isArray(data.data)) {
        listaProductos = data.data;
      }

      setProducts(listaProductos);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleExcelImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      // 2. Agregado /api en la importación de Excel
      const res = await fetch(`${API_URL}/api/products/import-excel`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en la importación');

      alert(data.message || 'Importación exitosa');
      fetchProducts(searchTerm);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleImageUpload = async (productId, e) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('imagen', file);

    try {
      setUploadingId(productId);
      // 3. Agregado /api en la subida de imágenes
      const res = await fetch(`${API_URL}/api/products/${productId}/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const updated = await res.json();
        fetchProducts(searchTerm);
        if (selectedProduct && selectedProduct._id === productId) {
          setSelectedProduct(updated.product || { ...selectedProduct, imagen: updated.imagen });
        }
      } else {
        alert('Error al subir la imagen');
      }
    } catch (err) {
      alert('Error de conexión al subir la foto');
    } finally {
      setUploadingId(null);
    }
  };

  const formatPrice = (val) => {
    const num = Number(val);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Gestión de Catálogo</h1>

      <div style={styles.topBar}>
        <label style={styles.uploadBtn}>
          <Upload size={18} style={{ marginRight: '8px' }} />
          Cargar archivo inv.xlsx
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleExcelImport}
            hidden
          />
        </label>
      </div>

      <div style={styles.searchBox}>
        <Search size={20} style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Buscar por código, producto o departamento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {loading ? (
        <p style={{ textAlign: 'center' }}>Cargando catálogo...</p>
      ) : (
        <div style={styles.grid}>
          {Array.isArray(products) && products.length > 0 ? (
            products.map((prod) => (
              <div
                key={prod?._id || Math.random()}
                style={styles.card}
                onClick={() => setSelectedProduct(prod)}
              >
                <div style={styles.imageContainer}>
                  {prod?.imagen ? (
                    <img src={prod.imagen} alt={prod?.nombre || 'Producto'} style={styles.productImg} />
                  ) : (
                    <div style={styles.noImg}>Sin foto</div>
                  )}
                </div>

                <div style={styles.cardContent}>
                  <span style={styles.code}>{prod?.codigo || 'S/C'}</span>
                  <h3 style={styles.prodTitle}>{prod?.nombre || 'Sin nombre'}</h3>
                  <p style={styles.department}>{prod?.departamento || 'General'}</p>

                  <div style={styles.priceRow}>
                    <div>
                      <span style={styles.priceLabel}>P. Venta: </span>
                      <span style={styles.price}>${formatPrice(prod?.precioVenta)}</span>
                    </div>
                    <div>
                      <span style={styles.priceLabel}>Mayoreo: </span>
                      <span style={styles.subPrice}>${formatPrice(prod?.precioMayoreo)}</span>
                    </div>
                  </div>

                  <p style={styles.stock}>Existencia: <strong>{prod?.existencia ?? 0}</strong></p>

                  <label style={styles.cameraBtn} onClick={(e) => e.stopPropagation()}>
                    {uploadingId === prod?._id ? (
                      <Loader size={16} className="animate-spin" style={{ marginRight: '6px' }} />
                    ) : (
                      <Camera size={16} style={{ marginRight: '6px' }} />
                    )}
                    {uploadingId === prod?._id ? 'Subiendo...' : 'Subir / Tomar Foto'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(prod?._id, e)}
                      hidden
                    />
                  </label>
                </div>
              </div>
            ))
          ) : (
            <p style={{ textAlign: 'center', gridColumn: '1 / -1', color: '#6b7280' }}>
              No se encontraron productos.
            </p>
          )}
        </div>
      )}

      {selectedProduct && (
        <div style={styles.modalOverlay} onClick={() => setSelectedProduct(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setSelectedProduct(null)}>
              <X size={20} />
            </button>

            <h2 style={styles.modalHeader}>
              <Info size={22} style={{ marginRight: '8px', color: '#2563eb' }} />
              Detalles del Producto
            </h2>

            <div style={styles.modalImageContainer}>
              {selectedProduct.imagen ? (
                <img src={selectedProduct.imagen} alt={selectedProduct.nombre} style={styles.modalImg} />
              ) : (
                <div style={styles.noImg}>Sin foto asignada</div>
              )}
            </div>

            <div style={styles.detailsGrid}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Código Bar/Ref:</span>
                <span style={styles.detailValue}>{selectedProduct.codigo || 'N/A'}</span>
              </div>

              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Nombre del Producto:</span>
                <span style={styles.detailValue}>{selectedProduct.nombre || 'N/A'}</span>
              </div>

              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Departamento:</span>
                <span style={styles.detailValue}>{selectedProduct.departamento || 'Sin Categoría'}</span>
              </div>

              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Existencia (Stock):</span>
                <span style={{ ...styles.detailValue, color: (selectedProduct.existencia || 0) > 0 ? '#059669' : '#dc2626' }}>
                  {selectedProduct.existencia ?? 0} unidades
                </span>
              </div>

              <div style={{ ...styles.detailItem, backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
                <span style={{ ...styles.detailLabel, color: '#991b1b' }}>Precio de Compra:</span>
                <span style={{ ...styles.detailValue, color: '#dc2626', fontSize: '18px' }}>
                  ${formatPrice(selectedProduct.precioCosto || selectedProduct.costo)}
                </span>
              </div>

              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Precio de Venta:</span>
                <span style={{ ...styles.detailValue, color: '#2563eb', fontSize: '18px' }}>
                  ${formatPrice(selectedProduct.precioVenta)}
                </span>
              </div>

              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Precio Mayoreo:</span>
                <span style={{ ...styles.detailValue, color: '#059669', fontSize: '18px' }}>
                  ${formatPrice(selectedProduct.precioMayoreo)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: '1000px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' },
  title: { textAlign: 'center', color: '#1f2937', marginBottom: '20px' },
  topBar: { display: 'flex', justifyContent: 'center', marginBottom: '20px' },
  uploadBtn: { display: 'inline-flex', alignItems: 'center', padding: '10px 20px', backgroundColor: '#10b981', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  searchBox: { position: 'relative', marginBottom: '24px' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' },
  searchInput: { width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '16px', boxSizing: 'border-box' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' },
  card: { border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer' },
  imageContainer: { height: '160px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  productImg: { width: '100%', height: '100%', objectFit: 'cover' },
  noImg: { color: '#9ca3af', fontSize: '14px' },
  cardContent: { padding: '14px' },
  code: { fontSize: '11px', color: '#6b7280', fontWeight: 'bold' },
  prodTitle: { fontSize: '15px', margin: '4px 0', color: '#111827' },
  department: { fontSize: '11px', color: '#9ca3af', marginBottom: '8px' },
  priceRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  priceLabel: { fontSize: '11px', color: '#6b7280' },
  price: { fontSize: '14px', fontWeight: 'bold', color: '#2563eb' },
  subPrice: { fontSize: '13px', fontWeight: 'bold', color: '#059669' },
  stock: { fontSize: '12px', color: '#374151', marginBottom: '12px' },
  cameraBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' },
  modalContent: { backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '24px', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' },
  closeBtn: { position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' },
  modalHeader: { fontSize: '18px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', marginBottom: '16px' },
  modalImageContainer: { height: '200px', width: '100%', backgroundColor: '#f3f4f6', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px' },
  modalImg: { width: '100%', height: '100%', objectFit: 'contain' },
  detailsGrid: { display: 'flex', flexDirection: 'column', gap: '10px' },
  detailItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #f3f4f6' },
  detailLabel: { fontSize: '13px', color: '#4b5563', fontWeight: '500' },
  detailValue: { fontSize: '14px', fontWeight: 'bold', color: '#111827' }
};