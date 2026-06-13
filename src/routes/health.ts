import { Router } from 'express'

export const healthRouter: Router = Router()
healthRouter.get('/live', (_req, res) => {
  res.json({
    status: "OK",
    timeStamp: new Date().toISOString()
  })
})