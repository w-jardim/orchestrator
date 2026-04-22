export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  errors?: { field: string; message: string }[]
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total?: number
  page?: number
  limit?: number
}
