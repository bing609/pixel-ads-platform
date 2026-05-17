# Pixel Ads Platform 🎯

Full-stack web application untuk platform iklan mini berbasis grid pixel. Pengguna dapat memilih blok kosong, mengupload logo/gambar, melakukan pembayaran via PayPal, dan gambar akan tampil di blok tersebut setelah verifikasi pembayaran.

## 🚀 Features

- **Grid Pixel Ads**: Area iklan 800x800px yang dibagi menjadi blok-blok kecil yang dapat dikonfigurasi
- **Magnifier Tool**: Kaca pembesar untuk zoom on hover dengan performa tinggi
- **PayPal Integration**: Integrasi pembayaran PayPal dengan webhook verification
- **Admin Dashboard**: Manajemen lengkap grid, user, transaksi, dan banner iklan
- **User Dashboard**: Manajemen iklan pribadi, riwayat pembayaran, dan statistik
- **Security**: JWT authentication, CSRF protection, payment verification, rate limiting
- **Responsive Design**: Mobile-friendly dengan fallback untuk touch devices
- **Image Optimization**: Kompresi otomatis dan CDN integration via Cloudinary
- **Caching**: Redis cache untuk performa tinggi

## 📋 Tech Stack

### Frontend
- React.js / Next.js
- TailwindCSS
- Framer Motion (animasi)
- Axios (HTTP client)

### Backend
- Node.js + Express.js
- PostgreSQL (database relasional)
- Redis (caching)
- PayPal REST API
- Cloudinary (image storage & CDN)

### Deployment
- Docker & Docker Compose (development)
- Vercel/Render/Railway (production)

## 🛠️ Installation

### Prerequisites
- Node.js >= 16
- PostgreSQL >= 12
- Redis >= 6
- Docker & Docker Compose (optional)

### Setup Lokal

1. **Clone repository**
   ```bash
   git clone https://github.com/bing609/pixel-ads-platform.git
   cd pixel-ads-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env dengan konfigurasi lokal Anda
   ```

4. **Buat database dengan Docker (opsional)**
   ```bash
   docker-compose up -d
   ```

   Atau setup PostgreSQL & Redis secara manual.

5. **Jalankan migrasi database**
   ```bash
   npm run db:migrate
   npm run db:seed  # Opsional: tambah data dummy
   ```

6. **Jalankan development server**
   ```bash
   npm run dev
   ```
   - Backend: http://localhost:5000
   - Frontend: http://localhost:3000

## 📱 Project Structure

```
pixel-ads-platform/
├── server/
│   ├── config/                 # Konfigurasi (database, payment, etc)
│   ├── controllers/            # Business logic
│   ├── routes/                 # API routes
│   ├── middleware/             # Custom middleware (auth, validation, etc)
│   ├── services/               # External services (PayPal, Cloudinary, etc)
│   ├── database/
│   │   ├── migrations/         # Database migrations
│   │   ├── seeds/              # Database seeders
│   │   └── schema.sql          # Database schema
│   ├── utils/                  # Utility functions
│   ├── validators/             # Input validation schemas
│   └── index.js                # Entry point
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Grid/           # Grid pixel & magnifier components
│   │   │   ├── Dashboard/      # Admin & user dashboard components
│   │   │   ├── Auth/           # Login & register components
│   │   │   └── Common/         # Reusable components
│   │   ├── pages/              # Page components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API client services
│   │   ├── context/            # React context (auth, theme, etc)
│   │   ├── styles/             # Global styles
│   │   └── App.jsx
│   └── package.json
├── .env.example
├── docker-compose.yml
└── package.json
```

## 🔐 Security Features

- **JWT Authentication**: Token-based authentication dengan refresh tokens
- **Password Hashing**: Bcrypt untuk hashing password
- **CSRF Protection**: Double-submit cookie pattern
- **Rate Limiting**: Protect API dari abuse
- **Input Validation**: Validasi semua input user
- **SQL Injection Prevention**: Prepared statements & parameterized queries
- **XSS Prevention**: Sanitasi output & CSP headers
- **PayPal Webhook Verification**: Server-side signature validation
- **HTTPS**: Wajib di production
- **Secure Cookies**: HttpOnly, Secure, SameSite flags

