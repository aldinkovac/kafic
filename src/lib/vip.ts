// Postavke VIP članstva. Cijenu i način plaćanja mijenjaj ovdje.
export const VIP_PRICE = "5 KM mjesečno";

// Dok nema online plaćanja, VIP se aktivira ručno u Supabaseu (kolona vip_until u tabeli profiles).
// Ovdje upiši kako ljudi mogu platiti, npr. uplata na račun ili PayPal. Prazno = "uskoro".
export const VIP_PAYMENT_INFO = "";

export const VIP_PERKS: [string, string][] = [
  ["⭐", "VIP zvjezdica pored tvog nadimka, svuda na sajtu"],
  ["🔝", "Tvoj profil je prvi na stranici Članovi"],
  ["🍻", "Do 5 svojih kafana umjesto jedne"],
  ["❤️", "Podržavaš Kafić i pomažeš da dođe više ljudi"],
];
