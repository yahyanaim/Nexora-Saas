import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  getSocketAsync,
  getSocketUrl,
} from "./socket-client"
import { io, Socket } from "socket.io-client"

vi.mock("socket.io-client", () => {
  return {
    io: vi.fn(),
  }
})

type MockSocket = {
  connected: boolean
  on: ReturnType<typeof vi.fn>
  off: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  emit: ReturnType<typeof vi.fn>
}

describe("socket-client", () => {
  const originalEnv = process.env
  let mockSocket: MockSocket
  let eventListeners: Record<string, ((...args: unknown[]) => void)[]> = {}

  beforeEach(() => {
    process.env = { ...originalEnv }
    eventListeners = {}

    mockSocket = {
      connected: false,
      on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
        if (!eventListeners[event]) {
          eventListeners[event] = []
        }
        eventListeners[event].push(callback)
        return mockSocket
      }),
      off: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
        if (eventListeners[event]) {
          eventListeners[event] = eventListeners[event].filter(
            (cb) => cb !== callback
          )
        }
        return mockSocket
      }),
      disconnect: vi.fn(() => {
        mockSocket.connected = false
      }),
      emit: vi.fn(),
    }

    vi.mocked(io).mockReturnValue(mockSocket as unknown as Socket)
    disconnectSocket()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
    disconnectSocket()
  })

  describe("getSocketUrl", () => {
    it("should prioritize NEXT_PUBLIC_SOCKET_URL if set", () => {
      process.env.NEXT_PUBLIC_SOCKET_URL = "https://socket.example.com"
      process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/api"

      expect(getSocketUrl()).toBe("https://socket.example.com")
    })

    it("should strip trailing /api from NEXT_PUBLIC_API_URL if socket URL not set", () => {
      delete process.env.NEXT_PUBLIC_SOCKET_URL
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:40001/api"

      expect(getSocketUrl()).toBe("http://localhost:40001")
    })

    it("should strip trailing /api/ with slash from NEXT_PUBLIC_API_URL", () => {
      delete process.env.NEXT_PUBLIC_SOCKET_URL
      process.env.NEXT_PUBLIC_API_URL = "https://backend.mycorp.internal/api/"

      expect(getSocketUrl()).toBe("https://backend.mycorp.internal")
    })

    it("should fall back to http://localhost:40001 when neither env var is defined", () => {
      delete process.env.NEXT_PUBLIC_SOCKET_URL
      delete process.env.NEXT_PUBLIC_API_URL

      expect(getSocketUrl()).toBe("http://localhost:40001")
    })
  })

  describe("connectSocket - Cookie-Based Auth Handshake", () => {
    it("should connect with withCredentials: true and omit auth payload when token is undefined", () => {
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:40001/api"

      const s = connectSocket(undefined)

      expect(io).toHaveBeenCalledTimes(1)
      expect(io).toHaveBeenCalledWith(
        "http://localhost:40001",
        expect.objectContaining({
          withCredentials: true,
          transports: ["websocket"],
          reconnection: true,
          reconnectionAttempts: 10,
        })
      )

      // Ensure no auth object with undefined token is passed
      const callArgs = vi.mocked(io).mock.calls[0]!
      const passedOptions = callArgs[1] as Record<string, unknown>
      expect(passedOptions.auth).toBeUndefined()
      expect(s).toBe(mockSocket)
    })

    it("should omit auth payload when token is empty or whitespace string", () => {
      connectSocket("   ")

      const callArgs = vi.mocked(io).mock.calls[0]!
      const passedOptions = callArgs[1] as Record<string, unknown>
      expect(passedOptions.auth).toBeUndefined()
    })

    it("should return existing socket instance if already connected", () => {
      mockSocket.connected = true
      const s1 = connectSocket()
      const s2 = connectSocket()

      expect(io).toHaveBeenCalledTimes(1)
      expect(s1).toBe(s2)
    })
  })

  describe("connectSocket - Explicit Token", () => {
    it("should include auth: { token } when a valid token string is provided", () => {
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:40001/api"

      connectSocket("short-lived-ticket-token-123")

      expect(io).toHaveBeenCalledWith(
        "http://localhost:40001",
        expect.objectContaining({
          withCredentials: true,
          transports: ["websocket"],
          auth: { token: "short-lived-ticket-token-123" },
        })
      )
    })
  })

  describe("Authentication Error Handling", () => {
    it("should disconnect socket and halt reconnection on unauthorized connect_error", () => {
      connectSocket()

      const errorHandler = eventListeners["connect_error"]?.[0]
      expect(errorHandler).toBeDefined()

      // Trigger auth error
      const authError = new Error("Unauthorized: Session cookie missing or invalid")
      errorHandler!(authError)

      expect(mockSocket.disconnect).toHaveBeenCalledTimes(1)
    })

    it("should disconnect socket on forbidden connect_error", () => {
      connectSocket()

      const errorHandler = eventListeners["connect_error"]?.[0]
      expect(errorHandler).toBeDefined()

      const forbiddenError = new Error("Forbidden: Invalid origin")
      errorHandler!(forbiddenError)

      expect(mockSocket.disconnect).toHaveBeenCalledTimes(1)
    })

    it("should not disconnect socket on normal network hiccup errors", () => {
      connectSocket()

      const errorHandler = eventListeners["connect_error"]?.[0]
      expect(errorHandler).toBeDefined()

      const networkError = new Error("websocket error: connection timeout")
      errorHandler!(networkError)

      // Regular network errors should allow socket.io automatic reconnection attempts
      expect(mockSocket.disconnect).not.toHaveBeenCalled()
    })

    it("should disconnect socket on jwt expired or generic auth keyword error", () => {
      connectSocket()

      const errorHandler = eventListeners["connect_error"]?.[0]
      expect(errorHandler).toBeDefined()

      const jwtError = new Error("jwt expired token")
      errorHandler!(jwtError)

      expect(mockSocket.disconnect).toHaveBeenCalledTimes(1)
    })
  })

  describe("getSocket and getSocketAsync", () => {
    it("should throw if getSocket is called before connectSocket", () => {
      expect(() => getSocket()).toThrow("Socket not initialized. Call connectSocket() first.")
    })

    it("should return socket once connected", () => {
      connectSocket()
      expect(getSocket()).toBe(mockSocket)
    })

    it("should resolve immediately if socket already exists in getSocketAsync", async () => {
      connectSocket()
      const s = await getSocketAsync()
      expect(s).toBe(mockSocket)
    })

    it("should resolve once connectSocket is called after getSocketAsync", async () => {
      const promise = getSocketAsync(500)
      connectSocket()
      const s = await promise
      expect(s).toBe(mockSocket)
    })

    it("should reject getSocketAsync when timeout expires without connection", async () => {
      vi.useFakeTimers()
      const promise = getSocketAsync(100)
      vi.advanceTimersByTime(150)
      await expect(promise).rejects.toThrow("Socket was not initialized in time")
      vi.useRealTimers()
    })
  })

  describe("disconnectSocket", () => {
    it("should call socket.disconnect and reset singleton to null", () => {
      connectSocket()
      expect(getSocket()).toBe(mockSocket)

      disconnectSocket()
      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(() => getSocket()).toThrow("Socket not initialized")
    })

    it("should safely no-op if disconnectSocket is called when socket is already null", () => {
      expect(() => disconnectSocket()).not.toThrow()
    })
  })
})
