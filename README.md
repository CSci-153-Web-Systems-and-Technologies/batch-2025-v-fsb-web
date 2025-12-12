# V-FSB Web
A modern Virtual Feedback & Suggestion Box (V-FSB) designed to collect, manage, and respond to feedback from students and staff. Built with Next.js, Supabase, TypeScript, and shadcn/ui, it provides both user and admin interfaces for seamless feedback submission, moderation, and analytics.

## ✨ Features

### For Everyone (Public Side)
- **Public Feedback Feed**
  - Cards showing title, category, description, author (or **Anonymous**), and submission date.
  - Optional **Admin response** section displayed on the card when published.
- **Social Interactions**
  - Per-user **like** and **dislike** reactions.
  - **Comments** per feedback item with support for multiple replies.
  - Comments posted by admins are clearly marked with an **“Admin”** badge.

### For Users (Students / Staff)
- **Submit Feedback**
  - Title, detailed description, category, and priority.
  - **Anonymous Mode**: toggle to hide the user’s name on the public feed and admin dashboard.
- **Secure Authentication**
  - Login via Supabase Auth (email/password and optionally Google).
- **Clean, Responsive UI**
  - Works on desktop and mobile.
  - Hover-to-expand sidebar with quick access to Home, Submit Feedback, and Account.

### For Admins
- **Admin Dashboard**
  - Status tabs: **Pending**, **In Progress**, **Published**, **Rejected**, and **All**.
  - Change status with one click (In Progress / Publish / Reject).
  - View who submitted each feedback (unless anonymous).
- **Respond to Feedback**
  - Built-in **Respond** dialog to write an official response.
  - Option to show the response on the public feed.
  - If the user is not anonymous, admins can also respond via email (via `mailto:` link including title, description, and response).
- **Analytics**
  - Overview of total submissions, response rate, and anonymous rate.
  - Category distribution.
  - Priority distribution (e.g. Low / Medium / Critical).
  - Recent activity list.

### Role-Based Access
- **User Role**
  - Can view the public feed, react, comment, and submit feedback.
- **Admin Role**
  - Access to the Admin Dashboard and Analytics.
  - Can change status and respond to feedback.
- **Role-Aware Sidebar**
  - Users: Home, Submit Feedback, Account.
  - Admins: Home, Dashboard, Account.
- **Middleware Protection**
  - Guards `/dashboard` and `/feedback/*` routes based on authentication and role.
  - Redirects logged-in users away from `/login` / `/signup`.

---

## 🚀 Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript
- **Backend & Auth:** Supabase (PostgreSQL, Auth)
- **Styling:** Tailwind CSS with shadcn/ui (Radix-based components)
- **Icons:** lucide-react
- **Data Visualization (Admin Analytics):** Recharts
- **Deployment:** Vercel (recommended)

---

## 📋 Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** installed
- A **Supabase** account and project
- **Git** installed on your machine

---

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/CSci-153-Web-Systems-and-Technologies/batch-2025-v-fsb-web.git
cd batch-2025-v-fsb-web
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Environment Setup

Create a `.env.local` file in the project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

If you use any additional keys (e.g. service role on the server only), configure them as well in your deployment environment.

---

## 🗄️ Supabase Setup

V-FSB requires four main tables: `profiles`, `feedback`, `feedback_reactions`, and `feedback_comments`.

