import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api',
})

const API_CACHE_PREFIX = 'orion-api-cache:v1:'

let refreshPromise = null

const isBrowser = typeof window !== 'undefined'

const getCacheKey = (config) => {
  if (!isBrowser) {
    return ''
  }

  const method = (config.method || 'get').toUpperCase()
  return `${API_CACHE_PREFIX}${method}:${api.getUri(config)}`
}

const readCachedResponse = (config) => {
  if (!isBrowser || (config.method || 'get').toLowerCase() !== 'get') {
    return null
  }

  const cacheKey = getCacheKey(config)
  const rawResponse = localStorage.getItem(cacheKey)

  if (!rawResponse) {
    return null
  }

  try {
    const cachedPayload = JSON.parse(rawResponse)
    return {
      data: cachedPayload.data,
      status: cachedPayload.status,
      statusText: cachedPayload.statusText,
      headers: cachedPayload.headers || {},
      config,
      request: null,
    }
  } catch {
    localStorage.removeItem(cacheKey)
    return null
  }
}

const writeCachedResponse = (response) => {
  if (!isBrowser) {
    return
  }

  const method = (response.config?.method || 'get').toLowerCase()
  if (method !== 'get') {
    return
  }

  const cacheKey = getCacheKey(response.config)
  if (!cacheKey) {
    return
  }

  const payload = {
    data: response.data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    savedAt: new Date().toISOString(),
  }

  localStorage.setItem(cacheKey, JSON.stringify(payload))
}

const clearAuthTokens = () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

const refreshAccessToken = async () => {
  if (refreshPromise) {
    return refreshPromise
  }

  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  refreshPromise = axios
    .post(`${api.defaults.baseURL}/auth/token/refresh/`, { refresh: refreshToken })
    .then(({ data }) => {
      localStorage.setItem('accessToken', data.access)
      return data.access
    })
    .catch((error) => {
      clearAuthTokens()
      throw error
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use((response) => {
  writeCachedResponse(response)
  return response
}, async (error) => {
  const originalRequest = error.config
  const statusCode = error.response?.status

  if (originalRequest && (!error.response || !navigator.onLine)) {
    const cachedResponse = readCachedResponse(originalRequest)
    if (cachedResponse) {
      return Promise.resolve(cachedResponse)
    }
  }

  if (!originalRequest || statusCode !== 401 || originalRequest._retry) {
    return Promise.reject(error)
  }

  if (
    originalRequest.url?.includes('/auth/token/') ||
    originalRequest.url?.includes('/auth/token/refresh/')
  ) {
    clearAuthTokens()
    return Promise.reject(error)
  }

  try {
    originalRequest._retry = true
    const newAccessToken = await refreshAccessToken()
    originalRequest.headers = {
      ...originalRequest.headers,
      Authorization: `Bearer ${newAccessToken}`,
    }
    return api(originalRequest)
  } catch (refreshError) {
    return Promise.reject(refreshError)
  }
})

export default api
