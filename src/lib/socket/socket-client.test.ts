import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  getSocketAsync,
  getSocketUrl,
  createSocketAuth,
  TOKEN_FETCH_RETRY_DELAYS_MS,
  AUTH_RECONNECT_DELAYS_MS,
  __resetSocketAuthStateForTests,
} from "./socket-client"
import { io, Socket } from "socket.io-client"
import { AxiosError } from "axios"

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
  connect: ReturnType<typeof vi.fn>
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
      connect: vi.fn(),
      emit: vi.fn(),
    }

    vi.mocked(io).mockReturnValue(mockSocket as unknown as Socket)
    disconnectSocket()
    __resetSocketAuthStateForTests()
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

  describe("connectSocket - Short-Lived Token Provider", () => {
    type AuthFn = (cb: (data: Record<string, unknown>) => void) => void

    const getAuthFn = (): AuthFn => {
      const options = vi.mocked(io).mock.calls[0]![1] as Record<string, unknown>
      expect(typeof options.auth).toBe("function")
      return options.auth as AuthFn
    }

    const runHandshake = (auth: AuthFn) =>
      new Promise<Record<string, unknown>>((resolve) => auth(resolve))

    beforeEach(() => {
      process.env.NEXT_PUBLIC_DEMO_MODE = "false"
    })

    it("uses the function form of auth and returns { token } when the provider resolves one", async () => {
      connectSocket(() => Promise.resolve("ticket-abc"))

      await expect(runHandshake(getAuthFn())).resolves.toEqual({ token: "ticket-abc" })
    })

    it("falls back to {} (cookie auth) when the provider returns null or empty", async () => {
      const provider = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce("  ")
      connectSocket(provider)
      const auth = getAuthFn()

      await expect(runHandshake(auth)).resolves.toEqual({})
      await expect(runHandshake(auth)).resolves.toEqual({})
    })

    it("fetches a fresh token on every handshake, including reconnects", async () => {
      const provider = vi
        .fn<() => Promise<string | null>>()
        .mockResolvedValueOnce("ticket-1")
        .mockResolvedValueOnce("ticket-2")
      connectSocket(provider)
      const auth = getAuthFn()

      await expect(runHandshake(auth)).resolves.toEqual({ token: "ticket-1" })
      await expect(runHandshake(auth)).resolves.toEqual({ token: "ticket-2" })
      expect(provider).toHaveBeenCalledTimes(2)
    })

    it("does not add an auth function or call the provider in demo mode", () => {
      process.env.NEXT_PUBLIC_DEMO_MODE = "true"
      const provider = vi.fn()

      connectSocket(provider)

      const options = vi.mocked(io).mock.calls[0]![1] as Record<string, unknown>
      expect(options.auth).toBeUndefined()
      expect(provider).not.toHaveBeenCalled()
    })
  })

  describe("createSocketAuth - retries and failure handling", () => {
    const status = (code: number) =>
      new AxiosError(`HTTP ${code}`, "ERR_BAD_RESPONSE", undefined, undefined, {
        status: code,
        data: {},
      } as never)

    beforeEach(() => {
      process.env.NEXT_PUBLIC_DEMO_MODE = "false"
      vi.useFakeTimers()
      vi.spyOn(console, "warn").mockImplementation(() => {})
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("uses backoff delays of 300 ms then 900 ms (3 attempts in total)", () => {
      expect(TOKEN_FETCH_RETRY_DELAYS_MS).toEqual([300, 900])
    })

    it("succeeds on the 2nd attempt after one 500", async () => {
      const provider = vi
        .fn<() => Promise<string | null>>()
        .mockRejectedValueOnce(status(500))
        .mockResolvedValueOnce("ticket-ok")
      const cb = vi.fn()

      createSocketAuth(provider)(cb)
      await vi.advanceTimersByTimeAsync(0)
      expect(cb).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(300)
      expect(provider).toHaveBeenCalledTimes(2)
      expect(cb).toHaveBeenCalledWith({ token: "ticket-ok" })
    })

    it("gives up after 3 failed attempts and falls back to {}", async () => {
      const provider = vi.fn<() => Promise<string | null>>().mockRejectedValue(status(503))
      const cb = vi.fn()

      createSocketAuth(provider)(cb)
      await vi.advanceTimersByTimeAsync(300)
      expect(cb).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(900)

      expect(provider).toHaveBeenCalledTimes(3)
      expect(cb).toHaveBeenCalledTimes(1)
      expect(cb).toHaveBeenCalledWith({})
      expect(mockSocket.disconnect).not.toHaveBeenCalled()
    })

    it("never retries a 401, does not call cb and disconnects the socket", async () => {
      connectSocket(() => Promise.resolve(null))
      const provider = vi.fn<() => Promise<string | null>>().mockRejectedValue(status(401))
      const cb = vi.fn()

      createSocketAuth(provider)(cb)
      await vi.advanceTimersByTimeAsync(5000)

      expect(provider).toHaveBeenCalledTimes(1)
      expect(cb).not.toHaveBeenCalled()
      expect(mockSocket.disconnect).toHaveBeenCalledTimes(1)
    })

    it("keeps the socket up on an auth rejection when the last token fetch failed", async () => {
      connectSocket(() => Promise.reject(status(500)))
      const auth = (vi.mocked(io).mock.calls[0]![1] as { auth: (cb: () => void) => void }).auth
      auth(() => {})
      await vi.advanceTimersByTimeAsync(1200)

      eventListeners["connect_error"]![0]!(new Error("Unauthorized: missing token"))

      expect(mockSocket.disconnect).not.toHaveBeenCalled()
    })

    it("disconnects on an auth rejection when the token was fetched successfully", async () => {
      connectSocket(() => Promise.resolve("ticket-ok"))
      const auth = (vi.mocked(io).mock.calls[0]![1] as { auth: (cb: () => void) => void }).auth
      auth(() => {})
      await vi.advanceTimersByTimeAsync(0)

      eventListeners["connect_error"]![0]!(new Error("Unauthorized: invalid token"))

      expect(mockSocket.disconnect).toHaveBeenCalledTimes(1)
    })

    it("clears the failure flag once a later fetch succeeds", async () => {
      const provider = vi
        .fn<() => Promise<string | null>>()
        .mockRejectedValueOnce(status(500))
        .mockRejectedValueOnce(status(500))
        .mockRejectedValueOnce(status(500))
        .mockResolvedValueOnce(null)
      connectSocket(provider)
      const auth = (vi.mocked(io).mock.calls[0]![1] as { auth: (cb: () => void) => void }).auth

      auth(() => {})
      await vi.advanceTimersByTimeAsync(1200)
      auth(() => {})
      await vi.advanceTimersByTimeAsync(0)

      eventListeners["connect_error"]![0]!(new Error("jwt malformed"))
      expect(mockSocket.disconnect).toHaveBeenCalledTimes(1)
    })
  })

  describe("manual reconnect after an auth rejection", () => {
    const serverError = () =>
      new AxiosError("HTTP 500", "ERR_BAD_RESPONSE", undefined, undefined, {
        status: 500,
        data: {},
      } as never)
    const authRejection = () => new Error("Unauthorized: missing token")
    const fire = (event: string, ...args: unknown[]) =>
      eventListeners[event]!.forEach((cb) => cb(...args))

    /** Connects with a token endpoint that is down, so lastTokenFetchFailed is set. */
    async function connectWithFailedTokenFetch() {
      connectSocket(() => Promise.reject(serverError()))
      const auth = (vi.mocked(io).mock.calls[0]![1] as { auth: (cb: () => void) => void }).auth
      auth(() => {})
      await vi.advanceTimersByTimeAsync(1200)
    }

    beforeEach(() => {
      process.env.NEXT_PUBLIC_DEMO_MODE = "false"
      vi.useFakeTimers()
      vi.spyOn(console, "warn").mockImplementation(() => {})
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("uses delays of 2s, 5s, 15s, 30s and 60s", () => {
      expect(AUTH_RECONNECT_DELAYS_MS).toEqual([2000, 5000, 15000, 30000, 60000])
    })

    it("does not disconnect and reconnects after 2000 ms, then 5000 ms", async () => {
      await connectWithFailedTokenFetch()

      fire("connect_error", authRejection())
      expect(mockSocket.disconnect).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(1999)
      expect(mockSocket.connect).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(1)
      expect(mockSocket.connect).toHaveBeenCalledTimes(1)

      fire("connect_error", authRejection())
      await vi.advanceTimersByTimeAsync(4999)
      expect(mockSocket.connect).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(1)
      expect(mockSocket.connect).toHaveBeenCalledTimes(2)
      expect(mockSocket.disconnect).not.toHaveBeenCalled()
    })

    it("stops and disconnects after 5 attempts", async () => {
      await connectWithFailedTokenFetch()

      for (const delay of AUTH_RECONNECT_DELAYS_MS) {
        fire("connect_error", authRejection())
        await vi.advanceTimersByTimeAsync(delay)
      }
      expect(mockSocket.connect).toHaveBeenCalledTimes(5)
      expect(mockSocket.disconnect).not.toHaveBeenCalled()

      fire("connect_error", authRejection())
      expect(mockSocket.disconnect).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(120_000)
      expect(mockSocket.connect).toHaveBeenCalledTimes(5)
    })

    it("a successful connect clears the pending retry and resets the counter", async () => {
      await connectWithFailedTokenFetch()

      fire("connect_error", authRejection())
      await vi.advanceTimersByTimeAsync(2000)
      fire("connect_error", authRejection())
      fire("connect")
      await vi.advanceTimersByTimeAsync(10_000)
      expect(mockSocket.connect).toHaveBeenCalledTimes(1)

      // Counter was reset: the next outage starts again at 2000 ms
      fire("connect_error", authRejection())
      await vi.advanceTimersByTimeAsync(2000)
      expect(mockSocket.connect).toHaveBeenCalledTimes(2)
    })

    it("disconnectSocket() cancels a pending retry", async () => {
      await connectWithFailedTokenFetch()

      fire("connect_error", authRejection())
      disconnectSocket()
      await vi.advanceTimersByTimeAsync(10_000)

      expect(mockSocket.connect).not.toHaveBeenCalled()
    })

    it("still disconnects immediately when the token was fetched", async () => {
      connectSocket(() => Promise.resolve("ticket-ok"))
      const auth = (vi.mocked(io).mock.calls[0]![1] as { auth: (cb: () => void) => void }).auth
      auth(() => {})
      await vi.advanceTimersByTimeAsync(0)

      fire("connect_error", authRejection())

      expect(mockSocket.disconnect).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(10_000)
      expect(mockSocket.connect).not.toHaveBeenCalled()
    })

    it("an exception thrown by cb does not trigger a token retry", async () => {
      const provider = vi.fn<() => Promise<string | null>>().mockResolvedValue("ticket-ok")
      const unhandled: unknown[] = []
      const onUnhandled = (reason: unknown) => unhandled.push(reason)
      process.on("unhandledRejection", onUnhandled)

      createSocketAuth(provider)(() => {
        throw new Error("cb exploded")
      })
      await vi.advanceTimersByTimeAsync(5000)

      process.off("unhandledRejection", onUnhandled)
      expect(provider).toHaveBeenCalledTimes(1)
      expect(unhandled).toHaveLength(1)
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
