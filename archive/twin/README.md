# Archived Service: Career Twin Engine

This directory contains the dormant implementation of the AI Career Twin.

## Why Archived
The AI Career Twin represents long-term strategic moat technology, designed for identity synthesis and multi-year career trajectory modeling. During the pre-PMF compression phase, this service has been decoupled to eliminate runtime complexity, simplify the onboarding flow, and keep developers laser-focused on the core job search/resume loop.

## Dependencies & Relations
*   **Database Schema**: Models like `CareerTwin`, `TwinMemory`, `TwinInsight`, `CareerTrajectory`, `OutcomePrediction`, `RecruiterInteraction`, `SkillGap`, `CareerSimulation`, and `TwinEvent` remain intact in `prisma/schema.prisma` to preserve database migrations and historical analytical data.
*   **Archived Code**:
    *   `archive/twin/career-twin.service.ts` (Core deterministic simulation & scoring)
    *   `archive/twin/components/CareerTwinClient.tsx` (Archived React dashboard component)

## Future Reactivation Requirements
To reactivate the Career Twin:
1.  **UI Exposure**: Move `archive/twin/components/CareerTwinClient.tsx` back to the active components directory. Add a page view in `app/(dashboard)/twin/page.tsx`.
2.  **Navigation Links**: Set `SHOW_TWIN = true` in both `components/layout/topbar.tsx` and `app/sitemap.ts` to expose the route to users and search engines.
3.  **API Mounts**: Re-enable endpoints at `/api/v1/twin` and `/api/v1/twin/simulate` to pipe client actions to the database via `career-twin.service.ts`.

## Removed Runtime Hooks
*   `journeyNav` navigation item in `components/layout/topbar.tsx` (filtered out).
*   Sitemap crawler target in `app/sitemap.ts` (filtered out).
*   Boot-level table validations in `scripts/validate-prisma.ts`.
