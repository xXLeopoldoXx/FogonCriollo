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
SELECT v.nombre, v.precio, true, imagen_url, c.id_categoria FROM (VALUES
  ('Pollo entero a la brasa',  45.00, 'Pollos', 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=640&q=80'),
  ('Medio pollo a la brasa',   24.00, 'Pollos', 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=640&q=80'),
  ('Cuarto de pollo',          13.00, 'Pollos', 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=640&q=80'),
  ('Pollo a la leña especial', 28.00, 'Pollos', 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=640&q=80'),
  ('Inca Kola 500ml',           4.00, 'Bebidas', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=640&q=80'),
  ('Coca Cola 500ml',           4.00, 'Bebidas', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=640&q=80'),
  ('Chicha morada 1L',          8.00, 'Bebidas', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=640&q=80'),
  ('Agua mineral',              3.00, 'Bebidas', 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=640&q=80'),
  ('Papas fritas grandes',      8.00, 'Guarniciones', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=640&q=80'),
  ('Ensalada criolla',          5.00, 'Guarniciones', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=640&q=80'),
  ('Yucas fritas',              7.00, 'Guarniciones', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=640&q=80'),
  ('Suspiro limeño',            8.00, 'Postres', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=640&q=80'),
  ('Mazamorra morada',          6.00, 'Postres', 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=640&q=80')
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
