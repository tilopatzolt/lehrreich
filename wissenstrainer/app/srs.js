// Spaced Repetition nach dem SM-2-Prinzip mit vier Bewertungsstufen.
// Ein Kartenzustand: { reps, interval (Tage), ease, lapses, due (ms), last (ms) }

const DAY = 86400000;
const MIN = 60000;

export function startOfDay(t = Date.now()) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function dayKey(t = Date.now()) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fresh() {
  return { reps: 0, interval: 0, ease: 2.5, lapses: 0, due: 0, last: 0 };
}

// grade: 0 = nochmal, 1 = schwer, 2 = gut, 3 = leicht
export function schedule(srs, grade, now = Date.now()) {
  const s = { ...fresh(), ...srs };
  if (grade === 0) {
    return { ...s, reps: 0, interval: 0, ease: Math.max(1.3, s.ease - 0.2), lapses: s.lapses + 1, due: now + 10 * MIN, last: now };
  }
  let interval;
  let ease = s.ease;
  if (grade === 1) {
    interval = s.reps === 0 ? 1 : Math.max(1, Math.round(s.interval * 1.2));
    ease = Math.max(1.3, ease - 0.15);
  } else if (grade === 2) {
    interval = s.reps === 0 ? 1 : s.reps === 1 ? 3 : Math.max(s.interval + 1, Math.round(s.interval * ease));
  } else {
    interval = s.reps === 0 ? 3 : Math.max(s.interval + 2, Math.round(s.interval * ease * 1.3));
    ease = ease + 0.15;
  }
  interval = Math.min(interval, 365);
  return { ...s, reps: s.reps + 1, interval, ease, due: startOfDay(now) + interval * DAY, last: now };
}

export function preview(srs, now = Date.now()) {
  return [0, 1, 2, 3].map((g) => {
    const next = schedule(srs, g, now);
    return g === 0 ? "10 Min" : formatDays(next.interval);
  });
}

export function formatDays(d) {
  if (d < 1) return "heute";
  if (d === 1) return "1 Tag";
  if (d < 14) return `${d} Tage`;
  if (d < 60) return `${Math.round(d / 7)} Wo.`;
  if (d < 365) return `${Math.round(d / 30)} Mon.`;
  return "1 Jahr";
}

export function isDue(srs, now = Date.now()) {
  return !!srs && srs.reps + srs.lapses > 0 && srs.due <= startOfDay(now) + DAY - 1;
}

// gefestigt = Abstand von mindestens drei Wochen
export function isMature(srs) {
  return !!srs && srs.interval >= 21;
}
