import { Prisma, type PrismaClient } from "../generated/client.js";
import { BookingStatus, PaymentStatus } from "../generated/enums.js";
import { prisma as defaultPrisma } from "../lib/prisma.js";
import { Errors } from "../lib/errors.js";
import type { CreateBookingInput } from "../schemas/booking.js";

const TEN_MIN_MS = 10 * 60 * 1000;

function leaseRange(startMonth: string, durationMonths: 3 | 6) {
  const [y, m] = startMonth.split("-").map(Number);
  if (!y || !m) throw Errors.validation("Invalid startMonth format");
  const start = new Date(Date.UTC(y, m - 1, 1));
  // end date with the extra day
  const endExclusive = new Date(Date.UTC(y, m - 1 + durationMonths, 1));
  // removing the last day
  const end = new Date(endExclusive.getTime() - 24 * 60 * 60 * 1000);
  return { start, end };
}

export async function createBookingPending(
  tenantId: string,
  input: CreateBookingInput,
  db: PrismaClient = defaultPrisma,
) {
  const { start, end } = leaseRange(input.startMonth, input.durationMonths);

  return db.$transaction(
    async (tx) => {
      const room = await tx.room.findUnique({
        where: { id: input.roomId },
      });
      if (!room) throw Errors.notFound("Room");
      if (input.seatNumber > room.seatCapacity) {
        throw Errors.validation(
          `Seat ${input.seatNumber} exceeds capacity ${room.seatCapacity}`,
        );
      }

      const conflict = await tx.booking.findFirst({
        where: {
          roomId: input.roomId,
          seatNumber: input.seatNumber,
          bookingStatus: {
            in: [BookingStatus.CONFIRMED, BookingStatus.PENDING],
          },
          leaseStart: { lt: end },
          leaseEnd: { gt: start },
        },
        select: { id: true, bookingStatus: true, createdAt: true },
      });

      if (conflict) {
        const isStale =
          conflict.bookingStatus === BookingStatus.PENDING &&
          Date.now() - conflict.createdAt.getTime() > TEN_MIN_MS;
        if (isStale) {
          await tx.booking.update({
            where: { id: conflict.id },
            data: {
              bookingStatus: BookingStatus.EXPIRED,
              paymentStatus: PaymentStatus.FAILED,
            },
          });
        } else {
          throw Errors.conflict("Seat unavailable for this period");
        }
      }

      const totalAmount = room.pricePerMonth.mul(input.durationMonths);

      return tx.booking.create({
        data: {
          tenantId,
          roomId: input.roomId,
          seatNumber: input.seatNumber,
          leaseStart: start,
          leaseEnd: end,
          durationMonths: input.durationMonths,
          totalAmount,
          paymentStatus: PaymentStatus.PENDING,
          bookingStatus: BookingStatus.PENDING,
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function confirmBooking(
  bookingId: string,
  tenantId: string,
  db: PrismaClient = defaultPrisma,
) {
  return db.$transaction(
    async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!booking) throw Errors.notFound("Booking");
      if (booking.tenantId !== tenantId) throw Errors.forbidden();
      if (booking.bookingStatus !== BookingStatus.PENDING) {
        throw Errors.conflict(`Booking is already ${booking.bookingStatus}`);
      }
      if (Date.now() - booking.createdAt.getTime() > TEN_MIN_MS) {
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            bookingStatus: BookingStatus.EXPIRED,
            paymentStatus: PaymentStatus.FAILED,
          },
        });
        throw Errors.conflict("Booking expired before payment");
      }
      return tx.booking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          bookingStatus: BookingStatus.CONFIRMED,
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function listMyBookings(
  tenantId: string,
  db: PrismaClient = defaultPrisma,
) {
  return db.booking.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      room: { include: { property: true } },
    },
  });
}