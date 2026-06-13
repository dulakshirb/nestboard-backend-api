import { z } from 'zod';

export const createRoomSchema = z.object({
  id: z.string().startsWith('r').min(2),
  name: z.string().min(3).max(10),
  price: z.number().min(0),
  seatsTotal: z.number().min(0),
  seatsFree: z.number().min(0),
  hasAC: z.boolean()
})

export type CreateRoomInput = z.infer<typeof createRoomSchema>