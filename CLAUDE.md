# Trekker — Proje Bağlamı (Claude Code için)

Bu dosya, Claude Code oturumlarının proje geçmişini ve önceliklerini bilmesi için var.
Yeni bir Claude Code oturumuna başlarken bu dosyayı oku.

## Ürün Vizyonu

Lojistik firmaları için multi-tenant filo & sevkiyat yönetim platformu (backoffice panel).
Geliştiricinin (4,5+ yıl React/React Native deneyimi, restoran/hospitality SaaS geçmişi)
portfolyo projesi — hedef: 2026 sonuna kadar iş bulmak, günde 1-2 saat çalışma kapasitesi.

## Zaman Kısıtı — ÇOK ÖNEMLİ

Sınırlı zaman var. Kapsamı genişletme, "nice-to-have" önerme — sadece istenen adımı yap.
Ağır altyapı (PostGIS, self-hosted OSRM, RN sürücü app) bilinçli olarak ERTELENDİ.

## 6 Haftalık MVP Planı

1. Kurulum: Next.js+TS+Prisma+Postgres, CI, multi-tenant auth — [BU REPO, Hafta 1]
2. Araç/sürücü CRUD + validasyon + unit test
3. Basit rota: düz lat/lng + Leaflet (PostGIS YOK)
4. Dispatch tablosu (AG Grid) + temel dashboard
5. Deploy + Sentry + Playwright E2E (2-3 akış) + README
6. Demo videosu + LinkedIn/GitHub + BAŞVURULARA BAŞLA

Hafta 6 sonrası: sadece TEK flagship özellik (WebSocket real-time takip VEYA
zamanlanmış rapor gönderimi) — diğerleri GitHub Issues'da roadmap olarak kalsın.

## Teknoloji Kararları

- Next.js 15 App Router, TypeScript strict
- Prisma + PostgreSQL (şema: `prisma/schema.prisma`)
- Auth.js (NextAuth v5), JWT session, RBAC (ADMIN/DISPATCHER/DRIVER)
- TanStack Query + Zustand (Redux-Saga/Immutable.js KULLANMA — bilinçli modernizasyon kararı)
- Test: Vitest + RTL + Playwright

## Roller

Kullanıcı senden zaman zaman "product owner" (özellikleri küçük parçalara bölme,
kabul kriteri yazma) veya "designer" (UI/UX önerisi, component yapısı) gibi davranmanı
isteyebilir — bu ayrı bir araç kurulumu gerektirmez, doğrudan o rolde yanıt ver.
