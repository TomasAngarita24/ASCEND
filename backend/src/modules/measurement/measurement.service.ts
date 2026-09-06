import type { BodyMeasurement } from '../../generated/prisma/client';
import { prisma } from '../../database/prisma';
import { HttpError } from '../../errors/http-error';
import type { BodyMeasurementResponse, SaveMeasurementInput } from './measurement.types';

function toMeasurementResponse(m: BodyMeasurement): BodyMeasurementResponse {
  return {
    id: m.id,
    date: m.date.toISOString().slice(0, 10),
    weight: m.weight === null ? null : Number(m.weight),
    neck: m.neck === null ? null : Number(m.neck),
    shoulders: m.shoulders === null ? null : Number(m.shoulders),
    chest: m.chest === null ? null : Number(m.chest),
    waist: m.waist === null ? null : Number(m.waist),
    hips: m.hips === null ? null : Number(m.hips),
    bicep: m.bicep === null ? null : Number(m.bicep),
    thigh: m.thigh === null ? null : Number(m.thigh),
    calf: m.calf === null ? null : Number(m.calf),
    bodyFat: m.bodyFat === null ? null : Number(m.bodyFat),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export async function listMeasurements(userId: string): Promise<{ data: BodyMeasurementResponse[] }> {
  const measurements = await prisma.bodyMeasurement.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
  });

  return {
    data: measurements.map(toMeasurementResponse),
  };
}

export async function saveMeasurement(userId: string, input: SaveMeasurementInput): Promise<BodyMeasurementResponse> {
  const dateObj = new Date(`${input.date}T00:00:00.000Z`);
  if (isNaN(dateObj.getTime())) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid date format. Expected YYYY-MM-DD.');
  }

  const measurement = await prisma.bodyMeasurement.upsert({
    where: {
      userId_date: {
        userId,
        date: dateObj,
      },
    },
    create: {
      userId,
      date: dateObj,
      weight: input.weight ?? null,
      neck: input.neck ?? null,
      shoulders: input.shoulders ?? null,
      chest: input.chest ?? null,
      waist: input.waist ?? null,
      hips: input.hips ?? null,
      bicep: input.bicep ?? null,
      thigh: input.thigh ?? null,
      calf: input.calf ?? null,
      bodyFat: input.bodyFat ?? null,
    },
    update: {
      weight: input.weight !== undefined ? input.weight : undefined,
      neck: input.neck !== undefined ? input.neck : undefined,
      shoulders: input.shoulders !== undefined ? input.shoulders : undefined,
      chest: input.chest !== undefined ? input.chest : undefined,
      waist: input.waist !== undefined ? input.waist : undefined,
      hips: input.hips !== undefined ? input.hips : undefined,
      bicep: input.bicep !== undefined ? input.bicep : undefined,
      thigh: input.thigh !== undefined ? input.thigh : undefined,
      calf: input.calf !== undefined ? input.calf : undefined,
      bodyFat: input.bodyFat !== undefined ? input.bodyFat : undefined,
    },
  });

  return toMeasurementResponse(measurement);
}

export async function deleteMeasurement(userId: string, id: string): Promise<void> {
  const existing = await prisma.bodyMeasurement.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new HttpError(404, 'MEASUREMENT_NOT_FOUND', 'Measurement not found or not accessible.');
  }

  await prisma.bodyMeasurement.delete({
    where: { id },
  });
}
