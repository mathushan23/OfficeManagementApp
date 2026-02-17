# Office Management App

Monorepo projects:
- `backend/`: Laravel 12 API (PIN auth, roles, attendance, leave, task logs).
- `frontend/`: React + Vite + Tailwind CSS web frontend.

## Backend setup

```powershell
cd backend
php artisan migrate
php artisan db:seed
php artisan storage:link
php artisan serve
```

## Frontend setup

```powershell
cd frontend
npm install
npm run dev
```

Set frontend API URL if needed:
- `VITE_API_BASE_URL=http://127.0.0.1:8000/api`

## SMTP mail setup

Leave submission + leave approval/rejection mails are sent from backend.

1. Copy values from `backend/.env.example` mail section into `backend/.env`.
2. Set valid SMTP credentials:
   - `MAIL_MAILER=smtp`
   - `MAIL_HOST`
   - `MAIL_PORT`
   - `MAIL_USERNAME`
   - `MAIL_PASSWORD`
   - `MAIL_SCHEME=tls`
   - `MAIL_FROM_ADDRESS`
3. Clear cache after changes:

```powershell
cd backend
php artisan optimize:clear
```

## Default PIN users
- Boss PIN: `1`
- Attender PIN: `5`

Staff PIN is managed by Attender.
