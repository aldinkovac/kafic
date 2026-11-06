// Fotografije za naslovnu. Sve su pod besplatnom Unsplash licencom (https://unsplash.com/license):
// smiju se koristiti besplatno, i komercijalno, bez obaveznog navođenja autora (ali ga navodimo).
// Ljudi na slikama su modeli s fotografija, a ne članovi Kafića.
export type StockPhoto = { src: string; alt: string; author: string; page: string };

const u = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80`;

export const PHOTOS = {
  selfie: {
    src: u("photo-1790749870997-30950f2a1a77"),
    alt: "Četvoro prijatelja se smije i pravi selfie u kafiću",
    author: "Vitaly Gariev",
    page: "https://unsplash.com/photos/cXaLBbSe2M4",
  },
  prijateljice: {
    src: u("photo-1758525225816-8dd1901ef6ec"),
    alt: "Dvije djevojke se smiju za stolom u kafiću",
    author: "Vitaly Gariev",
    page: "https://unsplash.com/photos/uwZ-dOjw8Bo",
  },
  raja: {
    src: u("photo-1582298538104-fe2e74c27f59"),
    alt: "Četvoro prijatelja se smije i daje petice uz kafu",
    author: "Toa Heftiba",
    page: "https://unsplash.com/photos/l_ExpFwwOEg",
  },
  smijeh: {
    src: u("photo-1511988617509-a57c8a288659"),
    alt: "Društvo mladih se smije napolju po danu",
    author: "Helena Lopes",
    page: "https://unsplash.com/photos/e3OUQGT9bWU",
  },
  par: {
    src: u("photo-1632101498980-73bc65b300c5"),
    alt: "Mladić i djevojka piju kafu za stolom",
    author: "GESPHOTOSS",
    page: "https://unsplash.com/photos/nhDs1KHWX1Q",
  },
  sto: {
    src: u("photo-1790749870680-9f1918813d91"),
    alt: "Društvo priča i pije kafu za drvenim stolom u kafiću",
    author: "Vitaly Gariev",
    page: "https://unsplash.com/photos/U53SkA9ds7E",
  },
} satisfies Record<string, StockPhoto>;
