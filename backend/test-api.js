async function fixAndTest() {
  const BASE = 'https://kinventory-production.up.railway.app/api';

  // Paso 1: Llamar al endpoint de corrección
  console.log('Llamando endpoint de mantenimiento...');
  const fixReq = await fetch(`${BASE}/maintenance/fix-views`, {
    method: 'POST',
    headers: { 'x-maintenance-key': 'kinventory-fix-2024' }
  });
  const fixRes = await fixReq.json();
  console.log('fix-views:', fixRes);

  if (!fixRes.ok) {
    console.error('El servidor aún no está actualizado. Intenta de nuevo en 1-2 minutos.');
    return;
  }

  // Paso 2: Login
  const loginReq = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: 'admin@kinventory.com', contrasena: 'Admin123!' })
  });
  const loginRes = await loginReq.json();
  const token = loginRes.data.token;
  console.log('\nLogin OK');

  // Paso 3: Verificar endpoints
  for (const url of [`${BASE}/inventario/movimientos`, `${BASE}/inventario/resumen`, `${BASE}/productos/stock-bajo`]) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json();
    const path = url.replace(BASE, '');
    console.log(`\n${path}:`, j.ok ? `✅ OK (${JSON.stringify(j.data).substring(0, 80)}...)` : `❌ ${j.mensaje}`);
  }
}

fixAndTest();
