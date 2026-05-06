-- ============================================================
-- KINVENTORY — Consultas útiles y Procedimientos Almacenados
-- ============================================================

-- ============================================================
-- STORED PROCEDURE: Registrar venta completa con transacción
-- ============================================================
DELIMITER $$

CREATE PROCEDURE sp_registrar_venta(
    IN p_id_empresa   INT UNSIGNED,
    IN p_id_sucursal  INT UNSIGNED,
    IN p_id_usuario   INT UNSIGNED,
    IN p_id_cliente   INT UNSIGNED,
    IN p_metodo_pago  VARCHAR(20),
    IN p_items        JSON,        -- [{"id_producto":1,"cantidad":2,"precio":29900}]
    IN p_descuento    DECIMAL(12,2),
    IN p_tasa_iva     DECIMAL(5,2),
    IN p_notas        TEXT,
    OUT p_id_venta    INT UNSIGNED,
    OUT p_id_factura  INT UNSIGNED,
    OUT p_total       DECIMAL(12,2),
    OUT p_mensaje     VARCHAR(500)
)
BEGIN
    DECLARE v_subtotal      DECIMAL(12,2) DEFAULT 0;
    DECLARE v_impuesto      DECIMAL(12,2) DEFAULT 0;
    DECLARE v_total         DECIMAL(12,2) DEFAULT 0;
    DECLARE v_i             INT DEFAULT 0;
    DECLARE v_num_items     INT;
    DECLARE v_id_producto   INT UNSIGNED;
    DECLARE v_cantidad      INT;
    DECLARE v_precio        DECIMAL(10,2);
    DECLARE v_stock         INT;
    DECLARE v_aplica_iva    TINYINT;
    DECLARE v_nombre_prod   VARCHAR(150);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1 p_mensaje = MESSAGE_TEXT;
        SET p_id_venta = NULL;
        SET p_id_factura = NULL;
        SET p_total = 0;
    END;

    START TRANSACTION;

    SET v_num_items = JSON_LENGTH(p_items);

    -- Validar stock de todos los productos antes de procesar
    WHILE v_i < v_num_items DO
        SET v_id_producto = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].id_producto')));
        SET v_cantidad    = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].cantidad')));

        SELECT stock_actual, nombre INTO v_stock, v_nombre_prod
        FROM productos WHERE id_producto = v_id_producto FOR UPDATE;

        IF v_stock < v_cantidad THEN
            SET p_mensaje = CONCAT('Stock insuficiente para: ', v_nombre_prod,
                                   '. Disponible: ', v_stock, ', solicitado: ', v_cantidad);
            ROLLBACK;
            LEAVE sp_registrar_venta;
        END IF;

        SET v_i = v_i + 1;
    END WHILE;

    -- Crear la venta
    INSERT INTO ventas (id_empresa, id_sucursal, id_usuario, id_cliente, metodo_pago, descuento, notas)
    VALUES (p_id_empresa, p_id_sucursal, p_id_usuario, p_id_cliente, p_metodo_pago, p_descuento, p_notas);

    SET p_id_venta = LAST_INSERT_ID();
    SET v_i = 0;

    -- Insertar detalle (el trigger descuenta el stock automáticamente)
    WHILE v_i < v_num_items DO
        SET v_id_producto = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].id_producto')));
        SET v_cantidad    = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].cantidad')));
        SET v_precio      = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_i, '].precio')));

        SELECT aplica_iva INTO v_aplica_iva FROM productos WHERE id_producto = v_id_producto;

        INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario)
        VALUES (p_id_venta, v_id_producto, v_cantidad, v_precio);

        SET v_subtotal = v_subtotal + (v_cantidad * v_precio);
        IF v_aplica_iva = 1 THEN
            SET v_impuesto = v_impuesto + (v_cantidad * v_precio * p_tasa_iva / 100);
        END IF;

        SET v_i = v_i + 1;
    END WHILE;

    -- Aplicar descuento
    SET v_subtotal = v_subtotal - p_descuento;
    SET v_total    = v_subtotal + v_impuesto;

    -- Actualizar totales de la venta
    UPDATE ventas SET subtotal = v_subtotal, impuesto = v_impuesto, total = v_total
    WHERE id_venta = p_id_venta;

    -- Crear factura automáticamente
    INSERT INTO facturas (id_empresa, id_venta, subtotal, descuento, impuesto, total, metodo_pago)
    VALUES (p_id_empresa, p_id_venta, v_subtotal, p_descuento, v_impuesto, v_total, p_metodo_pago);

    SET p_id_factura = LAST_INSERT_ID();
    SET p_total      = v_total;
    SET p_mensaje    = 'Venta registrada exitosamente';

    COMMIT;
