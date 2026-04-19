// Norwegian relative time. Matches brief examples: "2t siden", "I går", "3 dager siden", "1 uke siden"
export function relativeNo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (mins < 60) return mins <= 1 ? 'nå nettopp' : `${mins} min siden`;
  if (hours < 24) return `${hours}t siden`;
  if (days === 1) return 'I går';
  if (days < 7) return `${days} dager siden`;
  if (weeks === 1) return '1 uke siden';
  if (weeks < 5) return `${weeks} uker siden`;
  const months = Math.floor(days / 30);
  return `${months} mnd siden`;
}
