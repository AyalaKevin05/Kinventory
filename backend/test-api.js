async function testApi() {
  try {
    const loginReq = await fetch('https://kinventory-production.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: 'admin@kinventory.com', contrasena: 'Admin123!' })
    });
    const loginRes = await loginReq.json();
    
    if (!loginRes.ok) throw new Error(loginRes.mensaje);
    
    const token = loginRes.data.token;
    console.log('Login OK. Token:', token.substring(0, 20) + '...');

    const catReq = await fetch('https://kinventory-production.up.railway.app/api/proveedores', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const catRes = await catReq.json();

    console.log('catRes:', catRes);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testApi();
