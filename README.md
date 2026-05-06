# 🅺inventory — Sistema Profesional de Inventario y Ventas

## Stack tecnológico
- **Frontend:** React 18 + React Router 6 + Recharts + react-hot-toast
- **Backend:** Node.js + Express + MySQL2 + JWT + bcryptjs + Nodemailer
- **Base de datos:** MySQL 8.0+
- **Paleta:** Grafito profundo `#111111` + Naranja ejecutivo `#FF6B35`

---

## 🗂️ Estructura del proyecto

```
kinventory/
├── database/
│   ├── schema.sql      # 13 tablas + triggers + vistas + índices
│   ├── seed.sql        # Datos iniciales
│   └── queries.sql     # Procedimientos almacenados + consultas
│
├── backend/
│   └── src/
│       ├── config/db.js
│       ├── utils/         jwt · response · email
│       ├── services/      authService
│       ├── controllers/   auth · productos · ventas · inventario · facturas · catalogos · reportes
│       ├── middleware/     auth (autenticado · soloAdmin · soloAlmacenista · requiereRol · auditar)
│       ├── routes/        index.js (registro central)
│       └── server.js      Express + Helmet + CORS + Rate Limiting
│
└── frontend/
    └── src/
        ├── context/       AuthContext · ThemeContext (modo claro/oscuro)
        ├── services/      api.js (todos los endpoints)
        ├── components/
        │   ├── common/    KiLogo · Btn · Input · Select · Modal · Skeleton · StatCard · EmptyState
        │   └── admin/     AdminLayout (sidebar colapsable)
        └── pages/
            ├── Login.jsx
            ├── admin/     Dashboard · Productos · Ventas · Inventario · Facturas · Clientes · Reportes · Configuracion
            ├── vendedor/  POS.jsx  ← interfaz tipo supermercado
            └── almacenista/ Bodega.jsx ← panel de bodega
```

---

## 👥 Las 3 interfaces por rol

### 🟠 Administrador → `/admin/*`
Dashboard completo con KPIs, gráficos de línea y barras, top productos, alertas de stock. CRUD de productos con paginación, búsqueda y filtros. Historial de ventas cancelable. Control de facturas con impresión directa. Gestión de inventario y movimientos. Clientes, reportes por vendedor, auditoría del sistema y exportación CSV.

### 🧾 Vendedor → `/pos`
Interfaz POS tipo D1/Ara/Éxito. Búsqueda instantánea por nombre, código o código de barras. Grid de productos filtrable por categoría. Carrito con ajuste de cantidades. Selección de cliente y método de pago (efectivo, Nequi, Daviplata, tarjeta, transferencia). Totales con IVA calculado automáticamente. Factura generada automáticamente al confirmar.

### 🏭 Almacenista → `/bodega`
Panel de bodega con estadísticas de inventario. Registro de entradas (compra, devolución, ajuste, traslado). Registro de salidas (reposición, baja, ajuste, traslado). Ajuste manual de stock con motivo. Historial completo de movimientos con filtros. Vista de todos los productos con estado de stock.

---

## ⚙️ Instalación

### Base de datos
```bash
mysql -u root -p -e "CREATE DATABASE kinventory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p kinventory < database/schema.sql
mysql -u root -p kinventory < database/seed.sql

# Generar hashes de contraseñas
cd backend && npm install
node -e "const b=require('bcryptjs'); ['Admin123!','Vend123!','Alma123!'].forEach(p => console.log(p+':', b.hashSync(p,10)));"

# Actualizar contraseñas
mysql -u root -p kinventory -e "
UPDATE usuarios SET contrasena='HASH_ADMIN' WHERE correo='admin@kinventory.com';
UPDATE usuarios SET contrasena='HASH_VEND'  WHERE correo='vendedor@kinventory.com';
UPDATE usuarios SET contrasena='HASH_ALMA'  WHERE correo='almacenista@kinventory.com';
"
```

### Backend
```bash
cd backend
cp .env.example .env   # Editar con credenciales MySQL
npm run dev            # → http://localhost:3001
```

### Frontend
```bash
cd frontend
cp .env.example .env   # REACT_APP_API_URL=http://localhost:3001/api
npm install
npm start              # → http://localhost:3000
```

---

## 🔐 Credenciales de prueba

| Rol | Correo | Contraseña | Ruta |
|---|---|---|---|
| Administrador | admin@kinventory.com | Admin123! | /admin/dashboard |
| Vendedor | vendedor@kinventory.com | Vend123! | /pos |
| Almacenista | almacenista@kinventory.com | Alma123! | /bodega |
