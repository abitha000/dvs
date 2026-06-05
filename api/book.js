// Vercel Serverless Function — sends consultation requests via Nodemailer
// Required env vars (set in Vercel Project Settings → Environment Variables):
//   SMTP_HOST       e.g. smtp.gmail.com
//   SMTP_PORT       e.g. 465
//   SMTP_USER       e.g. your-gmail@gmail.com
//   SMTP_PASS       Gmail App Password (not your normal password)
//   TO_EMAIL        karjr002@gmail.com
//   FROM_EMAIL      same as SMTP_USER (or a verified sender)

const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const b = req.body || {};
    const name    = String(b.name || '').trim();
    const email   = String(b.email || '').trim();
    const phone   = String(b.phone || '').trim();
    const concern = String(b.concern || '').trim();

    if (!name || !email || !phone || !concern) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (name.length > 100 || email.length > 200 || phone.length > 30 || concern.length > 200) {
      return res.status(400).json({ error: 'Field too long' });
    }

    const age       = b.age ? String(b.age) : '—';
    const gender    = b.gender || '—';
    const date      = b.preferred_date || '—';
    const time      = b.preferred_time || '—';
    const message   = (b.message || '').toString().slice(0, 1000) || '—';

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;color:#2A2A28;max-width:600px;margin:auto">
        <h2 style="font-family:Georgia,serif;color:#4F6E54">New Consultation Request — DVS Clinic</h2>
        <table cellpadding="8" style="border-collapse:collapse;width:100%;font-size:14px">
          <tr><td><b>Name</b></td><td>${escapeHtml(name)}</td></tr>
          <tr><td><b>Email</b></td><td>${escapeHtml(email)}</td></tr>
          <tr><td><b>Phone</b></td><td>${escapeHtml(phone)}</td></tr>
          <tr><td><b>Age</b></td><td>${escapeHtml(age)}</td></tr>
          <tr><td><b>Gender</b></td><td>${escapeHtml(gender)}</td></tr>
          <tr><td><b>Preferred date</b></td><td>${escapeHtml(date)}</td></tr>
          <tr><td><b>Preferred time</b></td><td>${escapeHtml(time)}</td></tr>
          <tr><td><b>Main concern</b></td><td>${escapeHtml(concern)}</td></tr>
          <tr><td valign="top"><b>Notes</b></td><td>${escapeHtml(message).replace(/\n/g,'<br>')}</td></tr>
        </table>
        <p style="color:#6E6B63;font-size:12px;margin-top:24px">Sent from dvsclinic.com booking form</p>
      </div>`;

    await transporter.sendMail({
      from: `"DVS Clinic Bookings" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: process.env.TO_EMAIL || 'karjr002@gmail.com',
      replyTo: email,
      subject: `New consultation — ${name} (${concern})`,
      html,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('book.js error', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
