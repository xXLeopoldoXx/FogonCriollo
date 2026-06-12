
-- ── 1. Corregir imágenes de productos existentes ─────────────
UPDATE producto SET imagen_url = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=640&q=80'
WHERE nombre ILIKE '%leña especial%';

UPDATE producto SET imagen_url = 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=640&q=80'
WHERE nombre ILIKE '%inca kola%';

UPDATE producto SET imagen_url = 'https://images.unsplash.com/photo-1561758033-7e924f619af0?auto=format&fit=crop&w=640&q=80'
WHERE nombre ILIKE '%coca cola%';

UPDATE producto SET imagen_url = 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=640&q=80'
WHERE nombre ILIKE '%chicha morada%';

UPDATE producto SET imagen_url = 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=640&q=80'
WHERE nombre ILIKE '%agua mineral%';

UPDATE producto SET imagen_url = 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=640&q=80'
WHERE nombre ILIKE '%yuca%';

UPDATE producto SET imagen_url = 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=640&q=80'
WHERE nombre ILIKE '%mazamorra%';

-- ── 2. Insertar productos nuevos ─────────────────────────────
INSERT INTO producto (nombre, precio, disponible, imagen_url, id_categoria)
SELECT v.nombre, v.precio::numeric, true, v.imagen_url, c.id_categoria FROM (VALUES
  -- Pollos nuevos
  ('Alitas BBQ (8 piezas)',  '18.00', 'Pollos',
   'https://images.unsplash.com/photo-1527477396000-e3d10cbe0078?auto=format&fit=crop&w=640&q=80'),
  ('Pechuga a la brasa',     '15.00', 'Pollos',
   'https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=640&q=80'),
  ('Combo familiar',         '58.00', 'Pollos',
   'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=640&q=80'),

  -- Bebidas nuevas
  ('Maracuyá natural 500ml', '6.00', 'Bebidas',
   'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=640&q=80'),
  ('Chicha de jora 1L',      '7.00', 'Bebidas',
   'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=640&q=80'),
  ('Café caliente',          '4.00', 'Bebidas',
   'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=640&q=80'),
  ('Gaseosa 1.5L',           '7.00', 'Bebidas',
   'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?auto=format&fit=crop&w=640&q=80'),

  -- Guarniciones nuevas
  ('Papas a la huancaína',   '9.00',  'Guarniciones',
   'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=640&q=80'),
  ('Tacu tacu',              '10.00', 'Guarniciones',
   'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=640&q=80'),
  ('Choclo con queso',       '6.00',  'Guarniciones',
   'https://images.unsplash.com/photo-1550828520-4cb496926fc9?auto=format&fit=crop&w=640&q=80'),
  ('Arroz chaufa personal',  '12.00', 'Guarniciones',
   'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=640&q=80'),

  -- Postres nuevos
  ('Arroz con leche',        '6.00', 'Postres',
   'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=640&q=80'),
  ('Picarones (2 unid.)',    '7.00', 'Postres',
   'https://images.unsplash.com/photo-1541420937988-702d78cb9dc4?auto=format&fit=crop&w=640&q=80'),
  ('Flan de caramelo',       '8.00', 'Postres',
   'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?auto=format&fit=crop&w=640&q=80')
) AS v(nombre, precio, cat_nombre, imagen_url)
JOIN categoria c ON c.nombre = v.cat_nombre
ON CONFLICT DO NOTHING;
