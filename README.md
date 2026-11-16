# Forma – personal health & training journal

Forma is a web app I built for my own use. It keeps diet, calorie tracking, training, body measurements, progress photos and medical test results in one place, instead of spread across several apps, phone notes and spreadsheets.

**Live demo:** https://forma-health-tracker.lovable.app – sign in with the demo account `demo@example.com` / `FormaDemo2026`, or create your own account.

Anyone can create an account and use it with their own data. Every account sees only its own entries.

## Features

- **Daily dashboard** – today's calorie and macro targets (different for training and rest days), what has been eaten so far, the latest weight and the active training plan.
- **Diet plans** – macro targets for training and rest days, with a meal plan for each.
- **Fitatu import** – upload a screenshot from the Fitatu app and the calories and macros are read automatically by an AI vision model. A text report can be pasted instead.
- **Training** – text-based training plans and a session log. Exports from the Strong app can be pasted in and are parsed into exercises and sets.
- **Measurements** – weight, body circumferences, skinfold, sleep, steps and energy, with history, change over time and charts. Past data can be imported from an .xlsx or .csv file.
- **Progress photos** – grouped by date and tagged by angle and pose, including older photos.
- **Notes and medical results** – health notes and lab results with PDF or image attachments.
- **AI-readable report** – a private, read-only link that exposes the user's data as JSON, so an AI assistant such as ChatGPT can analyse it.
- Installable on the phone home screen (PWA).

## Tech stack

- TanStack Start (React 19, TypeScript, file-based routing, server functions)
- Tailwind CSS and shadcn/ui
- Supabase: PostgreSQL, Auth (email and Google sign-in), Storage
- Row-level security on every table and storage bucket, so each user can only read and write their own rows and files
- Recharts for charts, SheetJS for spreadsheet import, Zod for validation
- Built with AI-assisted development in Lovable

## Running locally

Requires Node.js 20+ and a Supabase project.

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`, then apply the SQL migrations from `supabase/migrations`.

## Author

Kamil Pietraszko
