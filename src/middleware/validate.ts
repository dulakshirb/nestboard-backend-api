import type { RequestHandler } from "express"
import type { z } from "zod"

export function validateBody<$ extends z.ZodType>(schema: $): RequestHandler {
  return (req, _res, next) => {
    req.body = schema.parse(req.body)
    next()
  }
}