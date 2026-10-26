import Link from "next/link";
import { VIP_PAYMENT_INFO, VIP_PERKS, VIP_PRICE } from "@/lib/vip";

export default function VipPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">⭐ Postani VIP</h1>
        <p className="text-stone-600 dark:text-stone-400">
          Kafić je besplatan za sve. VIP članarina pomaže da platimo reklame i da u kafić dođe više ljudi.
        </p>
      </div>

      <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm dark:bg-stone-900">
        <div className="text-center text-2xl font-bold text-amber-700 dark:text-amber-400">{VIP_PRICE}</div>
        <ul className="space-y-3">
          {VIP_PERKS.map(([icon, text]) => (
            <li key={text} className="flex gap-3">
              <span className="text-xl">{icon}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-xl bg-amber-50 p-4 text-sm dark:bg-stone-800">
          {VIP_PAYMENT_INFO
            ? <p className="whitespace-pre-line">{VIP_PAYMENT_INFO}</p>
            : <p>Plaćanje karticom stiže uskoro. Prati nas, javit ćemo kad bude moguće.</p>}
        </div>
      </div>

      <p className="text-center text-sm">
        <Link href="/profil" className="underline">Nazad na profil</Link>
      </p>
    </div>
  );
}
