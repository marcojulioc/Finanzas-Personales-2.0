# 💰 Finanzas Personales 2.0

Aplicación web moderna de finanzas personales construida con Next.js 16, React 19, TypeScript y PostgreSQL.

## ✨ Características

- 🔐 Autenticación con NextAuth.js (Credenciales + Google OAuth)
- 💳 Gestión de múltiples cuentas bancarias y tarjetas de crédito
- 💱 Soporte para 28 monedas (América, Caribe, Europa)
- 📊 Presupuestos mensuales con alertas
- 🔄 Transacciones recurrentes automáticas
- 📱 PWA - Instalable en móvil y desktop
- 🎨 Categorías personalizables con iconos y colores
- 📈 Reportes y gráficos interactivos
- 🔔 Notificaciones in-app inteligentes
- 🌓 Dark mode

## 🚀 Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Auth**: NextAuth.js v5
- **UI Components**: shadcn/ui
- **Charts**: Recharts
- **Testing**: Vitest + Playwright
- **Deployment**: Railway

## 📚 Documentation

- Ver [PRD-MVP-Finanzas-Personales.md](./PRD-MVP-Finanzas-Personales.md) para especificaciones completas
- Ver [CLAUDE.md](./CLAUDE.md) para guía de desarrollo

## 🚢 Deploy

Esta aplicación está configurada para despliegue automático en Railway. Cada push a `master` activa un nuevo deploy.

## 📄 License

MIT
