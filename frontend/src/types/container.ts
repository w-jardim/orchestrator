export type ContainerStatus = 'running' | 'exited' | 'paused' | 'restarting' | 'dead' | 'created' | 'removing'

export interface ContainerPort {
  IP?: string
  PrivatePort: number
  PublicPort?: number
  Type: string
  ip?: string
  privatePort?: number
  publicPort?: number
  type?: string
}

export interface Container {
  Id?: string
  id?: string
  fullId?: string
  Names?: string[]
  names?: string[]
  name?: string
  Image?: string
  image?: string | null
  ImageID?: string
  Command?: string
  Created?: number
  created?: string
  Status?: string
  status?: string
  State?: ContainerStatus
  state?: ContainerStatus | { status?: ContainerStatus; running?: boolean }
  Ports?: ContainerPort[]
  ports?: ContainerPort[]
  Labels?: Record<string, string>
  SizeRw?: number
  SizeRootFs?: number
}

export interface ContainerInspect extends Container {
  Config: {
    Env: string[]
    Cmd: string[]
    Image: string
    WorkingDir: string
  }
  HostConfig: {
    RestartPolicy: { Name: string; MaximumRetryCount: number }
    Memory: number
    CpuShares: number
  }
  NetworkSettings: {
    IPAddress: string
    Networks: Record<string, { IPAddress: string; Gateway: string }>
  }
}

export type ContainerAction = 'start' | 'stop' | 'restart'
