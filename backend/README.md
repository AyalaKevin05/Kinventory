# ⚙️ Kinventory — Backend API

## Arquitectura

```
backend/src/
├── config/
│   └── db.js                    # Pool de conexiones MySQL2
├── utils/
│   ├── jwt.js                   # generarToken · refreshToken · verificar
│   ├── response.js              # Respuestas estandarizadas ok/error/creado
│   └── email.js                 # Alertas stock bajo + bienvenida usuarios
├── services/
│   └── authService.js           # Lógica: autenticar · registrar · cambiarContraseña · perfil
├── controllers/
│   ├── authController.js        # login · register · perfil · cambiarContraseña · refreshToken
│   ├── productosController.js   # CRUD + stockBajo + alertaEmail
│   ├── ventasController.js      # CRUD + transacción + dashboard + reportes
│   ├── inventarioController.js  # Movimientos + ajustes + resumen (Almacenista)
│   ├── facturasController.js    # CRUD + estados + resumen
│   ├── catalogosController.js   # Categorías · Proveedores · Clientes · Usuarios
│   └── reportesController.js    # Auditoría · ventas por vendedor · exportar
├── middleware/
│   └── auth.js                  # autenticado · soloAdmin · soloAlmacenista ·
│                                #  adminOAlmacenista · requiereRol([]) · auditar()
├── routes/
│   └── index.js                 # Registro central con protección por rol
└── server.js                    # Express + Helmet + CORS + Rate Limiting
```

## Protección de rutas por rol

| Rol | ID | Acceso |
|---|---|---|
| Administrador | 1 | Todo el sistema |
| Vendedor | 2 | POS (ventas), productos (solo ver), facturas propias |
| Almacenista | 3 | Inventario/movimientos, productos (solo ver) |

## Endpoints principales

### Auth
```
POST   /api/auth/login
POST   /api/auth/refresh
GET    /api/auth/perfil
PUT    /api/auth/contrasena
POST   /api/auth/register       (Admin)
```

### Dashboard (Admin/Vendedor)
```
GET    /api/dashboard/resumen
GET    /api/dashboard/top-productos    (Admin)
GET    /api/dashboard/ventas-mes       (Admin)
```

### Productos
```
GET    /api/productos
GET    /api/productos/stock-bajo       (Admin/Almacenista)
POST   /api/productos/alerta-stock     (Admin)
GET    /api/productos/:id
POST   /api/productos                  (Admin)
PUT    /api/productos/:id              (Admin)
DELETE /api/productos/:id              (Admin)
```

### Ventas (Admin/Vendedor)
```
GET    /api/ventas
GET    /api/ventas/:id
POST   /api/ventas
PATCH  /api/ventas/:id/cancelar        (Admin)
```

### Inventario (Admin/Almacenista)
```
GET    /api/inventario/movimientos
POST   /api/inventario/movimiento
POST   /api/inventario/ajuste
GET    /api/inventario/resumen
```

### Facturas
```
GET    /api/facturas/resumen           (Admin)
GET    /api/facturas
GET    /api/facturas/:id
PATCH  /api/facturas/:id/estado        (Admin)
```

### Reportes (Admin)
```
GET    /api/reportes/auditoria
GET    /api/reportes/ventas-por-vendedor
GET    /api/reportes/exportar-inventario
```

## Instalación

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con credenciales MySQL
npm run dev
```

## Generar contraseñas

```bash
node -e "
const b = require('bcryptjs');
console.log('Admin:',      b.hashSync('Admin123!', 10));
console.log('Vendedor:',   b.hashSync('Vend123!',  10));
console.log('Almacenista:',b.hashSync('Alma123!',  10));
"
```
