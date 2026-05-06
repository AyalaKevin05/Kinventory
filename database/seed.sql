-- ============================================================
-- KINVENTORY — Datos Iniciales (SEED)
-- IMPORTANTE: Ejecutar DESPUÉS de schema.sql
-- Las contraseñas son placeholders — regenerar con bcrypt
-- ============================================================

-- ============================================================
-- ROLES
-- ============================================================
INSERT INTO roles (id_rol, nombre, descripcion, permisos) VALUES
(1, 'Administrador', 'Acceso total al sistema', JSON_OBJECT(
    'dashboard', true,
    'productos', JSON_OBJECT('ver', true, 'crear', true, 'editar', true, 'eliminar', true),
    'ventas',    JSON_OBJECT('ver', true, 'crear', true, 'cancelar', true),
    'inventario',JSON_OBJECT('ver', true, 'movimientos', true, 'ajustes', true),
    'facturas',  JSON_OBJECT('ver', true, 'emitir', true, 'anular', true),
    'reportes',  JSON_OBJECT('ver', true, 'exportar', true),
    'usuarios',  JSON_OBJECT('ver', true, 'crear', true, 'editar', true),
    'empresa',   JSON_OBJECT('ver', true, 'editar', true),
    'auditoria', true
)),
(2, 'Vendedor', 'Acceso a caja y ventas', JSON_OBJECT(
    'dashboard', false,
    'productos', JSON_OBJECT('ver', true, 'crear', false, 'editar', false, 'eliminar', false),
    'ventas',    JSON_OBJECT('ver', true, 'crear', true, 'cancelar', false),
    'inventario',JSON_OBJECT('ver', false, 'movimientos', false, 'ajustes', false),
    'facturas',  JSON_OBJECT('ver', true, 'emitir', true, 'anular', false),
    'reportes',  JSON_OBJECT('ver', false, 'exportar', false),
    'usuarios',  JSON_OBJECT('ver', false, 'crear', false, 'editar', false),
    'empresa',   JSON_OBJECT('ver', false, 'editar', false),
    'auditoria', false
)),
(3, 'Almacenista', 'Gestión de bodega e inventario', JSON_OBJECT(
    'dashboard', false,
    'productos', JSON_OBJECT('ver', true, 'crear', false, 'editar', false, 'eliminar', false),
    'ventas',    JSON_OBJECT('ver', false, 'crear', false, 'cancelar', false),
    'inventario',JSON_OBJECT('ver', true, 'movimientos', true, 'ajustes', true),
    'facturas',  JSON_OBJECT('ver', false, 'emitir', false, 'anular', false),
    'reportes',  JSON_OBJECT('ver', true, 'exportar', false),
    'usuarios',  JSON_OBJECT('ver', false, 'crear', false, 'editar', false),
    'empresa',   JSON_OBJECT('ver', false, 'editar', false),
    'auditoria', false
));

-- ============================================================
-- EMPRESA
-- ============================================================
INSERT INTO empresas (id_empresa, nombre, nit, telefono, email, direccion, ciudad, tasa_iva, pie_factura) VALUES
(1, 'Kinventory Demo', '900.123.456-1', '601-555-0100', 'info@kinventory.com',
 'Calle 100 # 15-20, Oficina 301', 'Bogotá', 19.00,
 'Gracias por su compra. Para devoluciones comuníquese dentro de los 30 días.');

-- ============================================================
-- SUCURSALES
-- ============================================================
INSERT INTO sucursales (id_sucursal, id_empresa, nombre, codigo, telefono, email, direccion, ciudad, es_principal) VALUES
(1, 1, 'Sede Principal', 'SUC-001', '601-555-0101', 'principal@kinventory.com', 'Calle 100 # 15-20', 'Bogotá', 1),
(2, 1, 'Sucursal Norte',  'SUC-002', '601-555-0102', 'norte@kinventory.com',     'Carrera 15 # 120-30', 'Bogotá', 0);

-- ============================================================
-- USUARIOS
-- Nota: Actualizar contraseñas con bcrypt antes de usar
-- node -e "const b=require('bcryptjs'); console.log(b.hashSync('Admin123!',10));"
-- ============================================================
INSERT INTO usuarios (id_rol, id_empresa, id_sucursal, nombre, apellido, correo, contrasena, telefono) VALUES
(1, 1, 1, 'Admin',    'Kinventory', 'admin@kinventory.com',      '$2b$10$PLACEHOLDER_ADMIN_HASH',       '300-111-1111'),
(2, 1, 1, 'Carlos',   'Vendedor',   'vendedor@kinventory.com',   '$2b$10$PLACEHOLDER_VENDEDOR_HASH',    '300-222-2222'),
(3, 1, 1, 'Luis',     'Almacenista','almacenista@kinventory.com','$2b$10$PLACEHOLDER_ALMACENISTA_HASH', '300-333-3333'),
(2, 1, 2, 'María',    'López',      'mlopez@kinventory.com',     '$2b$10$PLACEHOLDER_VENDEDOR_HASH',    '300-444-4444');

