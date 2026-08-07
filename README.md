# FleetOps

Multi-tenant filo & sevkiyat yönetim platformu — lojistik sektöründe portfolyo projesi.

## Kapsam ve Yol Haritası

Bu repo, "6 haftalık gerçekçi MVP planı"nın Hafta 1 iskeletidir:
Next.js 15 (App Router) + TypeScript + Prisma + PostgreSQL + Auth.js (multi-tenant auth stub).

Detaylı yol haritası ve öncelikler için [`CLAUDE.md`](./CLAUDE.md) dosyasına bakın —
bu dosya aynı zamanda Claude Code için proje bağlamı sağlar.

## Kurulum

```bash
npm install
cp .env.example .env   # DATABASE_URL ve AUTH_SECRET'ı doldur
npx prisma migrate dev --name init
npm run dev
```

## Komutlar

- `npm run dev` — geliştirme sunucusu
- `npm run lint` / `npm run format` — kod kalitesi
- `npm run prisma:generate` / `npm run prisma:migrate` — veritabanı şeması

## Mimari Notlar

- **Multi-tenant:** `Tenant -> Depot -> Vehicle/Driver` hiyerarşisi (`prisma/schema.prisma`)
- **Auth:** `src/lib/auth.ts` — Credentials provider iskeleti, JWT'ye tenantId/role eklenmesi TODO
- **Rota/harita:** Hafta 3'te düz lat/lng + Leaflet ile başlanacak; PostGIS bilinçli olarak ertelendi
