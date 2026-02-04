/**
 * Auth Provider Factory
 *
 * Single entry point for obtaining an auth provider instance.
 * Reads configuration from environment and returns appropriate provider.
 */

import {
  AuthProvider,
  AuthProviderType,
  AuthProviderConfig
} from './types';

import { MockAuthProvider } from './providers/mock';
import { Auth0Provider } from './providers/auth0';
import { LoginGovProvider } from './providers/loginGov';

/**
 * Singleton provider instance
 */
let providerInstance: AuthProvider | null = null;

/**
 * Check if running in production environment
 */
function isProduction(): boolean {
  const env = process.env.NODE_ENV || process.env.VITE_MODE || '';
  return env.toLowerCase() === 'production';
}

/**
 * Detect provider type from environment
 *
 * SECURITY: In production, MOCK provider must be explicitly requested.
 * The system will NOT silently fall back to MOCK in production.
 */
function detectProviderType(): AuthProviderType {
  const inProduction = isProduction();

  // Check for explicit provider setting
  const providerOverride = process.env.AUTH_PROVIDER ||
    process.env.VITE_AUTH_PROVIDER;

  if (providerOverride) {
    switch (providerOverride.toLowerCase()) {
      case 'auth0':
        return AuthProviderType.AUTH0;
      case 'login_gov':
      case 'logingov':
        return AuthProviderType.LOGIN_GOV;
      case 'azure_ad':
      case 'azuread':
        return AuthProviderType.AZURE_AD;
      case 'okta':
        return AuthProviderType.OKTA;
      case 'mock':
        // SECURITY: Only allow explicit MOCK in production if also ALLOW_MOCK_AUTH=true
        if (inProduction && process.env.ALLOW_MOCK_AUTH !== 'true') {
          console.error('[Auth Factory] CRITICAL: Mock auth provider explicitly requested in production.');
          console.error('[Auth Factory] Set ALLOW_MOCK_AUTH=true to override (NOT RECOMMENDED).');
          throw new Error('Mock authentication is not allowed in production. Configure a real auth provider.');
        }
        return AuthProviderType.MOCK;
      default:
        // Unknown provider specified - don't silently fall back
        throw new Error(`Unknown auth provider: ${providerOverride}. Valid options: auth0, login_gov, azure_ad, okta, mock`);
    }
  }

  // Auto-detect based on available configuration
  if (process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID) {
    return AuthProviderType.AUTH0;
  }

  if (process.env.LOGIN_GOV_CLIENT_ID) {
    return AuthProviderType.LOGIN_GOV;
  }

  if (process.env.AZURE_AD_TENANT_ID && process.env.AZURE_AD_CLIENT_ID) {
    return AuthProviderType.AZURE_AD;
  }

  if (process.env.OKTA_DOMAIN && process.env.OKTA_CLIENT_ID) {
    return AuthProviderType.OKTA;
  }

  // SECURITY: In production, require explicit auth provider configuration
  if (inProduction) {
    console.error('[Auth Factory] CRITICAL: No auth provider configured in production environment.');
    console.error('[Auth Factory] Configure one of: AUTH0, LOGIN_GOV, AZURE_AD, or OKTA.');
    console.error('[Auth Factory] Set AUTH_PROVIDER env var or configure provider-specific credentials.');
    throw new Error('No authentication provider configured. Production requires a real auth provider.');
  }

  // Only in development: default to mock
  console.warn('[Auth Factory] WARNING: No auth provider configured. Using MOCK provider for development.');
  console.warn('[Auth Factory] This would fail in production. Configure a real auth provider before deploying.');
  return AuthProviderType.MOCK;
}

/**
 * Build provider configuration from environment
 */
