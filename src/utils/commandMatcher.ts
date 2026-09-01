export function commandTrigger(name: string): RegExp {
  return new RegExp(`^/${name}(?:@\\w+)?(?:\\s|$)`, 'i');
}

export function getCommandArgs(text: string): string {
  return text.split(/\s+/).slice(1).join('');
}
