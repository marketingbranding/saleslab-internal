export function toDomainDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : new Date(value.getTime())
  }

  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const converted = value.toDate()
    return converted instanceof Date && !Number.isNaN(converted.getTime())
      ? new Date(converted.getTime())
      : undefined
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const converted = new Date(value)
    return Number.isNaN(converted.getTime()) ? undefined : converted
  }

  return undefined
}
