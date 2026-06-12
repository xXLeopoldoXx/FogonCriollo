// ============================================================
//  El Fogón Criollo — ProductosAdmin.jsx
//  CRUD de productos con preview, validación y exportación
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Eye, EyeOff, Trash2, FileSpreadsheet, Image, Save, X } from 'lucide-react';
import styles from './ProductosAdmin.module.css';

const EMPTY = {
  id_producto:  null,
  nombre:       '',
  precio:       '',
  id_categoria: '',
  imagen_url:   '',
  disponible:   true,
};

function ProductoForm({ form, setForm, categorias, onSubmit, onCancel, guardando }) {
  const editing = !!form.id_producto;

  return (
    <motion.div
      className={styles.formCard}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      layout
    >
      <div className={styles.formHeader}>
        <h3 className={styles.formTitle}>
          {editing ? 'Editar producto' : 'Nuevo producto'}
        </h3>
        {editing && (
          <button className={styles.cancelBtn} onClick={onCancel} title="Cancelar edición">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Preview de imagen */}
      <div className={styles.imgPreview}>
        {form.imagen_url ? (
          <img src={form.imagen_url} alt="Preview" className={styles.imgPreviewImg} />
        ) : (
          <div className={styles.imgPreviewEmpty}>
            <Image size={28} />
            <span>Sin imagen</span>
          </div>
        )}
      </div>

      {/* Campos */}
      <div className={styles.fields}>
        <label className={styles.fieldWrap}>
          <span className={styles.fieldLabel}>Nombre *</span>
          <input
            className={styles.input}
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Ej: Pollo entero a la brasa"
            maxLength={150}
            required
          />
        </label>

        <div className={styles.fieldRow}>
          <label className={styles.fieldWrap}>
            <span className={styles.fieldLabel}>Precio (S/) *</span>
            <input
              className={styles.input}
              type="number"
              min="0"
              step="0.50"
              value={form.precio}
              onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
              placeholder="0.00"
              required
            />
          </label>
          <label className={styles.fieldWrap}>
            <span className={styles.fieldLabel}>Categoría *</span>
            <select
              className={styles.input}
              value={form.id_categoria}
              onChange={e => setForm(f => ({ ...f, id_categoria: e.target.value }))}
              required
            >
              <option value="">Seleccionar...</option>
              {categorias.map(c => (
                <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
              ))}
            </select>
          </label>
        </div>

        <label className={styles.fieldWrap}>
          <span className={styles.fieldLabel}>URL de imagen</span>
          <input
            className={styles.input}
            value={form.imagen_url}
            onChange={e => setForm(f => ({ ...f, imagen_url: e.target.value }))}
            placeholder="https://images.unsplash.com/..."
            type="url"
          />
        </label>

        <label className={styles.checkWrap}>
          <input
            type="checkbox"
            checked={form.disponible}
            onChange={e => setForm(f => ({ ...f, disponible: e.target.checked }))}
            className={styles.checkbox}
          />
          <span>Disponible en carta</span>
        </label>
      </div>

      <motion.button
        className={styles.submitBtn}
        onClick={onSubmit}
        disabled={guardando || !form.nombre || !form.precio || !form.id_categoria}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
      >
        {guardando ? (
          <motion.div
            className={styles.spinner}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
          />
        ) : (
          <Save size={15} />
        )}
        {editing ? 'Guardar cambios' : 'Crear producto'}
      </motion.button>
    </motion.div>
  );
}

function ProductoRow({ producto, onEdit, onToggle, onDelete }) {
  return (
    <motion.article
      className={styles.productoRow}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
    >
      <div className={styles.rowImg}>
        <img src={producto.imagen_url} alt={producto.nombre} loading="lazy" />
        {!producto.disponible && <div className={styles.rowImgOverlay}>Oculto</div>}
      </div>

      <div className={styles.rowInfo}>
        <strong className={styles.rowNombre}>{producto.nombre}</strong>
        <span className={styles.rowMeta}>
          {producto.categoria} ·{' '}
          <span className={styles.rowPrecio}>S/ {Number(producto.precio).toFixed(2)}</span>
        </span>
        <span className={`${styles.rowDisp} ${producto.disponible ? styles.dispOn : styles.dispOff}`}>
          {producto.disponible ? '● Disponible' : '○ Oculto'}
        </span>
      </div>

      <div className={styles.rowActions}>
        <button
          className={styles.actionBtn}
          onClick={() => onEdit(producto)}
          title="Editar"
        >
          <Edit2 size={14} />
        </button>
        <button
          className={`${styles.actionBtn} ${producto.disponible ? styles.actionWarn : styles.actionOk}`}
          onClick={() => onToggle(producto)}
          title={producto.disponible ? 'Ocultar de carta' : 'Activar en carta'}
        >
          {producto.disponible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button
          className={`${styles.actionBtn} ${styles.actionDanger}`}
          onClick={() => onDelete(producto.id_producto)}
          title="Eliminar"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.article>
  );
}

export function ProductosAdmin({ productos, categorias, onSave, onDelete, guardando, onExportar }) {
  const [form,     setForm]     = useState(EMPTY);
  const [search,   setSearch]   = useState('');
  const [filtCat,  setFiltCat]  = useState('');
  const [filtDisp, setFiltDisp] = useState('all');

  const editing = !!form.id_producto;

  function handleEdit(p) {
    setForm({
      id_producto:  p.id_producto,
      nombre:       p.nombre ?? '',
      precio:       p.precio ?? '',
      id_categoria: p.id_categoria ?? '',
      imagen_url:   p.imagen_url ?? '',
      disponible:   p.disponible !== false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSubmit() {
    if (!form.nombre.trim() || !form.precio || !form.id_categoria) return;
    onSave({
      ...form,
      precio:       Number(form.precio),
      id_categoria: Number(form.id_categoria),
      imagen_url:   form.imagen_url || null,
    });
    setForm(EMPTY);
  }

  function handleToggle(p) {
    onSave({ ...p, disponible: !p.disponible });
  }

  // Filtrado
  const filtered = productos.filter(p => {
    const matchSearch = !search || p.nombre.toLowerCase().includes(search.toLowerCase());
    const matchCat    = !filtCat || String(p.id_categoria) === filtCat;
    const matchDisp   = filtDisp === 'all'
      ? true
      : filtDisp === 'on'  ? p.disponible
      : !p.disponible;
    return matchSearch && matchCat && matchDisp;
  });

  return (
    <div className={styles.root}>
      {/* Formulario lateral */}
      <aside className={styles.formCol}>
        <ProductoForm
          form={form}
          setForm={setForm}
          categorias={categorias}
          onSubmit={handleSubmit}
          onCancel={() => setForm(EMPTY)}
          guardando={guardando}
        />
      </aside>

      {/* Lista de productos */}
      <section className={styles.listCol}>
        {/* Barra de filtros */}
        <div className={styles.filterBar}>
          <input
            className={styles.searchInput}
            placeholder="Buscar producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={filtCat}
            onChange={e => setFiltCat(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map(c => (
              <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            value={filtDisp}
            onChange={e => setFiltDisp(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="on">Disponibles</option>
            <option value="off">Ocultos</option>
          </select>
          <motion.button
            className={styles.exportBtn}
            onClick={onExportar}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            title="Exportar catálogo a Excel"
          >
            <FileSpreadsheet size={14} />
            Exportar
          </motion.button>
        </div>

        <p className={styles.listCount}>
          {filtered.length} de {productos.length} productos
        </p>

        <div className={styles.list}>
          <AnimatePresence mode="popLayout">
            {filtered.map(p => (
              <ProductoRow
                key={p.id_producto}
                producto={p}
                onEdit={handleEdit}
                onToggle={handleToggle}
                onDelete={onDelete}
              />
            ))}
            {filtered.length === 0 && (
              <motion.div
                className={styles.emptyList}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span>🍽️</span>
                <p>No hay productos con estos filtros.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
