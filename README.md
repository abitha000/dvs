# DVS Clinic — Plain HTML + Tailwind CDN

Static site for **Dhandapani Siddha Vaithiya Salai** with a Vercel serverless function for the booking form (Nodemailer → karjr002@gmail.com).

## Structure
```
dvs-clinic/
├── index.html          # Whole site (Tailwind via CDN, vanilla JS)
├── assets/dvs-logo.jpg # Clinic logo
├── api/book.js         # Vercel serverless function (Nodemailer)
├── package.json
└── vercel.json
```

## Deploy on Vercel
1. Push this folder to a GitHub repo (or drag-drop into Vercel).
2. In **Vercel → Project → Settings → Environment Variables**, add:
   - `SMTP_HOST` = `smtp.gmail.com`
   - `SMTP_PORT` = `465`
   - `SMTP_USER` = your Gmail address
   - `SMTP_PASS` = **Gmail App Password** (Google Account → Security → 2-Step Verification → App passwords)
   - `FROM_EMAIL` = same as `SMTP_USER`
   - `TO_EMAIL` = `karjr002@gmail.com`
3. Click **Deploy**. Vercel auto-installs `nodemailer` and serves `/api/book` as a serverless function.

## Local preview
Just open `index.html` in a browser. The form will only work end-to-end after deploy (it needs `/api/book`).
