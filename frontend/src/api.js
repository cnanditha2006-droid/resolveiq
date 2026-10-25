const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

export class ApiError extends Error {
  constructor(message, status, fieldErrors) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors || {}
  }
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0)
  }

  let data = {}
  try {
    data = await res.json()
  } catch {
    // some responses have no JSON body; that is fine
  }

  if (!res.ok) {
    throw new ApiError(data.message || 'Something went wrong', res.status, data.errors)
  }
  return data
}