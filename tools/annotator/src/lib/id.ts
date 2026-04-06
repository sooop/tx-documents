let counter = 0;

export function generateId(prefix: string = 'ann'): string {
  counter++;
  return `${prefix}-${Date.now()}-${counter}`;
}
