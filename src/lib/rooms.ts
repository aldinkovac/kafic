export type Room = {
  id: number;
  slug: string;
  name: string;
  category: "kraj" | "tema" | "kafana";
  description: string | null;
  owner_id: string | null;
  is_open: boolean;
  invite_code: string;
  created_at: string;
};

// "Kod Mehe u Tuzli" -> "kod-mehe-u-tuzli-x7k2"
export function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[čć]/g, "c").replace(/đ/g, "dj").replace(/š/g, "s").replace(/ž/g, "z")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "kafana"}-${Math.random().toString(36).slice(2, 6)}`;
}
