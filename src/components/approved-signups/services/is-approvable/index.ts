export default function isApprovable(howManyUnits: string, readyForProduction: string): boolean {
  const isReady = readyForProduction === 'YES';

  if (howManyUnits === '150+') {
    return true;
  }

  if (isReady && (howManyUnits === '50-150' || howManyUnits === '150+')) {
    return true;
  }

  return false;
}
