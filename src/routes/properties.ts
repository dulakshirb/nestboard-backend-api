import { Router } from 'express'
import { validateBody } from '../middleware/validate.js';
import { createPropertySchema, type CreatePropertyInput } from '../schemas/property.js';
import { logger } from '../lib/logger.js';
import { Errors } from '../lib/errors.js';
import { createRoomSchema, type CreateRoomInput } from '../schemas/room.js';
import { prisma } from '../lib/prisma.js';
import { toPropertyDTO } from '../lib/dto.js';
import { verifyJwt } from '../middleware/auth.js';

export const propertiesRouter: Router = Router()

// const PROPERTIES = [
//   {
//     id: 'prop-001',
//     title: 'Sunset Apartment',
//     location: 'Ethul Kotte, Sri Lanka',
//     type: 'Apartment',
//     price: '20K',
//     rating: 4.8,
//     image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=500&fit=crop',
//   },
//   {
//     id: 'prop-002',
//     title: 'Palm House',
//     location: 'Gampaha, Sri Lanka',
//     type: 'House',
//     price: '18K',
//     rating: 4.2,
//     image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=400&h=500&fit=crop',
//   },
// ];

// Get all properties
propertiesRouter.get('/', async (_req, res, next) => {
  // res.json(PROPERTIES)
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


// Get Property by ID
propertiesRouter.get('/:id', async (req, res, next) => {
  // const property = PROPERTIES.find(p => p.id === req.params.id)
  // if (!property) {
  //   // res.status(404).json({ error: 'Property not found' })
  //   // return
  //   throw Errors.notFound('Property')
  // }
  // res.json(property)
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
propertiesRouter.post('/', verifyJwt, validateBody(createPropertySchema), async (req, res, next) => {
  // const newProperty = req.body as CreatePropertyInput
  // logger.info(newProperty.id)
  // PROPERTIES.push(newProperty)
  // res
  //   .status(201)
  //   .location(`${req.baseUrl}/${newProperty.id}`)
  //   .json(newProperty)
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
  // const index = PROPERTIES.findIndex(p => p.id === req.params.id)
  // if (index === -1) {
  //   // res.status(404).json({ error: 'Property not found' })
  //   // return
  //   throw Errors.notFound('Property')
  // }
  // PROPERTIES.splice(index, 1)
  // res.status(204).send();
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

// const ROOMS = [
//   { id: 'r1', propertyId: 'prop-001', name: 'Room A', price: 20000, seatsTotal: 2, seatsFree: 1, hasAC: true },
//   { id: 'r2', propertyId: 'prop-001', name: 'Room B', price: 22000, seatsTotal: 2, seatsFree: 2, hasAC: true },
//   { id: 'r3', propertyId: 'prop-002', name: 'Room C', price: 18000, seatsTotal: 3, seatsFree: 0, hasAC: false },
// ];

// propertiesRouter.get('/:id/rooms', (req, res) => {
//   const property = PROPERTIES.find(p => p.id === req.params.id);
//   if (!property) {
//     throw Errors.notFound('Property')
//   }
//   res.json(ROOMS.filter(r => r.propertyId === req.params.id));
// })

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