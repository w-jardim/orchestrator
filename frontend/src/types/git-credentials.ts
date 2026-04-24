export interface GitKey {
  name: string
  fingerprint: string
  createdAt: string
}

export interface GenerateKeyPayload {
  name: string
  comment?: string
}

export interface AddKeyPayload {
  name: string
  privateKey: string
  publicKey: string
}

export interface TestAuthPayload {
  repositoryUrl: string
}

export interface ConfigureGitPayload {
  name: string
  email: string
}

export interface KeyFingerprint {
  fingerprint: string
}

export interface TestAuthResponse {
  success: boolean
  message: string
}
