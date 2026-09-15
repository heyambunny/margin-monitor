// Role IDs come from the `roles` table: 1 = Admin, 2 = Finance, 3 = Supervisor.
//
// This mirrors the per-role tab structure the old Streamlit app enforced via
// st.tabs() in app.py. There, hiding a tab was enough - the Python backend
// was only ever called from the trusted Streamlit server process. Here the
// Next.js frontend calls the FastAPI backend directly from the browser, so
// this map is UI-level convenience only (nav + redirects); every route it
// describes is also enforced for real by the backend itself (each API route
// checks role_id server-side and returns 403 for a disallowed role).

export const ROLE_NAMES: Record<number, string> = {
  1: 'Admin',
  2: 'Finance',
  3: 'Supervisor',
};

export const ROLE_PAGES: Record<number, string[]> = {
  1: [
    '/dashboard',
    '/dashboard/reports',
    '/dashboard/clients',
    '/dashboard/bulk-upload',
    '/dashboard/audit-logs',
    '/dashboard/overview',
    '/dashboard/finance',
    '/dashboard/email-center',
  ],
  2: [
    '/dashboard/finance',
    '/dashboard/projections/add',
    '/dashboard/billing/convert',
    '/dashboard/billing',
    '/dashboard/reports',
    '/dashboard/projections/edit',
  ],
  3: [
    '/dashboard',
    '/dashboard/reports',
  ],
};

// Each role's default landing page - always a member of that role's ROLE_PAGES list.
export const ROLE_HOME: Record<number, string> = {
  1: '/dashboard',
  2: '/dashboard/finance',
  3: '/dashboard',
};

export function isPageAllowed(roleId: number | undefined | null, pathname: string): boolean {
  if (!roleId) return false;
  const pages = ROLE_PAGES[roleId];
  return Boolean(pages && pages.includes(pathname));
}

export function getHomeForRole(roleId: number | undefined | null): string {
  if (!roleId) return '/login';
  return ROLE_HOME[roleId] || '/dashboard';
}
