# ❄️ RESOLVE ENGINE - MAINTENANCE MODE (FROZEN)

> **STATUS: FROZEN FOR WEBSITE-FIRST FOCUS**
> 
> **Active Delivery:** Website-first DIY appeal builder (£1.99)
> **Repo Status:** Reference Engine Only. No new app features.
> **Allowed Changes:** Bugfixes, Security Patches, Test Fixes Only.

This repository (`resolve-engine`) contains the core Strategy Engine, NotebookLM Contracts, and Enforcement Logic. It is currently frozen to allow the team to focus on the lightweight, website-first DIY service.

## 🛑 Contribution Rules
1. **No New Features**: Do not add UI features or expand the scope of this Next.js app.
2. **Infrastructure/DB Locked**: No migrations or infra changes allowed.
3. **PR Discipline**:
   - All PRs must target `staging`.
   - Squash & Merge only.
   - Delete branch after merge.
4. **Docs First**: If you are planning the website work, use the `docs/` folder here or the separate website repo.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## AI Working Method

Please read `docs/CONSTITUTION.md` and `docs/AI_WORKING_METHOD.md` before making changes to this codebase. We follow strict protocols for provenance, copy compliance, and step-by-step execution.

- **[Release Readiness](docs/RELEASE_READINESS.md)**: Current feature status.
- **[RC Checklist](docs/RELEASE_CANDIDATE.md)**: V1 Release procedures.
- **[Vertical Enablement](docs/VERTICAL_ENABLEMENT.md)**: Governance for new dispute types.
