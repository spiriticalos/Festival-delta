# The Bohemians Festival — Site

Festival boutique de muzică electronică, Sfântu Gheorghe, Delta Dunării. 17–20 iunie 2026.
Organizat de **Cyclic Agency**.

---

## Instalare

```bash
npm install
cp .env.example .env
# Editează .env cu datele tale
```

## Rulare locală

```bash
npm start
```

- Site public: http://localhost:3000
- Admin panel: http://localhost:3000/admin

## Admin credentials

Configurate în fișierul `.env`:

```
ADMIN_USER=admin
ADMIN_PASS=changeme123
```

Schimbă parola înainte de deploy în producție.

> **Important pentru producție:** setează `NODE_ENV=production` în `.env` pentru a activa cookie-urile securizate (HTTPS only).

---

## Structura folderelor

```
/
├── public/              # Fișiere statice servite direct
│   ├── index.html       # Pagina principală
│   ├── css/style.css    # Design system + toate stilurile
│   ├── js/main.js       # Logică frontend (countdown, animații, API)
│   ├── images/          # Imagini statice
│   │   └── uploads/     # Upload-uri din admin (generate automat)
│   ├── robots.txt
│   └── sitemap.xml
├── admin/               # Pagini admin (servite doar prin Express, nu static)
│   ├── index.html       # Login
│   └── dashboard.html   # Dashboard cu 4 tab-uri
├── db.js                # Inițializare SQLite (better-sqlite3)
├── server.js            # Express server + toate rutele API
├── festival.db          # Baza de date SQLite (generată automat)
├── emails.txt           # Emailuri înregistrate (generate automat)
├── .env                 # Variabile de mediu (nu se commitează)
└── .env.example         # Template pentru .env
```

---

## Deploy pe VPS (Ubuntu/Debian)

### 1. Instalează Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Clonează și instalează

```bash
git clone <repo> /var/www/bohemians
cd /var/www/bohemians
npm install --production
cp .env.example .env
nano .env   # completează valorile reale
```

### 3. PM2 — proces persistent

```bash
npm install -g pm2
pm2 start server.js --name bohemians
pm2 save
pm2 startup
```

### 4. Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name thebohemiansociety.ro www.thebohemiansociety.ro;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. SSL cu Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d thebohemiansociety.ro -d www.thebohemiansociety.ro
```

---

## API Endpoints

| Metodă | Rută | Acces | Descriere |
|--------|------|-------|-----------|
| GET | /api/artists | Public | Lista artiști |
| GET | /api/gallery | Public | Toate imaginile galerie |
| GET | /api/gallery/:section | Public | Imagini filtrate pe secțiune |
| GET | /api/announcements/active | Public | Anunțuri active |
| GET | /api/settings | Public | Setări festival |
| POST | /api/subscribe | Public | Înregistrare email |
| POST | /api/artists | Admin | Adaugă artist |
| DELETE | /api/artists/:id | Admin | Șterge artist |
| POST | /api/gallery | Admin | Adaugă imagine |
| DELETE | /api/gallery/:id | Admin | Șterge imagine |
| POST | /api/announcements | Admin | Adaugă anunț |
| PATCH | /api/announcements/:id/toggle | Admin | Toggle activ/inactiv |
| DELETE | /api/announcements/:id | Admin | Șterge anunț |
| PATCH | /api/settings/:key | Admin | Actualizează setare |

---

Dezvoltat de Cyclic Agency · 2026
