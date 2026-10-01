/**
 * @fileoverview Minimal app logger.
 *
 * Development: forwards everything to the console.
 * Production: drops debug output and strips non-primitive arguments
 * (raw Axios errors carry request configs, headers and payloads) so only
 * the label and human-readable message reach the browser console.
 */

type LogArg = unknown

const isProduction = process.env.NODE_ENV === "production"

function sanitize(args: LogArg[]): LogArg[] {
  if (!isProduction) return args
  return args.filter(
    (arg) => typeof arg === "string" || typeof arg === "number" || typeof arg === "boolean"
  )
}

export const logger = {
  debug: (...args: LogArg[]) => {
    if (!isProduction) console.debug(...args)
  },
  warn: (...args: LogArg[]) => console.warn(...sanitize(args)),
  error: (...args: LogArg[]) => console.error(...sanitize(args)),
}
