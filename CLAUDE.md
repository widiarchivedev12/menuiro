# CLAUDE.md

## Project overview

A SaaS web app that lets F&B businesses (cafes, restaurants, food stalls, bakeries) create a **digital menu** and share it via a public link and QR code.

**MVP user flow**
1. Sign up / log in
2. Fill in business profile + social media links
3. Add menu categories and menu items (with optional photos)
4. Choose 1 of 3 templates (Classic, Modern, Minimal)
5. Adjust the menu inside the template (live preview, simple theme options)
6. Save and publish, then share the link / QR code

**Business rule:** the first **5 users are free** (plan `free_testimonial`) and are used for marketing testimonials. Later signups get plan `waitlist` and cannot publish. This is enforced in the database (see `supabase/migrations/0001_init.sql`), not only in the UI.

## Language rules

| Area | Language |
|---|---|
| UI text, labels, error messages, emails, toasts | **Indonesian** |
| Code, variable names, DB tables/columns, file names, comments, commit messages | **English** |

- Keep all Indonesian UI strings in one place (`src/lib/i18n/id.ts`) instead of hardcoding them in components. This keeps multi-language support possible later.
- Currency is IDR, displayed as `Rp 25.000` (use `Intl.NumberFormat('id-ID')`). Store prices as integers.
- Use an informal-but-polite tone in UI copy (e.g. "Menu kamu sudah terbit!").

## Tech stack

- **Next.js** (App Router, TypeScript strict) + **Tailwind CSS**
- **Supabase**: Auth, Postgres, Storage (use `@supabase/ssr`)
- **Vercel** for deployment
- QR code: `qrcode` package. Image compression in the browser before upload.
- Validation: `zod`. Forms: `react-hook-form`.

## Architecture

```
Visitor (scan QR) -> /m/[slug] -> Next.js (ISR cache) -> Supabase (public read via RLS)
Owner             -> /dashboard -> Next.js + Supabase Auth -> DB + Storage
```

**Core principle: data is separate from templates.** A template is a pure React component that receives the same props. Switching templates never requires re-entering data.

```ts
type TemplateProps = {
  business: Business;
  socialLinks: SocialLink[];
  categories: (Category & { menuItems: MenuItem[] })[];
  theme: { primaryColor?: string; showImages?: boolean };
};
```

### Routes

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/login`, `/register` | Login / sign up |
| `/dashboard` | Overview, publish status, link + QR |
| `/dashboard/profil` | Business profile + social links |
| `/dashboard/menu` | Manage categories and items |
| `/dashboard/template` | Choose template + customize + live preview |
| `/m/[slug]` | **Public menu page** |

Auth routes are English (`/login`, `/register`); the dashboard routes keep Indonesian paths (user-facing URLs). Folder/component/function names stay English.

### Folder structure

```
src/
  app/
    (public)/m/[slug]/page.tsx
    (dashboard)/dashboard/...
    (auth)/login, register
  templates/
    index.ts                 # registry: { classic, modern, minimal }
    types.ts                 # TemplateProps
    classic/MenuClassic.tsx
    modern/MenuModern.tsx
    minimal/MenuMinimal.tsx
  components/                # shared UI
  lib/
    supabase/ (client.ts, server.ts)
    i18n/id.ts
    slug.ts, format-rupiah.ts, qr.ts, image-compress.ts
  types/                     # generated DB types + app types
supabase/
  migrations/
```

Adding a template = one new component + one line in `templates/index.ts` + one row in `public.templates`.

## Database

Source of truth: `supabase/migrations/`. Never edit the DB by hand without a migration.

| Table | Purpose |
|---|---|
| `profiles` | 1:1 with `auth.users`, holds `plan` |
| `businesses` | Business profile, `slug`, `template_key`, `theme`, `is_published` |
| `social_links` | Instagram, TikTok, GoFood, etc. (unique per platform per business) |
| `categories` | Menu categories with `sort_order` |
| `menu_items` | Items with integer `price`, `is_available`, `is_featured`, `image_path` |
| `templates` | Registry of available templates |

Rules:
- Table and column names: English, `snake_case`, plural table names.
- RLS is enabled on every table. Owners manage their own data; the public can only read **published** businesses.
- Publish rules (plan check, at least 1 category and 1 item) and the one-time slug change are enforced by DB triggers. The UI should show friendly Indonesian messages for the errors `plan_not_allowed_to_publish`, `menu_incomplete`, `slug_already_changed`.
- Store only file **paths** in the DB (e.g. `{business_id}/{uuid}.webp`), never full URLs.
- Regenerate types after each migration: `npx supabase gen types typescript --local > src/types/database.ts`
- Never use the service-role key in client code. Server-only, and only when truly needed.

## Feature rules

- **Slug:** auto-generated from business name, must be unique, editable **once**. Public URL: `/m/[slug]`.
- **Photos:** compress client-side (max ~1200px, WebP, under ~300 KB) before upload to bucket `menu-images`.
- **WhatsApp button:** `https://wa.me/{whatsapp_number}` (number stored as `62xxxxxxxxxx`; normalize `08xx` input).
- **Caching:** the public page uses ISR. Call `revalidatePath('/m/' + slug)` after every save or publish.
- **Mobile-first:** design and test at 375px width first. Public menu must load fast on weak connections.
- **Sold-out items** stay visible but are marked "Habis".

## Out of scope for MVP

Payments, ordering/POS, multi-branch, advanced analytics, custom domains. Do not build these unless asked.

## Build order

1. Scaffold Next.js + Tailwind + Supabase; run migration `0001_init.sql`
2. Auth (sign up / log in) and plan-aware dashboard shell
3. Business profile + social links wizard step
4. Category and menu item CRUD (photo upload, drag-and-drop ordering)
5. Public page `/m/[slug]` with **one** template (Classic)
6. Modern + Minimal templates, template picker, live preview, theme options
7. Publish flow, share link, QR download, WhatsApp button
8. Polish: loading/empty/error states, SEO + OG tags, real-phone testing

## Working conventions

- TypeScript strict, no `any`. Validate all external input with zod.
- Prefer Server Components; use Client Components only when interactivity requires it.
- Mutations through Server Actions (or route handlers), always re-checking auth server-side.
- Small, focused commits. Conventional commit style (`feat:`, `fix:`, `chore:`).
- Before finishing a task: run `npm run lint`, `npm run typecheck`, and `npm run build`.
- Ask before adding a new dependency or changing the DB schema outside a migration.

## Recommended skills (from skills.sh)

Install once in the project root (these commands are taken from the skills.sh listings; re-check the repo names on skills.sh if one fails):

```bash
# UI design quality (dashboard + the 3 templates)
npx skills add https://github.com/anthropics/skills --skill frontend-design

# React / Next.js performance (public menu page must be fast)
npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices

# Schema design, indexes, and RLS review
npx skills add https://github.com/supabase/agent-skills --skill supabase-postgres-best-practices

# Accessibility and UX audit before launch
npx skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines
```

| Skill | Use it when |
|---|---|
| `frontend-design` | Building dashboard screens and each template's visual design |
| `vercel-react-best-practices` | Writing or reviewing Next.js pages, data fetching, bundle size |
| `supabase-postgres-best-practices` | Changing migrations, queries, indexes, or RLS policies |
| `web-design-guidelines` | Auditing UI for accessibility and UX before shipping |