-- ============================================================
-- CATEGORÍAS
-- ============================================================
INSERT INTO categorias (id_empresa, nombre, descripcion, color, icono) VALUES
(1, 'Electrónica',    'Dispositivos y accesorios tecnológicos', '#FF6B35', 'cpu'),
(1, 'Ropa',           'Prendas de vestir para toda la familia', '#E85A25', 'shirt'),
(1, 'Alimentos',      'Productos alimenticios y bebidas',       '#F59E0B', 'package'),
(1, 'Hogar',          'Artículos para el hogar y decoración',   '#22C55E', 'home'),
(1, 'Deportes',       'Equipos y accesorios deportivos',        '#3B82F6', 'activity'),
(1, 'Papelería',      'Útiles y artículos de oficina',          '#8B5CF6', 'pen-tool'),
(1, 'Aseo',           'Productos de limpieza e higiene',        '#06B6D4', 'droplets');

-- ============================================================
-- PROVEEDORES
-- ============================================================
INSERT INTO proveedores (id_empresa, nombre, nit, contacto, telefono, email, ciudad) VALUES
(1, 'TechSupply S.A.S',    '800.111.222-3', 'Pedro Gómez',    '601-555-2001', 'ventas@techsupply.co',  'Bogotá'),
(1, 'ModaExpress Ltda.',   '800.333.444-5', 'Ana Martínez',   '604-555-2002', 'pedidos@modaexpress.co','Medellín'),
(1, 'AlimentosFresh S.A.', '800.555.666-7', 'Jorge Ruiz',     '605-555-2003', 'info@alimentosfresh.co','Cali'),
(1, 'HogarPlus',           '800.777.888-9', 'Sandra Torres',  '601-555-2004', 'ventas@hogarplus.co',   'Bogotá'),
(1, 'DeportesPro',         '800.999.000-1', 'Miguel Herrera', '601-555-2005', 'ventas@deportespro.co', 'Bogotá');

-- ============================================================
-- CLIENTES
-- ============================================================
INSERT INTO clientes (id_empresa, tipo_documento, documento, nombre, apellido, email, telefono, ciudad) VALUES
(1, 'CC',  '000000000',  'Cliente',  'General',    'general@kinventory.com', '000-0000', 'Bogotá'),
(1, 'CC',  '1030567890', 'Carlos',   'Rodríguez',  'carlos.r@email.com',     '311-1111111', 'Bogotá'),
(1, 'CC',  '1020345678', 'Ana',      'Gómez',      'ana.g@email.com',        '322-2222222', 'Medellín'),
(1, 'NIT', '900456789-0','Tech Corp','S.A.S',       'compras@techcorp.co',    '601-333-3333', 'Bogotá'),
(1, 'CC',  '1040123456', 'María',    'Hernández',  'maria.h@email.com',      '315-4444444', 'Cali');

-- ============================================================
-- PRODUCTOS
-- ============================================================
INSERT INTO productos (id_empresa, id_categoria, id_proveedor, codigo, nombre, descripcion, precio_compra, precio_venta, stock_actual, stock_minimo, aplica_iva) VALUES
-- Electrónica
(1, 1, 1, 'ELEC-001', 'Smartphone Samsung A14',    'Teléfono Android 6.6" 64GB 4G',          180000, 299900, 50, 5, 1),
(1, 1, 1, 'ELEC-002', 'Auriculares Bluetooth JBL', 'Auriculares inalámbricos 20h batería',    35000,  89900,  80, 10,1),
(1, 1, 1, 'ELEC-003', 'Cable USB-C 2m',            'Carga rápida 65W certificado',             8000,   18900, 200, 20,1),
(1, 1, 1, 'ELEC-004', 'Cargador 65W GaN',          'Cargador compacto multitipo',             25000,  59900, 60,  10,1),
-- Ropa
(1, 2, 2, 'ROPA-001', 'Camiseta Algodón',          'Unisex 100% algodón tallas S-XL',         12000,  29900, 150, 20,0),
(1, 2, 2, 'ROPA-002', 'Jean Clásico',              'Corte recto tallas 28-36',                25000,  59900, 80,  10,0),
(1, 2, 2, 'ROPA-003', 'Buzo Hoodie',               'Algodón frisado con capucha',             28000,  69900, 60,  10,0),
-- Alimentos
(1, 3, 3, 'ALIM-001', 'Arroz Diana 5kg',           'Arroz blanco grano largo premium',         18000,  28900, 300, 50,0),
(1, 3, 3, 'ALIM-002', 'Aceite Palma 1L',           'Aceite vegetal refinado',                  8000,   13900, 200, 30,0),
(1, 3, 3, 'ALIM-003', 'Café Águila Roja 500g',     'Café molido tostado tradicional',          15000,  24900, 150, 25,0),
-- Hogar
(1, 4, 4, 'HOGAR-001','Cafetera Eléctrica',        'Cafetera goteo 12 tazas 1000W',            28000,  59900, 35,  5, 1),
(1, 4, 4, 'HOGAR-002','Juego Sábanas Queen',       '100% algodón 200 hilos Queen',             35000,  79900, 40,  5, 0),
-- Deportes
(1, 5, 5, 'DEP-001',  'Balón Fútbol #5',           'Balón oficial talla 5 FIFA Quality',       18000,  39900, 60,  10,1),
(1, 5, 5, 'DEP-002',  'Zapatillas Running',        'Running neutral amortiguación talla 38-44',55000, 129900, 30,  5, 1),
-- Papelería
(1, 6, 4, 'PAP-001',  'Resma Papel Carta',         'Papel bond 75g 500 hojas',                 10000,  18900, 100, 20,0),
(1, 6, 4, 'PAP-002',  'Bolígrafo BIC x12',         'Caja 12 bolígrafos tinta azul',             5000,   9900, 200, 30,0);
