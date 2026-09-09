import axios from "axios"

const httpClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
})

httpClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const lang = localStorage.getItem("locale")
      const token = localStorage.getItem("token")
      config.headers["x-lang"] = lang || "ar"
      config.headers["authorization"] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log(error?.response)
    if (error?.response?.status === 401) {
      const statusText = error?.response?.statusText

      if (statusText === "Unauthorized") {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        window.location.href = "/auth"
      }
    }
    return Promise.reject(error)
  }
)

export default httpClient
