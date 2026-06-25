export const SECURITY_BASENAMES = new Set([
  'passwd',
  'shadow',
  'sudoers',
  'id_rsa',
  'id_ed25519',
  'authorized_keys',
  'known_hosts',
  '.env',
  '.env.production',
  '.env.local',
  'credentials',
  'credentials.json',
  'service-account-key.json',
  'kube_config',
  'config.json', // sensitive context
  'npmrc',
  '.npmrc',
  'netrc',
  '.netrc',
  'pgpass',
  '.pgpass',
])

export const SECURITY_EXTENSIONS = new Set([
  '.pem',
  '.key',
  '.p12',
  '.pfx',
  '.crt',
  '.cer',
  '.jks',
  '.keystore',
  '.asc',
  '.gpg',
  '.ovpn',
])

export const SECURITY_PATH_TOKENS = [
  '/secrets/',
  '/secret/',
  '/credentials/',
  '/credential/',
  '/tokens/',
  '/token/',
  '/keys/',
  '/certificates/',
  '/cert/',
]

export const SECURITY_KEYWORDS = [
  'api_key',
  'apikey',
  'api-key',
  'api.secret',
  'secret_key',
  'secretkey',
  'secret-key',
  'access_key',
  'accesskey',
  'access-key',
  'auth_token',
  'authtoken',
  'auth-token',
  'bearer',
  'bearer_token',
  'jwt_secret',
  'jwt-secret',
  'encryption_key',
  'encryption-key',
  'private_key',
  'private-key',
  'ssh_key',
  'ssh-key',
  'password',
  'passwd',
  'pwd',
  'db_password',
  'db_password_',
  'connection_string',
  'connection-string',
  'connstr',
  'SA_PASSWORD',
  'smtp_password',
  'slack_token',
  'discord_token',
  'github_token',
  'gitlab_token',
  'npm_token',
  'npmtoken',
]

export const SECURITY_AC_KEYWORDS = [
  'security',
  'auth',
  'authentication',
  'authorization',
  'encrypt',
  'password',
  'credential',
  'token',
  'permission',
  'rbac',
  'acl',
  'session',
  'xss',
  'csrf',
  'sqli',
  'injection',
  'csp',
  'secret',
  'key',
  'certificate',
  'hsm',
  'gdpr',
  '152-fz',
  'personal data',
  'consent',
  'audit',
  'compliance',
]

export function isSecurityFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase()
  const basename = normalized.split('/').pop() ?? ''

  if (SECURITY_BASENAMES.has(basename)) return true
  for (const ext of SECURITY_EXTENSIONS) {
    if (basename.endsWith(ext)) return true
  }
  for (const token of SECURITY_PATH_TOKENS) {
    if (normalized.includes(token)) return true
  }
  for (const kw of SECURITY_KEYWORDS) {
    if (basename.includes(kw.toLowerCase())) return true
  }
  return false
}

export function isSecuritySensitive(
  gateName: string,
  filePath: string
): boolean {
  if (isSecurityFile(filePath)) return true
  const lower = gateName.toLowerCase()
  return (
    lower.includes('secret') ||
    lower.includes('credential') ||
    lower.includes('auth') ||
    lower.includes('permission')
  )
}