## 💳 PayPal Integration

### Testing dengan Sandbox

1. Buat akun di [PayPal Developer](https://developer.paypal.com)
2. Dapatkan Client ID dan Secret dari Sandbox app
3. Set `PAYPAL_MODE=sandbox` di `.env`
4. Update `PAYPAL_CLIENT_ID` dan `PAYPAL_SECRET`

### PayPal Webhook Setup

1. Di PayPal Dashboard, buat webhook dengan URL: `https://yourdomain.com/api/paypal/webhook`
2. Pilih event: `PAYMENT.CAPTURE.COMPLETED`
3. Copy Webhook ID ke `PAYPAL_WEBHOOK_ID` di `.env`
4. Webhook verification dilakukan server-side setelah menerima event

## 📊 Database Schema

Lihat `server/database/schema.sql` untuk skema lengkap. Tabel utama:

- **users**: User registration & authentication
- **blocks**: Grid blocks (occupied, empty, pending)
- **transactions**: Payment history & order tracking
- **images**: Image metadata & storage info
- **banners**: Advertisement banners
- **admin_logs**: Audit logs untuk admin actions

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- server/controllers/__tests__/auth.test.js

# Run with coverage
npm test -- --coverage
```

## 📈 Performance Optimization

1. **Grid Rendering**: Background-position untuk magnifier, bukan regenerasi DOM
2. **Caching**: Redis cache untuk grid status & user data
3. **Image Optimization**: Sharp untuk resize & WebP conversion
4. **CDN**: Cloudinary untuk image delivery dengan automatic optimization
5. **Database Indexing**: Indexes pada frequently queried columns
6. **Pagination**: Limit query results untuk large datasets

## 🚀 Deployment

### Vercel (Frontend)
```bash
cd client
npm run build
vercel deploy
```

### Railway/Render (Backend)
```bash
# Create account di Railway atau Render
# Connect GitHub repository
# Set environment variables
# Deploy
```

### Database Migration (Production)
```bash
# Update DATABASE_URL dengan production database
npm run db:migrate
```

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register user baru
- `POST /api/auth/login` - Login dengan email & password
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout

### Grid & Block Endpoints
- `GET /api/blocks` - Get semua blocks dengan status
- `GET /api/blocks/:id` - Get detail block
- `POST /api/blocks/:id/reserve` - Reserve block sementara
- `POST /api/blocks/:id/purchase` - Buat PayPal order

### PayPal Endpoints
- `POST /api/paypal/create-order` - Create PayPal order
- `POST /api/paypal/webhook` - PayPal webhook handler (server-to-server)

### Admin Endpoints
- `GET /api/admin/dashboard` - Dashboard statistics
- `PUT /api/admin/config` - Update grid configuration
- `GET /api/admin/users` - List all users
- `DELETE /api/admin/blocks/:id` - Clear block

Lihat `server/routes/` untuk dokumentasi endpoint lengkap.

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Pastikan PostgreSQL running
# Check DATABASE_URL di .env
# Verify credentials
```

### PayPal Webhook Not Received
```bash
# 1. Verify webhook URL accessible dari internet
# 2. Check PAYPAL_WEBHOOK_ID di PayPal dashboard
# 3. Verify signature validation logic
# 4. Check server logs untuk error details
```

### Grid Rendering Slow
```bash
# 1. Verify Redis cache enabled
# 2. Check database indexes
# 3. Monitor network latency
# 4. Use Chrome DevTools untuk performance profiling
```

## 📄 License

MIT License - Lihat LICENSE file untuk details.

## 🤝 Contributing

Contributions welcome! Silakan buat pull request atau report issues.

## 📞 Support

Untuk pertanyaan atau issue, buat GitHub issue atau contact tim development.
