import { gameBrand } from "@/lib/game-icons";
import { monogram, tileColor } from "@/lib/gaming";

/** A game's tile: real brand logo on its brand colour where we have one,
 * otherwise a monogram on a colour derived from the slug. */
export default function GameTile({
  slug,
  name,
  size = 36,
  className = "",
}: {
  slug: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const brand = gameBrand(slug);
  const color = brand?.color ?? tileColor(slug);
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-lg text-white ${className}`}
      style={{ width: size, height: size, backgroundColor: color }}
      aria-hidden
    >
      {brand?.logo ? (
        <svg
          viewBox="0 0 24 24"
          width={Math.round(size * 0.56)}
          height={Math.round(size * 0.56)}
          fill="currentColor"
        >
          <path d={brand.logo} />
        </svg>
      ) : (
        <span
          className="font-semibold"
          style={{ fontSize: Math.max(11, Math.round(size * 0.34)) }}
        >
          {monogram(name)}
        </span>
      )}
    </span>
  );
}
