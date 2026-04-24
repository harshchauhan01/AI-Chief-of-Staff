import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api',
})

let refreshPromise = null

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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const statusCode = error.response?.status

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
  },
)

export default api
