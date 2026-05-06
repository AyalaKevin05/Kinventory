# 🗄️ Kinventory — Base de Datos MySQL

## Estructura

```
database/
├── schema.sql    # Tablas, triggers, vistas, índices
├── seed.sql      # Datos iniciales de prueba
└── queries.sql   # Consultas útiles + procedimientos almacenados
```

## Tablas del sistema

| Tabla | Descripción |
|---|---|
| `roles` | 3 roles: Administrador, Vendedor, Almacenista |
| `empresas` | Soporte multiempresa con configuración de IVA y branding |
| `sucursales` | Multisucursal por empresa |
| `usuarios` | Con avatar, último acceso y asignación a sucursal |
| `categorias` | Con color e ícono personalizables por empresa |
| `proveedores` | Con NIT, contacto y ciudad |
| `clientes` | Con tipo de documento, historial de compras acumulado |
| `productos` | Con código de barras, stock mín/máx, precio compra/venta, IVA |
| `ventas` | Múltiples métodos de pago, descuentos, estados |
| `detalle_venta` | Subtotal calculado automáticamente |
| `facturas` | Numeración automática `KI-001-000001` |
| `movimientos_inventario` | 9 tipos de movimiento — trazabilidad completa |
| `auditoria` | Log de todas las acciones con IP y datos anterior/nuevo |

## Triggers automáticos

- **`trg_after_detalle_insert`** — Descuenta stock y registra movimiento al crear venta
- **`trg_after_venta_insert`** — Actualiza total de compras del cliente
- **`trg_after_factura_insert`** — Genera número de factura único `KI-EMP-CONSECUTIVO`

## Vistas disponibles

- **`v_productos_stock`** — Estado de stock (normal/bajo/critico/agotado)
- **`v_ventas_resumen`** — Resumen diario de ventas por sucursal
- **`v_top_productos`** — Ranking de productos más vendidos
- **`v_movimientos_completos`** — Historial completo de inventario

## Procedimientos almacenados

- **`sp_registrar_venta`** — Venta completa con transacción, validación de stock y factura automática
- **`sp_movimiento_inventario`** — Movimiento de bodega con trazabilidad completa

## Instalación

```bash
# 1. Crear base de datos
mysql -u root -p -e "CREATE DATABASE kinventory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Ejecutar schema
mysql -u root -p kinventory < schema.sql

# 3. Cargar datos de prueba
mysql -u root -p kinventory < seed.sql

# 4. Generar contraseñas reales (en carpeta backend)
node -e "const b=require('bcryptjs'); console.log('Admin:', b.hashSync('Admin123!',10)); console.log('Vendedor:', b.hashSync('Vend123!',10)); console.log('Alma:', b.hashSync('Alma123!',10));"

# 5. Actualizar contraseñas en la BD
mysql -u root -p kinventory -e "
UPDATE usuarios SET contrasena='HASH_ADMIN' WHERE correo='admin@kinventory.com';
UPDATE usuarios SET contrasena='HASH_VENDEDOR' WHERE correo='vendedor@kinventory.com';
UPDATE usuarios SET contrasena='HASH_ALMA' WHERE correo='almacenista@kinventory.com';
"
```

## Credenciales de prueba (después de actualizar hashes)

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@kinventory.com | Admin123! |
| Vendedor | vendedor@kinventory.com | Vend123! |
| Almacenista | almacenista@kinventory.com | Alma123! |
