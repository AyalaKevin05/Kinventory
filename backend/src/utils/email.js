// utils/email.js — Servicio de correo
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: process.env.MAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const enviarAlertaStockBajo = async ({ destinatario, empresa, productos }) => {
  const filas = productos.map(p => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #2E2E2E;">${p.codigo}</td>
      <td style="padding:8px;border-bottom:1px solid #2E2E2E;">${p.nombre}</td>
      <td style="padding:8px;border-bottom:1px solid #2E2E2E;color:#FF6B35;font-weight:bold;">${p.stock_actual}</td>
      <td style="padding:8px;border-bottom:1px solid #2E2E2E;">${p.stock_minimo}</td>
      <td style="padding:8px;border-bottom:1px solid #2E2E2E;color:#EF4444;">${p.estado_stock.toUpperCase()}</td>
    </tr>
  `).join('');

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'Kinventory <noreply@kinventory.com>',
    to: destinatario,
    subject: `⚠️ Alerta Stock Bajo — ${empresa}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#1A1A1A;color:#F5F5F5;padding:2rem;border-radius:8px;max-width:700px;">
        <div style="display:flex;align-items:center;margin-bottom:1.5rem;">
          <span style="font-size:1.8rem;font-weight:900;color:#FF6B35;">K</span>
          <span style="font-size:1.8rem;font-weight:400;color:#F5F5F5;">inventory</span>
        </div>
        <h2 style="color:#FF6B35;margin-bottom:0.5rem;">⚠️ Alerta de Stock Bajo</h2>
        <p style="color:#A0A0A0;">Los siguientes productos de <strong style="color:#F5F5F5;">${empresa}</strong> requieren reposición:</p>
        <table style="width:100%;border-collapse:collapse;margin-top:1rem;background:#242424;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#FF6B35;">
              <th style="padding:10px;text-align:left;font-size:0.8rem;">CÓDIGO</th>
              <th style="padding:10px;text-align:left;font-size:0.8rem;">PRODUCTO</th>
              <th style="padding:10px;text-align:left;font-size:0.8rem;">STOCK ACTUAL</th>
              <th style="padding:10px;text-align:left;font-size:0.8rem;">STOCK MÍNIMO</th>
              <th style="padding:10px;text-align:left;font-size:0.8rem;">ESTADO</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
        <p style="color:#5A5A5A;font-size:0.8rem;margin-top:2rem;">Este es un mensaje automático de Kinventory. No responder.</p>
      </div>
    `,
  });
};

const enviarBienvenida = async ({ destinatario, nombre, empresa, contrasena_temporal }) => {
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: destinatario,
    subject: `Bienvenido a Kinventory — ${empresa}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;background:#1A1A1A;color:#F5F5F5;padding:2rem;border-radius:8px;max-width:600px;">
        <div style="margin-bottom:1.5rem;">
          <span style="font-size:2rem;font-weight:900;color:#FF6B35;">K</span>
          <span style="font-size:2rem;font-weight:400;color:#F5F5F5;">inventory</span>
        </div>
        <h2>Hola, ${nombre} 👋</h2>
        <p style="color:#A0A0A0;">Tu cuenta en <strong style="color:#F5F5F5;">${empresa}</strong> ha sido creada.</p>
        <div style="background:#242424;padding:1rem;border-radius:8px;border-left:4px solid #FF6B35;margin:1rem 0;">
          <p><strong>Correo:</strong> ${destinatario}</p>
          <p><strong>Contraseña temporal:</strong> <code style="color:#FF6B35;">${contrasena_temporal}</code></p>
        </div>
        <p style="color:#A0A0A0;">Por seguridad, cambia tu contraseña al iniciar sesión.</p>
      </div>
    `,
  });
};

module.exports = { enviarAlertaStockBajo, enviarBienvenida };
