import { getSocket } from "./socket-client"

export class SocketNotConnectedError extends Error {
  constructor() {
    super("Socket has not been initialized yet")
    this.name = "SocketNotConnectedError"
  }
}

export class SocketTimeoutError extends Error {
  constructor(event: string, timeoutMs: number) {
    super(`Socket event "${event}" timed out after ${timeoutMs}ms`)
    this.name = "SocketTimeoutError"
  }
}

export class SocketAckError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SocketAckError"
  }
}

interface EmitWithAckOptions {
  timeoutMs?: number
}

// const DEFAULT_TIMEOUT_MS = 20_000
const DEFAULT_TIMEOUT_MS = 20_000

export function emitWithAck<TResponse = unknown>(
  event: string,
  payload: unknown,
  options: EmitWithAckOptions = {}
): Promise<TResponse> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS } = options

  return new Promise<TResponse>((resolve, reject) => {
    let socket
    try {
      socket = getSocket()
    } catch {
      return reject(new SocketNotConnectedError())
    }

    const timeout = setTimeout(() => {
      reject(new SocketTimeoutError(event, timeoutMs))
    }, timeoutMs)

    socket.emit(
      event,
      payload,
      (ack: { success: boolean; error?: string } & Record<string, any>) => {
        clearTimeout(timeout)
        if (ack?.success) {
          resolve(ack as TResponse)
        } else {
          reject(new SocketAckError(ack?.error || `Server rejected "${event}"`))
        }
      }
    )
  })
}
