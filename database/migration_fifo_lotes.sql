-- ============================================================
-- MIGRACIÓN: Crear tabla lotes_inventario para sistema FIFO
-- Ejecutar en Railway (producción)
-- ============================================================

CREATE TABLE IF NOT EXISTS lotes_inventario (
    id_lote           INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
    id_producto       INT UNSIGNED   NOT NULL,
    id_empresa        INT UNSIGNED   NOT NULL,
    id_movimiento     INT UNSIGNED   NULL COMMENT 'Movimiento de entrada que creó este lote',
    cantidad_inicial  INT            NOT NULL CHECK (cantidad_inicial > 0),
    cantidad_restante INT            NOT NULL DEFAULT 0,
    costo_unitario    DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    precio_venta      DECIMAL(10,2)  NOT NULL COMMENT 'Precio de venta para las unidades de este lote',
    fecha_entrada     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo            TINYINT(1)     NOT NULL DEFAULT 1,
    CONSTRAINT fk_lote_producto   FOREIGN KEY (id_producto)   REFERENCES productos(id_producto),
    CONSTRAINT fk_lote_empresa    FOREIGN KEY (id_empresa)    REFERENCES empresas(id_empresa),
    CONSTRAINT fk_lote_movimiento FOREIGN KEY (id_movimiento) REFERENCES movimientos_inventario(id_movimiento),
    INDEX idx_lote_producto (id_producto),
    INDEX idx_lote_empresa  (id_empresa),
    INDEX idx_lote_activo   (activo),
    INDEX idx_lote_fecha    (fecha_entrada)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inicializar lotes desde el stock actual de cada producto
-- (Crea un lote inicial por producto con el precio de venta actual)
INSERT INTO lotes_inventario (id_producto, id_empresa, cantidad_inicial, cantidad_restante, costo_unitario, precio_venta)
SELECT
    p.id_producto,
    p.id_empresa,
    p.stock_actual,
    p.stock_actual,
    p.precio_compra,
    p.precio_venta
FROM productos p
WHERE p.activo = 1 AND p.stock_actual > 0
ON DUPLICATE KEY UPDATE id_lote = id_lote; -- No hacer nada si ya existe
