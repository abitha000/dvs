// Vercel Serverless Function — sends consultation requests via Nodemailer
// Required env vars (set in Vercel Project Settings → Environment Variables):
//   SMTP_HOST       e.g. smtp.gmail.com
//   SMTP_PORT       e.g. 465
//   SMTP_USER       e.g. your-gmail@gmail.com
//   SMTP_PASS       Gmail App Password (not your normal password)
//   TO_EMAIL        karjr002@gmail.com
//   FROM_EMAIL      same as SMTP_USER (or a verified sender)
const nodemailer = require('nodemailer');

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 mins
const RATE_LIMIT_MAX = 5;

const ipStore = new Map();

module.exports = async (req, res) => {
if (req.method !== 'POST') {
return res.status(405).json({ error: 'Method not allowed' });
}

if (!req.headers['content-type']?.includes('application/json')) {
return res.status(400).json({
error: 'Content-Type must be application/json'
});
}

try {
const ip =
req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
req.socket?.remoteAddress ||
'unknown';

const now = Date.now();

if (ipStore.has(ip)) {
  const data = ipStore.get(ip);

  if (now - data.firstRequest < RATE_LIMIT_WINDOW) {
    if (data.count >= RATE_LIMIT_MAX) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.'
      });
    }

    data.count += 1;
  } else {
    ipStore.set(ip, {
      count: 1,
      firstRequest: now
    });
  }
} else {
  ipStore.set(ip, {
    count: 1,
    firstRequest: now
  });
}

const b = req.body || {};

const name = String(b.name || '').trim();
const email = String(b.email || '').trim().toLowerCase();
const phone = String(b.phone || '').trim();
const concern = String(b.concern || '').trim();

const age = String(b.age || '').trim();
const gender = String(b.gender || '').trim();
const preferredDate = String(b.preferred_date || '').trim();
const preferredTime = String(b.preferred_time || '').trim();
const message = String(b.message || '').trim();

const turnstileToken = String(
  b.turnstileToken || ''
).trim();

if (
  !name ||
  !email ||
  !phone ||
  !concern ||
  !turnstileToken
) {
  return res.status(400).json({
    error: 'Missing required fields'
  });
}

if (
  name.length > 100 ||
  email.length > 200 ||
  phone.length > 30 ||
  concern.length > 200 ||
  message.length > 1000
) {
  return res.status(400).json({
    error: 'Field too long'
  });
}

const emailRegex =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!emailRegex.test(email)) {
  return res.status(400).json({
    error: 'Invalid email address'
  });
}

const phoneRegex =
  /^[0-9+\-\s()]{8,20}$/;

if (!phoneRegex.test(phone)) {
  return res.status(400).json({
    error: 'Invalid phone number'
  });
}

const turnstileResponse = await fetch(
  'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  {
    method: 'POST',
    headers: {
      'Content-Type':
        'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      secret:
        process.env.TURNSTILE_SECRET_KEY,
      response: turnstileToken,
      remoteip: ip
    })
  }
);

const turnstileResult =
  await turnstileResponse.json();

if (!turnstileResult.success) {
  return res.status(400).json({
    error: 'Turnstile verification failed'
  });
}

const transporter =
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(
      process.env.SMTP_PORT || 465
    ),
    secure:
      Number(
        process.env.SMTP_PORT || 465
      ) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

await transporter.verify();

const html = `
  <div style="font-family:Inter,Arial,sans-serif;color:#2A2A28;max-width:600px;margin:auto">
    <h2 style="font-family:Georgia,serif;color:#4F6E54">
      New Consultation Request — DVS Clinic
    </h2>

    <table cellpadding="8" style="border-collapse:collapse;width:100%;font-size:14px">
      <tr><td><b>Name</b></td><td>${escapeHtml(name)}</td></tr>
      <tr><td><b>Email</b></td><td>${escapeHtml(email)}</td></tr>
      <tr><td><b>Phone</b></td><td>${escapeHtml(phone)}</td></tr>
      <tr><td><b>Age</b></td><td>${escapeHtml(age || '—')}</td></tr>
      <tr><td><b>Gender</b></td><td>${escapeHtml(gender || '—')}</td></tr>
      <tr><td><b>Preferred Date</b></td><td>${escapeHtml(preferredDate || '—')}</td></tr>
      <tr><td><b>Preferred Time</b></td><td>${escapeHtml(preferredTime || '—')}</td></tr>
      <tr><td><b>Main Concern</b></td><td>${escapeHtml(concern)}</td></tr>
      <tr>
        <td valign="top"><b>Notes</b></td>
        <td>${escapeHtml(message || '—').replace(/\n/g, '<br>')}</td>
      </tr>
    </table>

    <p style="color:#6E6B63;font-size:12px;margin-top:24px">
      Sent from dvsclinic.com booking form
    </p>
  </div>
`;

await transporter.sendMail({
  from: `"DVS Clinic Bookings" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
  to:
    process.env.TO_EMAIL ||
    'karjr002@gmail.com',
  replyTo: email,
  subject: `New consultation — ${name.substring(
    0,
    50
  )} (${concern.substring(0, 50)})`,
  html
});

return res.status(200).json({
  ok: true,
  message: 'Consultation request sent successfully'
});

} catch (error) {
console.error(
'Booking API Error:',
error
);

return res.status(500).json({
  error: 'Failed to send email'
});

}
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}
