-- ============================================================
-- El Fogón Criollo – Datos de prueba (SEED)
-- Ejecutar UNA VEZ después de crear el esquema
-- ============================================================

-- Categorías
INSERT INTO categoria (nombre, descripcion) VALUES
  ('Pollos',     'Pollos a la brasa y leña'),
  ('Bebidas',    'Bebidas frías y calientes'),
  ('Guarniciones','Ensaladas, papas y extras'),
  ('Postres',    'Postres y dulces')
ON CONFLICT DO NOTHING;

-- Productos
INSERT INTO producto (nombre, precio, disponible, id_categoria) VALUES
  ('Pollo entero a la brasa',   45.00, true, 1),
  ('Medio pollo a la brasa',    24.00, true, 1),
  ('Cuarto de pollo',           13.00, true, 1),
  ('Pollo a la leña especial',  28.00, true, 1),
  ('Inca Kola 500ml',            4.00, true, 2),
  ('Coca Cola 500ml',            4.00, true, 2),
  ('Chicha morada 1L',           8.00, true, 2),
  ('Agua mineral',               3.00, true, 2),
  ('Papas fritas grandes',       8.00, true, 3),
  ('Ensalada criolla',           5.00, true, 3),
  ('Yucas fritas',               7.00, true, 3),
  ('Suspiro limeño',             8.00, true, 4),
  ('Mazamorra morada',           6.00, true, 4)
ON CONFLICT DO NOTHING;

-- Mesas (3 pisos, como el local real)
INSERT INTO mesa (numero, piso, capacidad) VALUES
  (1, 1, 4), (2, 1, 4), (3, 1, 6), (4, 1, 4), (5, 1, 2),
  (6, 2, 4), (7, 2, 4), (8, 2, 6), (9, 2, 8), (10, 2, 4),
  (11, 3, 4), (12, 3, 6), (13, 3, 8), (14, 3, 4), (15, 3, 4)
ON CONFLICT (numero) DO NOTHING;

-- Meseros
INSERT INTO mesero (nombre, turno) VALUES
  ('Leslie Barreto',   'Mañana'),
  ('Leopoldo Brito',   'Tarde'),
  ('Brisa Capcha',     'Mañana'),
  ('Nelsy Ramos',      'Tarde'),
  ('Joseph Silvano',   'Noche'),
  ('Admin Sistema',    'Completo')
ON CONFLICT DO NOTHING;

-- Usuarios (contraseñas hasheadas con bcrypt, factor 10)
-- mesero1   → mesero123
-- mesero2   → mesero123
-- cocina1   → cocina123
-- admin     → admin123
INSERT INTO usuario (username, password, rol, id_mesero) VALUES
  ('mesero1', '$2a$10$X7VYEqihkmFDbzHRkdZ8dOUMfN5G/k1V7rXPfDQGLbm8q3e2NkAay', 'MESERO',        1),
  ('mesero2', '$2a$10$X7VYEqihkmFDbzHRkdZ8dOUMfN5G/k1V7rXPfDQGLbm8q3e2NkAay', 'MESERO',        2),
  ('cocina1', '$2a$10$LQeRvn5Z1mPk2oGqKcBxB.6RVhgK1TQiYqPlCxXnRB9DhBp2lH2Hy', 'COCINA',        3),
  ('admin',   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMINISTRADOR', 6)
ON CONFLICT (username) DO NOTHING;
