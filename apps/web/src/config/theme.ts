/**
 * Multi-Tenant White-Labeling Theme Configuration
 * Default Tenant Theme: Bee Novelty (Vibrant Yellow #FACC15 & Sky Blue #3B82F6)
 */

export interface ThemeConfig {
  appName: string;
  companyLogo: string;
  primaryColor: string;
  secondaryColor: string;
  supportEmail?: string;
  footerText?: string;
}

export const defaultThemeConfig: ThemeConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Bee Novelty Vending",
  companyLogo:
    process.env.NEXT_PUBLIC_COMPANY_LOGO || "/assets/bee-novelty-logo.svg",
  primaryColor: process.env.NEXT_PUBLIC_PRIMARY_COLOR || "#FACC15",
  secondaryColor: process.env.NEXT_PUBLIC_SECONDARY_COLOR || "#3B82F6",
  supportEmail:
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@beenovelty.com",
  footerText:
    process.env.NEXT_PUBLIC_FOOTER_TEXT ||
    `© ${new Date().getFullYear()} Bee Novelty Vending SaaS. All rights reserved.`,
};

/**
 * Hook or helper to resolve tenant-specific dynamic branding
 */
export function getTenantBranding(
  tenantThemeConfig?: Partial<ThemeConfig> | null
): ThemeConfig {
  if (!tenantThemeConfig) {
    return defaultThemeConfig;
  }

  return {
    appName: tenantThemeConfig.appName || defaultThemeConfig.appName,
    companyLogo:
      tenantThemeConfig.companyLogo || defaultThemeConfig.companyLogo,
    primaryColor:
      tenantThemeConfig.primaryColor || defaultThemeConfig.primaryColor,
    secondaryColor:
      tenantThemeConfig.secondaryColor || defaultThemeConfig.secondaryColor,
    supportEmail:
      tenantThemeConfig.supportEmail || defaultThemeConfig.supportEmail,
    footerText:
      tenantThemeConfig.footerText || defaultThemeConfig.footerText,
  };
}

export default defaultThemeConfig;
