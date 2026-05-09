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
INSERT INTO producto (nombre, precio, disponible, id_categoria)
SELECT nombre, precio, true, c.id_categoria FROM (VALUES
  ('Pollo entero a la brasa',  45.00, 'Pollos'),
  ('Medio pollo a la brasa',   24.00, 'Pollos'),
  ('Cuarto de pollo',          13.00, 'Pollos'),
  ('Pollo a la leña especial', 28.00, 'Pollos'),
  ('Inca Kola 500ml',           4.00, 'Bebidas'),
  ('Coca Cola 500ml',           4.00, 'Bebidas'),
  ('Chicha morada 1L',          8.00, 'Bebidas'),
  ('Agua mineral',              3.00, 'Bebidas'),
  ('Papas fritas grandes',      8.00, 'Guarniciones'),
  ('Ensalada criolla',          5.00, 'Guarniciones'),
  ('Yucas fritas',              7.00, 'Guarniciones'),
  ('Suspiro limeño',            8.00, 'Postres'),
  ('Mazamorra morada',          6.00, 'Postres')
) AS v(nombre, precio, cat_nombre)
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
