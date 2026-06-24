import { Router } from 'express'
import { validateBody } from '../middleware/validate.js';
import { createPropertySchema, type CreatePropertyInput } from '../schemas/property.js';
import { logger } from '../lib/logger.js';
import { Errors } from '../lib/errors.js';
import { createRoomSchema, type CreateRoomInput } from '../schemas/room.js';
import { prisma } from '../lib/prisma.js';
import { toPropertyDTO } from '../lib/dto.js';
import { requireRole, verifyJwt } from '../middleware/auth.js';
import { Role } from '../generated/enums.js';

export const propertiesRouter: Router = Router()

propertiesRouter.use(verifyJwt)

// Get all properties
propertiesRouter.get('/', async (_req, res, next) => {
  try {
    const properties = await prisma.property.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { rooms: true }
    })
    res.json(properties.map(toPropertyDTO))
  } catch (err) {
    next(err)
  }
})

// Get Properties by vendor ID
propertiesRouter.get('/mine', requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const vendorId = req.user?.id
    if (!vendorId) throw Errors.unauthenticated()
    const properties = await prisma.property.findMany({
      where: { isActive: true, vendorId },
      orderBy: { createdAt: 'desc' },
      include: { rooms: true }
    })
    res.json(properties.map(toPropertyDTO))
  } catch (err) {
    next(err)
  }
})

// Get Property by property ID
propertiesRouter.get('/:id', async (req, res, next) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { rooms: true }
    })
    if (!property) throw Errors.notFound('Property')
    res.json(property.rooms)
  } catch (err) {
    next(err)
  }
})

// Create a new property : make sure the property being created is valid
propertiesRouter.post('/', requireRole(Role.ADMIN), validateBody(createPropertySchema), async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) throw Errors.unauthenticated()
    const property = await prisma.property.create({
      data: {
        ...req.body,
        vendorId: userId
      }
    });
    res
      .status(201)
      .location(`${req.baseUrl}/${property.id}`)
      .json(property);
  } catch (err) {
    next(err);
  }
})

// Delete a property
propertiesRouter.delete('/:id', async (req, res, next) => {
  try {
    await prisma.property.delete({
      where: {
        id: req.params.id
      }
    })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

propertiesRouter.get("/:id/rooms", async (req, res, next) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: { rooms: true },
    });

    if (!property) throw Errors.notFound("Property");

    res.json(property.rooms);
  } catch (err) {
    next(err);
  }
});

// propertiesRouter.post('/:id/rooms', validateBody(createRoomSchema), (req, res) => {
//   const newRoom = req.body as CreateRoomInput
//   logger.info(newRoom.id)
//   const propertyId = req.params.id;
//   if (!propertyId || typeof propertyId === 'object') {
//     throw Errors.validation('Invalid Property ID')
//   }
//   ROOMS.push({
//     propertyId: propertyId,
//     ...newRoom
//   })
//   res
//     .status(201)
//     .location(`${req.baseUrl}/${newRoom.id}`)
//     .json(newRoom)
// })