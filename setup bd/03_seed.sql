-- ============================================================
-- El Fogón Criollo – 03_seed.sql
-- Ejecutar TERCERO: datos de prueba
-- ============================================================

-- Categorías
INSERT INTO categoria (nombre, descripcion) VALUES
  ('Pollos',       'Pollos a la brasa y leña'),
  ('Bebidas',      'Bebidas frías y calientes'),
  ('Guarniciones', 'Ensaladas, papas y extras'),
  ('Postres',      'Postres y dulces')
ON CONFLICT DO NOTHING;

-- Productos (usa los IDs que genere el serial de categorías)
INSERT INTO producto (nombre, precio, disponible, imagen_url, id_categoria)
SELECT v.nombre, v.precio::numeric, true, v.imagen_url, c.id_categoria FROM (VALUES
  -- ── Pollos ────────────────────────────────────────────────
  ('Pollo entero a la brasa',  '45.00', 'Pollos',
   'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=640&q=80'),
  ('Medio pollo a la brasa',   '24.00', 'Pollos',
   'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=640&q=80'),
  ('Cuarto de pollo',          '13.00', 'Pollos',
   'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=640&q=80'),
  ('Pollo a la leña especial', '28.00', 'Pollos',
   'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=640&q=80'),
  ('Alitas BBQ (8 piezas)',    '18.00', 'Pollos',
   'https://images.unsplash.com/photo-1527477396000-e3d10cbe0078?auto=format&fit=crop&w=640&q=80'),
  ('Pechuga a la brasa',       '15.00', 'Pollos',
   'https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=640&q=80'),
  ('Combo familiar',           '58.00', 'Pollos',
   'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=640&q=80'),

  -- ── Bebidas ───────────────────────────────────────────────
  ('Inca Kola 500ml',          '4.00', 'Bebidas',
   'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=640&q=80'),
  ('Coca Cola 500ml',          '4.00', 'Bebidas',
   'https://images.unsplash.com/photo-1561758033-7e924f619af0?auto=format&fit=crop&w=640&q=80'),
  ('Chicha morada 1L',         '8.00', 'Bebidas',
   'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=640&q=80'),
  ('Agua mineral 625ml',       '3.00', 'Bebidas',
   'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=640&q=80'),
  ('Maracuyá natural 500ml',   '6.00', 'Bebidas',
   'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=640&q=80'),
  ('Chicha de jora 1L',        '7.00', 'Bebidas',
   'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=640&q=80'),
  ('Café caliente',            '4.00', 'Bebidas',
   'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=640&q=80'),
  ('Gaseosa 1.5L',             '7.00', 'Bebidas',
   'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?auto=format&fit=crop&w=640&q=80'),

  -- ── Guarniciones ──────────────────────────────────────────
  ('Papas fritas grandes',     '8.00', 'Guarniciones',
   'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=640&q=80'),
  ('Ensalada criolla',         '5.00', 'Guarniciones',
   'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=640&q=80'),
  ('Yucas fritas',             '7.00', 'Guarniciones',
   'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=640&q=80'),
  ('Papas a la huancaína',     '9.00', 'Guarniciones',
   'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=640&q=80'),
  ('Tacu tacu',                '10.00', 'Guarniciones',
   'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=640&q=80'),
  ('Choclo con queso',         '6.00', 'Guarniciones',
   'https://images.unsplash.com/photo-1550828520-4cb496926fc9?auto=format&fit=crop&w=640&q=80'),
  ('Arroz chaufa personal',    '12.00', 'Guarniciones',
   'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=640&q=80'),

  -- ── Postres ───────────────────────────────────────────────
  ('Suspiro limeño',           '8.00', 'Postres',
   'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=640&q=80'),
  ('Mazamorra morada',         '6.00', 'Postres',
   'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=640&q=80'),
  ('Arroz con leche',          '6.00', 'Postres',
   'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=640&q=80'),
  ('Picarones (2 unid.)',      '7.00', 'Postres',
   'https://images.unsplash.com/photo-1541420937988-702d78cb9dc4?auto=format&fit=crop&w=640&q=80'),
  ('Flan de caramelo',         '8.00', 'Postres',
   'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?auto=format&fit=crop&w=640&q=80')
) AS v(nombre, precio, cat_nombre, imagen_url)
JOIN categoria c ON c.nombre = v.cat_nombre
ON CONFLICT DO NOTHING;

-- Mesas (3 pisos)
INSERT INTO mesa (numero, piso, capacidad) VALUES
  (1,1,4),(2,1,4),(3,1,6),(4,1,4),(5,1,2),
  (6,2,4),(7,2,4),(8,2,6),(9,2,8),(10,2,4),
  (11,3,4),(12,3,6),(13,3,8),(14,3,4),(15,3,4)
ON CONFLICT (numero) DO NOTHING;

-- Meseros
INSERT INTO mesero (nombre, turno) VALUES
  ('Leslie Barreto',  'Mañana'),
  ('Leopoldo Brito',  'Tarde'),
  ('Brisa Capcha',    'Mañana'),
  ('Nelsy Ramos',     'Tarde'),
  ('Joseph Silvano',  'Noche'),
  ('Admin Sistema',   'Completo')
ON CONFLICT DO NOTHING;

-- Usuarios (contraseñas: mesero123, cocina123, admin123)
INSERT INTO usuario (username, password, rol, id_mesero)
SELECT v.username, v.password, v.rol::rol_usuario, m.id_mesero
FROM (VALUES
  ('mesero1', '$2a$10$ftKxi8WsDDlxFriEORpP.O50HqFJSRuIZC8JyCm7u0cfe3bbb6M12', 'MESERO',   'Leslie Barreto'),
  ('mesero2', '$2a$10$ftKxi8WsDDlxFriEORpP.O50HqFJSRuIZC8JyCm7u0cfe3bbb6M12', 'MESERO',   'Leopoldo Brito'),
  ('cocina1', '$2a$10$ced2SO2V824e88KuDTQ16OXVhsruXpWFgzgo2LGVilwYPuXTZmWtq', 'COCINERO', 'Brisa Capcha'),
  ('admin',   '$2a$10$fSe9KZKkArxXu.QGqY29/e6mjNhWSd6LxDEspc9a67kPhZ9vGehwC', 'ADMIN',    'Admin Sistema')
) AS v(username, password, rol, mesero_nombre)
JOIN mesero m ON m.nombre = v.mesero_nombre
ON CONFLICT (username) DO NOTHING;
