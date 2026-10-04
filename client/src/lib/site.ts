export const SITE = {
  name: 'CV Creator Pro',
  operator: 'EL IBRAHIMI MOHAMED AMINE',
  location: 'Berrechid, Morocco',
  supportEmail: 'mohamedamineelibrahimi1@gmail.com',
  lastUpdated: 'October 4, 2026',
  plans: {
    pro: { monthly: 30, annual: 300 },
    premium: { monthly: 59.99, annual: 599.90 },
  },
} as const;

export const supportMailto = `mailto:${SITE.supportEmail}`;