END$$

-- ============================================================
-- STORED PROCEDURE: Registrar movimiento de inventario (Almacenista)
-- ============================================================
CREATE PROCEDURE sp_movimiento_inventario(
    IN p_id_empresa    INT UNSIGNED,
    IN p_id_sucursal   INT UNSIGNED,
    IN p_id_producto   INT UNSIGNED,
    IN p_id_usuario    INT UNSIGNED,
    IN p_tipo          VARCHAR(50),
    IN p_cantidad      INT,
    IN p_costo         DECIMAL(10,2),
    IN p_referencia    VARCHAR(100),
    IN p_proveedor     VARCHAR(150),
    IN p_notas         TEXT,
    OUT p_stock_nuevo  INT,
    OUT p_mensaje      VARCHAR(500)
)
BEGIN
    DECLARE v_stock_anterior INT;
    DECLARE v_nuevo_stock    INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1 p_mensaje = MESSAGE_TEXT;
        SET p_stock_nuevo = -1;
    END;

    START TRANSACTION;

    SELECT stock_actual INTO v_stock_anterior
    FROM productos WHERE id_producto = p_id_producto FOR UPDATE;

    -- Calcular nuevo stock según tipo
    IF p_tipo LIKE 'entrada%' OR p_tipo LIKE 'traslado_entrada' THEN
        SET v_nuevo_stock = v_stock_anterior + p_cantidad;
        UPDATE productos SET stock_actual = v_nuevo_stock WHERE id_producto = p_id_producto;
    ELSEIF p_tipo LIKE 'salida%' OR p_tipo = 'traslado_salida' THEN
        IF v_stock_anterior < p_cantidad THEN
            SET p_mensaje = CONCAT('Stock insuficiente. Disponible: ', v_stock_anterior);
            ROLLBACK;
            LEAVE sp_movimiento_inventario;
        END IF;
        SET v_nuevo_stock = v_stock_anterior - p_cantidad;
        UPDATE productos SET stock_actual = v_nuevo_stock WHERE id_producto = p_id_producto;
    END IF;

    -- Registrar movimiento
    INSERT INTO movimientos_inventario
        (id_empresa, id_sucursal, id_producto, id_usuario, tipo,
         cantidad, stock_anterior, stock_nuevo, costo_unitario, referencia, proveedor, notas)
    VALUES
        (p_id_empresa, p_id_sucursal, p_id_producto, p_id_usuario, p_tipo,
         p_cantidad, v_stock_anterior, v_nuevo_stock, p_costo, p_referencia, p_proveedor, p_notas);

    SET p_stock_nuevo = v_nuevo_stock;
    SET p_mensaje     = CONCAT('Movimiento registrado. Stock actual: ', v_nuevo_stock);

    COMMIT;
END$$

DELIMITER ;

-- ============================================================
-- CONSULTAS DE REPORTES
-- ============================================================

-- Ventas del día actual
SELECT * FROM v_ventas_resumen WHERE fecha = CURDATE();

-- Top 10 productos más vendidos del mes
SELECT * FROM v_top_productos LIMIT 10;

-- Productos con stock crítico
SELECT * FROM v_productos_stock WHERE estado_stock IN ('agotado', 'critico') ORDER BY stock_actual ASC;

-- Resumen de facturación por estado
SELECT
    estado,
    COUNT(*)       AS cantidad,
    SUM(total)     AS total_acumulado,
    AVG(total)     AS promedio
FROM facturas
GROUP BY estado;

-- Movimientos de inventario del día
SELECT * FROM v_movimientos_completos
WHERE DATE(creado_en) = CURDATE()
ORDER BY creado_en DESC;

-- Ventas por vendedor del mes actual
SELECT
    u.nombre        AS vendedor,
    COUNT(v.id_venta) AS num_ventas,
    SUM(v.total)    AS total_vendido,
    AVG(v.total)    AS ticket_promedio
FROM ventas v
JOIN usuarios u ON v.id_usuario = u.id_usuario
WHERE MONTH(v.fecha) = MONTH(CURDATE())
  AND YEAR(v.fecha) = YEAR(CURDATE())
  AND v.estado = 'completada'
GROUP BY u.id_usuario, u.nombre
ORDER BY total_vendido DESC;

-- Auditoría de las últimas 50 acciones
SELECT
    a.creado_en,
    a.accion,
    a.tabla,
    u.nombre AS usuario,
    r.nombre AS rol,
    a.ip_address
FROM auditoria a
JOIN usuarios u ON a.id_usuario = u.id_usuario
JOIN roles r    ON u.id_rol = r.id_rol
ORDER BY a.creado_en DESC
LIMIT 50;
