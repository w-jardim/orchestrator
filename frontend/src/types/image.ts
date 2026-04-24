export interface DockerImage {
  id: string
  repoTags: string[]
  repoDigests?: string[]
  size: number
  virtualSize: number
  created: number
  sharedSize?: number
}

export interface PullImagePayload {
  image: string
}

export interface RemoveImagePayload {
  force?: boolean
}
