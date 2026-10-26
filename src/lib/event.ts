// Svečano otvaranje i ponuda za osnivače. Datume mijenjaj ovdje.
export const OPENING_AT = "2026-10-30T20:00:00Z"; // petak 30.10. u 21h po našem vremenu
export const OPENING_LABEL = "petak 30.10. u 21h";
export const FOUNDER_UNTIL = "2026-12-01T00:00:00+01:00"; // mora se slagati s 007_konobar_osnivaci.sql
export const FOUNDER_LABEL = "30.11.";

export function founderOfferOpen() {
  return Date.now() < new Date(FOUNDER_UNTIL).getTime();
}