function buildConfig(providerType: AuthProviderType): AuthProviderConfig {
  return {
    type: providerType,

    // Auth0 configuration
    auth0: {
      domain: process.env.AUTH0_DOMAIN || '',
      clientId: process.env.AUTH0_CLIENT_ID || '',
      clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
      audience: process.env.AUTH0_AUDIENCE || ''
    },

    // Login.gov configuration
    loginGov: {
      issuer: process.env.LOGIN_GOV_ISSUER || 'https://secure.login.gov',
      clientId: process.env.LOGIN_GOV_CLIENT_ID || '',
      privateKey: process.env.LOGIN_GOV_PRIVATE_KEY || '',
      acrValues: process.env.LOGIN_GOV_ACR_VALUES || 'http://idmanagement.gov/ns/assurance/ial/1'
    },

    // Azure AD configuration
    azureAd: {
      tenantId: process.env.AZURE_AD_TENANT_ID || '',
      clientId: process.env.AZURE_AD_CLIENT_ID || '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || ''
    },

    // Okta configuration
    okta: {
      domain: process.env.OKTA_DOMAIN || '',
      clientId: process.env.OKTA_CLIENT_ID || '',
      clientSecret: process.env.OKTA_CLIENT_SECRET || ''
    },

    // Session configuration
    session: {
      expiresInSeconds: parseInt(process.env.SESSION_EXPIRES_IN || '86400', 10),
      refreshEnabled: process.env.SESSION_REFRESH_ENABLED !== 'false'
    }
  };
}

/**
 * Create provider instance based on type
 *
 * SECURITY: Mock provider has additional production safeguards.
 */
function createProvider(
  providerType: AuthProviderType,
  config: AuthProviderConfig
): AuthProvider {
  switch (providerType) {
    case AuthProviderType.AUTH0:
      return new Auth0Provider(config);

    case AuthProviderType.LOGIN_GOV:
      return new LoginGovProvider(config);

    // case AuthProviderType.AZURE_AD:
    //   return new AzureADProvider(config);

    // case AuthProviderType.OKTA:
    //   return new OktaProvider(config);

    case AuthProviderType.MOCK:
      // detectProviderType() already validated this is allowed
      return new MockAuthProvider();

    default:
      // SECURITY: Don't silently fall back to mock for unknown types
      throw new Error(`Unsupported auth provider type: ${providerType}`);
  }
}

/**
 * Get the auth provider instance (singleton)
 */
export function getAuthProvider(forceNew: boolean = false): AuthProvider {
  if (providerInstance && !forceNew) {
    return providerInstance;
  }

  const providerType = detectProviderType();
  const config = buildConfig(providerType);

  providerInstance = createProvider(providerType, config);

  console.log(`[Auth Factory] Provider initialized: ${providerInstance.displayName}`);

  return providerInstance;
}

/**
 * Get a specific provider by type
 */
export function getProviderByType(
  providerType: AuthProviderType,
  configOverrides?: Partial<AuthProviderConfig>
): AuthProvider {
  const baseConfig = buildConfig(providerType);
  const config = { ...baseConfig, ...configOverrides, type: providerType };

  return createProvider(providerType, config);
}

/**
 * Check which providers are available
 */
export function getAvailableProviders(): {
  type: AuthProviderType;
  configured: boolean;
  displayName: string
}[] {
  return [
    {
      type: AuthProviderType.MOCK,
      configured: true,
      displayName: 'Mock Provider (Demo)'
    },
    {
      type: AuthProviderType.AUTH0,
      configured: !!(process.env.AUTH0_DOMAIN && process.env.AUTH0_CLIENT_ID),
      displayName: 'Auth0 (Enterprise)'
    },
    {
      type: AuthProviderType.LOGIN_GOV,
      configured: !!process.env.LOGIN_GOV_CLIENT_ID,
      displayName: 'Login.gov (Federal)'
    },
    {
      type: AuthProviderType.AZURE_AD,
      configured: !!(process.env.AZURE_AD_TENANT_ID && process.env.AZURE_AD_CLIENT_ID),
      displayName: 'Azure AD (Enterprise)'
    },
    {
      type: AuthProviderType.OKTA,
      configured: !!(process.env.OKTA_DOMAIN && process.env.OKTA_CLIENT_ID),
      displayName: 'Okta (Enterprise)'
    }
  ];
}

/**
 * Reset the singleton (for testing)
 */
export function resetAuthProvider(): void {
  providerInstance = null;
}
