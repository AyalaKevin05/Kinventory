-- ============================================================
-- KINVENTORY — Sistema Profesional de Inventario y Ventas
-- Base de Datos: MySQL 8.0+
-- Versión: 1.0.0
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- ============================================================
-- ELIMINAR TABLAS (orden inverso a dependencias)
-- ============================================================
DROP TABLE IF EXISTS auditoria;
DROP TABLE IF EXISTS movimientos_inventario;
DROP TABLE IF EXISTS facturas;
DROP TABLE IF EXISTS detalle_venta;
DROP TABLE IF EXISTS ventas;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS proveedores;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS sucursales;
DROP TABLE IF EXISTS empresas;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- TABLA: roles
-- 1 = Administrador | 2 = Vendedor | 3 = Almacenista
-- ============================================================
CREATE TABLE roles (
    id_rol      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(50)  NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    permisos    JSON,
    activo      TINYINT(1)   NOT NULL DEFAULT 1,
    creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: empresas (soporte multiempresa)
-- ============================================================
CREATE TABLE empresas (
    id_empresa  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    nit         VARCHAR(30)  UNIQUE,
    telefono    VARCHAR(20),
    email       VARCHAR(150),
    direccion   TEXT,
    ciudad      VARCHAR(100),
    pais        VARCHAR(100) DEFAULT 'Colombia',
    logo_url    VARCHAR(500),
    sitio_web   VARCHAR(200),
    moneda      VARCHAR(10)  DEFAULT 'COP',
    tasa_iva    DECIMAL(5,2) DEFAULT 19.00,
    pie_factura TEXT,
    activo      TINYINT(1)   NOT NULL DEFAULT 1,
    creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: sucursales (multisucursal por empresa)
-- ============================================================
CREATE TABLE sucursales (
    id_sucursal INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_empresa  INT UNSIGNED NOT NULL,
    nombre      VARCHAR(150) NOT NULL,
    codigo      VARCHAR(20)  UNIQUE,
    telefono    VARCHAR(20),
    email       VARCHAR(150),
    direccion   TEXT,
    ciudad      VARCHAR(100),
    es_principal TINYINT(1)  NOT NULL DEFAULT 0,
    activo      TINYINT(1)   NOT NULL DEFAULT 1,
    creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sucursal_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: usuarios
-- ============================================================
CREATE TABLE usuarios (
    id_usuario     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_rol         INT UNSIGNED NOT NULL,
    id_empresa     INT UNSIGNED NOT NULL,
    id_sucursal    INT UNSIGNED,
    nombre         VARCHAR(100) NOT NULL,
    apellido       VARCHAR(100),
    correo         VARCHAR(150) NOT NULL UNIQUE,
    contrasena     VARCHAR(255) NOT NULL,
    telefono       VARCHAR(20),
    avatar_url     VARCHAR(500),
    ultimo_acceso  TIMESTAMP    NULL,
    activo         TINYINT(1)   NOT NULL DEFAULT 1,
    creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_rol      FOREIGN KEY (id_rol)      REFERENCES roles(id_rol),
    CONSTRAINT fk_usuario_empresa  FOREIGN KEY (id_empresa)  REFERENCES empresas(id_empresa),
    CONSTRAINT fk_usuario_sucursal FOREIGN KEY (id_sucursal) REFERENCES sucursales(id_sucursal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: categorias
-- ============================================================
CREATE TABLE categorias (
    id_categoria   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_empresa     INT UNSIGNED NOT NULL,
    nombre         VARCHAR(100) NOT NULL,
    descripcion    TEXT,
    color          VARCHAR(7)   DEFAULT '#FF6B35',
    icono          VARCHAR(50),
    activo         TINYINT(1)   NOT NULL DEFAULT 1,
    creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categoria_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa),
    UNIQUE KEY uq_categoria_empresa (id_empresa, nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: proveedores
-- ============================================================
CREATE TABLE proveedores (
    id_proveedor   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_empresa     INT UNSIGNED NOT NULL,
    nombre         VARCHAR(150) NOT NULL,
    nit            VARCHAR(30),
    contacto       VARCHAR(100),
    telefono       VARCHAR(20),
    email          VARCHAR(150),
    direccion      TEXT,
    ciudad         VARCHAR(100),
    pagina_web     VARCHAR(200),
    notas          TEXT,
    activo         TINYINT(1)   NOT NULL DEFAULT 1,
    creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_proveedor_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: clientes
-- ============================================================
CREATE TABLE clientes (
    id_cliente     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_empresa     INT UNSIGNED NOT NULL,
    tipo_documento ENUM('CC','NIT','CE','PP','TI') DEFAULT 'CC',
    documento      VARCHAR(20),
    nombre         VARCHAR(150) NOT NULL,
    apellido       VARCHAR(150),
    email          VARCHAR(150),
    telefono       VARCHAR(20),
    direccion      TEXT,
    ciudad         VARCHAR(100),
    notas          TEXT,
    total_compras  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    activo         TINYINT(1)    NOT NULL DEFAULT 1,
    creado_en      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cliente_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa),
    UNIQUE KEY uq_cliente_documento (id_empresa, documento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: productos
-- ============================================================
CREATE TABLE productos (
    id_producto    INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    id_empresa     INT UNSIGNED  NOT NULL,
    id_categoria   INT UNSIGNED  NOT NULL,
    id_proveedor   INT UNSIGNED,
    codigo         VARCHAR(50),
    codigo_barras  VARCHAR(100),
    nombre         VARCHAR(150)  NOT NULL,
    descripcion    TEXT,
    precio_compra  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    precio_venta   DECIMAL(10,2) NOT NULL CHECK (precio_venta >= 0),
    stock_actual   INT           NOT NULL DEFAULT 0,
    stock_minimo   INT           NOT NULL DEFAULT 5,
    stock_maximo   INT           NOT NULL DEFAULT 1000,
    unidad_medida  VARCHAR(30)   DEFAULT 'unidad',
    imagen_url     VARCHAR(500),
    aplica_iva     TINYINT(1)    NOT NULL DEFAULT 1,
    activo         TINYINT(1)    NOT NULL DEFAULT 1,
    creado_en      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_producto_empresa   FOREIGN KEY (id_empresa)   REFERENCES empresas(id_empresa),
    CONSTRAINT fk_producto_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria),
    CONSTRAINT fk_producto_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor),
    UNIQUE KEY uq_producto_codigo (id_empresa, codigo),
    INDEX idx_producto_barras (codigo_barras),
    INDEX idx_producto_nombre (nombre),
    INDEX idx_producto_stock  (stock_actual)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: ventas
-- ============================================================
CREATE TABLE ventas (
    id_venta       INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    id_empresa     INT UNSIGNED  NOT NULL,
    id_sucursal    INT UNSIGNED  NOT NULL,
    id_usuario     INT UNSIGNED  NOT NULL,
    id_cliente     INT UNSIGNED,
    fecha          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    subtotal       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    descuento      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    impuesto       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    metodo_pago    ENUM('efectivo','tarjeta','transferencia','nequi','daviplata','credito') DEFAULT 'efectivo',
    estado         ENUM('pendiente','completada','cancelada','devuelta') DEFAULT 'completada',
    notas          TEXT,
    creado_en      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_venta_empresa   FOREIGN KEY (id_empresa)  REFERENCES empresas(id_empresa),
    CONSTRAINT fk_venta_sucursal  FOREIGN KEY (id_sucursal) REFERENCES sucursales(id_sucursal),
    CONSTRAINT fk_venta_usuario   FOREIGN KEY (id_usuario)  REFERENCES usuarios(id_usuario),
    CONSTRAINT fk_venta_cliente   FOREIGN KEY (id_cliente)  REFERENCES clientes(id_cliente),
    INDEX idx_venta_fecha    (fecha),
    INDEX idx_venta_estado   (estado),
    INDEX idx_venta_empresa  (id_empresa),
    INDEX idx_venta_sucursal (id_sucursal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: detalle_venta
-- ============================================================
CREATE TABLE detalle_venta (
    id_detalle     INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    id_venta       INT UNSIGNED  NOT NULL,
    id_producto    INT UNSIGNED  NOT NULL,
    cantidad       INT           NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    descuento_item DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    subtotal       DECIMAL(10,2) AS (cantidad * precio_unitario - descuento_item) STORED,
    CONSTRAINT fk_detalle_venta    FOREIGN KEY (id_venta)    REFERENCES ventas(id_venta) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
    INDEX idx_detalle_venta    (id_venta),
    INDEX idx_detalle_producto (id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: facturas
-- ============================================================
CREATE TABLE facturas (
    id_factura      INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    id_empresa      INT UNSIGNED  NOT NULL,
    id_venta        INT UNSIGNED  NOT NULL UNIQUE,
    numero_factura  VARCHAR(30)   NOT NULL UNIQUE,
    fecha_emision   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATE,
    subtotal        DECIMAL(12,2) NOT NULL,
    descuento       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    impuesto        DECIMAL(12,2) NOT NULL,
    total           DECIMAL(12,2) NOT NULL,
    estado          ENUM('emitida','pagada','anulada','vencida') DEFAULT 'emitida',
    metodo_pago     ENUM('efectivo','tarjeta','transferencia','nequi','daviplata','credito') DEFAULT 'efectivo',
    notas           TEXT,
    creado_en       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_factura_empresa FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa),
    CONSTRAINT fk_factura_venta   FOREIGN KEY (id_venta)   REFERENCES ventas(id_venta),
    INDEX idx_factura_numero  (numero_factura),
    INDEX idx_factura_estado  (estado),
    INDEX idx_factura_empresa (id_empresa),
    INDEX idx_factura_fecha   (fecha_emision)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: movimientos_inventario
-- Registra TODAS las entradas y salidas de productos (Almacenista)
-- ============================================================
CREATE TABLE movimientos_inventario (
    id_movimiento  INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    id_empresa     INT UNSIGNED  NOT NULL,
    id_sucursal    INT UNSIGNED  NOT NULL,
    id_producto    INT UNSIGNED  NOT NULL,
    id_usuario     INT UNSIGNED  NOT NULL,
    id_venta       INT UNSIGNED  NULL,
    tipo           ENUM(
                     'entrada_compra',
                     'entrada_devolucion',
                     'entrada_ajuste',
                     'salida_venta',
                     'salida_reposicion',
                     'salida_ajuste',
                     'salida_baja',
                     'traslado_entrada',
                     'traslado_salida'
                   ) NOT NULL,
    cantidad       INT           NOT NULL,
    stock_anterior INT           NOT NULL,
    stock_nuevo    INT           NOT NULL,
    costo_unitario DECIMAL(10,2) DEFAULT 0.00,
    referencia     VARCHAR(100)  COMMENT 'Número de orden, factura de compra, etc.',
    proveedor      VARCHAR(150),
    notas          TEXT,
    creado_en      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_movimiento_empresa   FOREIGN KEY (id_empresa)  REFERENCES empresas(id_empresa),
    CONSTRAINT fk_movimiento_sucursal  FOREIGN KEY (id_sucursal) REFERENCES sucursales(id_sucursal),
    CONSTRAINT fk_movimiento_producto  FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
    CONSTRAINT fk_movimiento_usuario   FOREIGN KEY (id_usuario)  REFERENCES usuarios(id_usuario),
    CONSTRAINT fk_movimiento_venta     FOREIGN KEY (id_venta)    REFERENCES ventas(id_venta),
    INDEX idx_movimiento_producto (id_producto),
    INDEX idx_movimiento_tipo     (tipo),
    INDEX idx_movimiento_fecha    (creado_en),
    INDEX idx_movimiento_empresa  (id_empresa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: auditoria
-- Log de TODAS las acciones del sistema
-- ============================================================
CREATE TABLE auditoria (
    id_auditoria   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario     INT UNSIGNED  NOT NULL,
    id_empresa     INT UNSIGNED  NOT NULL,
    accion         VARCHAR(100)  NOT NULL COMMENT 'CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.',
    tabla          VARCHAR(100)  COMMENT 'Tabla afectada',
    id_registro    INT UNSIGNED  COMMENT 'ID del registro afectado',
    datos_anterior JSON          COMMENT 'Estado previo del registro',
    datos_nuevo    JSON          COMMENT 'Estado nuevo del registro',
    ip_address     VARCHAR(45),
    user_agent     VARCHAR(500),
    creado_en      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditoria_usuario  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    CONSTRAINT fk_auditoria_empresa  FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa),
    INDEX idx_auditoria_usuario  (id_usuario),
    INDEX idx_auditoria_empresa  (id_empresa),
    INDEX idx_auditoria_tabla    (tabla),
    INDEX idx_auditoria_fecha    (creado_en),
    INDEX idx_auditoria_accion   (accion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TRIGGER: descontar stock automáticamente al crear detalle_venta
-- ============================================================
DELIMITER $$

CREATE TRIGGER trg_after_detalle_insert
AFTER INSERT ON detalle_venta
FOR EACH ROW
BEGIN
    DECLARE v_stock_anterior INT;
    DECLARE v_id_empresa INT UNSIGNED;
    DECLARE v_id_sucursal INT UNSIGNED;
    DECLARE v_id_usuario INT UNSIGNED;

    SELECT stock_actual INTO v_stock_anterior
    FROM productos WHERE id_producto = NEW.id_producto;

    SELECT id_empresa, id_sucursal, id_usuario
    INTO v_id_empresa, v_id_sucursal, v_id_usuario
    FROM ventas WHERE id_venta = NEW.id_venta;

    -- Descontar stock
    UPDATE productos
    SET stock_actual = stock_actual - NEW.cantidad
    WHERE id_producto = NEW.id_producto;

    -- Registrar movimiento
    INSERT INTO movimientos_inventario
        (id_empresa, id_sucursal, id_producto, id_usuario, id_venta,
         tipo, cantidad, stock_anterior, stock_nuevo)
    VALUES
        (v_id_empresa, v_id_sucursal, NEW.id_producto, v_id_usuario, NEW.id_venta,
         'salida_venta', NEW.cantidad, v_stock_anterior, v_stock_anterior - NEW.cantidad);
END$$

-- ============================================================
-- TRIGGER: actualizar total_compras del cliente al completar venta
-- ============================================================
CREATE TRIGGER trg_after_venta_insert
AFTER INSERT ON ventas
FOR EACH ROW
BEGIN
    IF NEW.id_cliente IS NOT NULL AND NEW.estado = 'completada' THEN
        UPDATE clientes
        SET total_compras = total_compras + NEW.total
        WHERE id_cliente = NEW.id_cliente;
    END IF;
END$$

-- ============================================================
-- TRIGGER: generar número de factura automáticamente
-- ============================================================
CREATE TRIGGER trg_after_factura_insert
BEFORE INSERT ON facturas
FOR EACH ROW
BEGIN
    DECLARE v_consecutivo INT;

    SELECT COUNT(*) + 1 INTO v_consecutivo
    FROM facturas WHERE id_empresa = NEW.id_empresa;

    SET NEW.numero_factura = CONCAT(
        'KI-',
        LPAD(NEW.id_empresa, 3, '0'),
        '-',
        LPAD(v_consecutivo, 6, '0')
    );
END$$

DELIMITER ;

-- ============================================================
-- VISTAS útiles para reportes
-- ============================================================

-- Vista: Productos con estado de stock
CREATE OR REPLACE VIEW v_productos_stock AS
SELECT
    p.id_producto,
    p.codigo,
    p.nombre,
    p.precio_venta,
    p.stock_actual,
    p.stock_minimo,
    p.stock_maximo,
    p.aplica_iva,
    c.nombre AS categoria,
    pr.nombre AS proveedor,
    e.nombre AS empresa,
    CASE
        WHEN p.stock_actual = 0          THEN 'agotado'
        WHEN p.stock_actual <= p.stock_minimo THEN 'critico'
        WHEN p.stock_actual <= p.stock_minimo * 2 THEN 'bajo'
        ELSE 'normal'
    END AS estado_stock
FROM productos p
JOIN categorias c  ON p.id_categoria = c.id_categoria
LEFT JOIN proveedores pr ON p.id_proveedor = pr.id_proveedor
JOIN empresas e    ON p.id_empresa = e.id_empresa
WHERE p.activo = 1;

-- Vista: Resumen de ventas por día
CREATE OR REPLACE VIEW v_ventas_resumen AS
SELECT
    v.id_empresa,
    DATE(v.fecha)      AS fecha,
    COUNT(*)           AS total_ventas,
    SUM(v.total)       AS ingresos,
    SUM(v.descuento)   AS descuentos,
    SUM(v.impuesto)    AS impuestos,
    AVG(v.total)       AS ticket_promedio,
    u.nombre           AS sucursal
FROM ventas v
JOIN sucursales u ON v.id_sucursal = u.id_sucursal
WHERE v.estado = 'completada'
GROUP BY v.id_empresa, DATE(v.fecha), v.id_sucursal, u.nombre;

-- Vista: Top productos más vendidos
CREATE OR REPLACE VIEW v_top_productos AS
SELECT
    p.id_producto,
    p.nombre         AS producto,
    c.nombre         AS categoria,
    SUM(dv.cantidad) AS unidades_vendidas,
    SUM(dv.subtotal) AS ingresos_totales,
    COUNT(DISTINCT dv.id_venta) AS num_ventas
FROM detalle_venta dv
JOIN productos p  ON dv.id_producto = p.id_producto
JOIN categorias c ON p.id_categoria = c.id_categoria
JOIN ventas v     ON dv.id_venta = v.id_venta
WHERE v.estado = 'completada'
GROUP BY p.id_producto, p.nombre, c.nombre
ORDER BY unidades_vendidas DESC;

-- Vista: Movimientos de inventario completos
CREATE OR REPLACE VIEW v_movimientos_completos AS
SELECT
    m.id_movimiento,
    m.creado_en,
    m.tipo,
    m.cantidad,
    m.stock_anterior,
    m.stock_nuevo,
    m.referencia,
    m.notas,
    p.nombre     AS producto,
    p.codigo     AS codigo_producto,
    u.nombre     AS usuario,
    r.nombre     AS rol_usuario,
    s.nombre     AS sucursal,
    e.nombre     AS empresa
FROM movimientos_inventario m
JOIN productos p   ON m.id_producto = p.id_producto
JOIN usuarios u    ON m.id_usuario  = u.id_usuario
JOIN roles r       ON u.id_rol      = r.id_rol
JOIN sucursales s  ON m.id_sucursal = s.id_sucursal
JOIN empresas e    ON m.id_empresa  = e.id_empresa;