### Profiles Table

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'user'
    check (role in ('user', 'admin')),
  created_at timestamptz default now()
);
```

Set your admin user by updating the `role` column:

```sql
update public.profiles
set role = 'admin'
where email = 'your-admin-email@example.com';
```

### Feedback Table

```sql
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  title text not null,
  description text not null,
  category text not null,
  priority text not null,
  status text not null default 'pending',
  is_anonymous boolean not null default false,
  response_text text,
  response_visible_public boolean default false,
  responded_at timestamptz,
  created_at timestamptz default now()
);
```

### Feedback Reactions Table

```sql
create table public.feedback_reactions (
  feedback_id uuid references public.feedback(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz default now(),
  primary key (feedback_id, user_id)
);
```

### Feedback Comments Table

```sql
create table public.feedback_comments (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid references public.feedback(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  content text not null,
  created_at timestamptz default now()
);
```

### Optional: Comment Count Helper

```sql
create or replace function public.feedback_comment_counts(feedback_ids uuid[])
returns table (feedback_id uuid, count bigint)
language sql
as $$
  select feedback_id, count(*)::bigint
  from feedback_comments
  where feedback_id = any(feedback_ids)
  group by feedback_id;
$$;
```

### Row Level Security (RLS)

Enable RLS on all custom tables and add policies appropriate to your use-case, for example:

```sql
alter table public.profiles enable row level security;

create policy "allow_user_self_insert"
on public.profiles
as permissive
for insert
to public
with check (auth.uid() = id);
```

You should also add policies for `feedback`, `feedback_reactions`, and `feedback_comments` so that:
- Users can insert their own feedback, reactions, and comments.
- Admins can read and manage all feedback.

---

## 🏃‍♂️ Running the Application

### Start the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Then open your browser at:

```text
http://localhost:3000
```

---

## 📖 Usage

### For Users

- **Sign In:** Visit `/login` and log in with email or Google (if enabled).
- **View Feed:** Browse the public feedback on the home page.
- **Submit Feedback:** Use the **Submit Feedback** button in the sidebar to open the dialog and send feedback (optionally anonymous).
- **React & Comment:**
  - Like/dislike feedback once per user.
  - Open comments to see discussion and post your own reply.

### For Admins

- **Admin Role:** Ensure your profile `role` is set to `'admin'` in the `profiles` table.
- **Dashboard:** Access `/dashboard` to see all feedback grouped by status.
- **Manage Feedback:**
  - Change status to In Progress, Published, or Rejected.
  - Open the Respond dialog to add an official response.
- **Public Response:**
  - Mark responses as public to show them on the public feed.
  - Optionally reply by email for non-anonymous submissions.
- **Analytics:**
  - View counts by category and priority.
  - See trends and recent activity.

---

## 📁 Project Structure

```txt
batch-2025-v-fsb-web/
├── app/
│   ├── (auth)/             # Login / auth-related pages
│   ├── (main)/             # Home (public feed), dashboard, settings
│   ├── layout.tsx          # Root layout with sidebar
│   └── page.tsx            # Home page (public feed)
├── components/
│   ├── public-feed.tsx     # Public feed with reactions and comments
│   ├── submit-feedback-dialog.tsx
│   ├── admin-dashboard.tsx # Admin dashboard + status tabs + respond dialog
│   ├── admin-analytics.tsx # Admin analytics view
│   ├── sidebar.tsx         # Role-aware hover sidebar
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── supabaseClient.ts   # Browser Supabase client
│   └── supabaseServer.ts   # Server Supabase client
├── middleware.ts           # Role-based route protection
└── public/
    └── v-fsb_icon.svg      # App icon / logo
```

---

## 🔧 Configuration

### Environment Variables

| Variable                      | Description                      | Required |
| ---------------------------- | -------------------------------- | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`   | Your Supabase project URL        | Yes      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key   | Yes      |
| `NEXT_PUBLIC_SITE_URL`       | Base URL of the app              | Yes      |

Set these in `.env.local` for local development and in your deployment platform (e.g. Vercel) for production.

---

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub (or GitLab/Bitbucket).
2. Create a new project in **Vercel** and connect the repository.
3. Add the environment variables in the Vercel dashboard.
4. Deploy the project.

Vercel will automatically build and host the Next.js app.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch:  
   `git checkout -b feature-name`
3. Commit your changes:  
   `git commit -m "Add some feature"`
4. Push to the branch:  
   `git push origin feature-name`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**.  
See the `LICENSE` file for more details.

---

## 🙏 Acknowledgments

- **Next.js** for the React framework
- **Supabase** for the backend, database, and auth
- **shadcn/ui** for beautiful UI components
- **Tailwind CSS** for utility-first styling
- **lucide-react** for icons

---

## 📞 Support

If you encounter issues or have questions, please open an issue in the repository or contact the maintainer of this project.

Made with ❤️ for students, staff, and administrators who believe in continuous feedback.