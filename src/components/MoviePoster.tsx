import Image from "next/image";
import { posterUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

interface Props {
  posterPath: string | null;
  title: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: { w: 80, h: 120, tmdb: "w185" as const },
  md: { w: 120, h: 180, tmdb: "w342" as const },
  lg: { w: 160, h: 240, tmdb: "w500" as const },
  xl: { w: 220, h: 330, tmdb: "w500" as const },
};

export default function MoviePoster({ posterPath, title, size = "md", className }: Props) {
  const { w, h, tmdb } = sizes[size];
  const url = posterUrl(posterPath, tmdb);

  return (
    <div
      className={cn("relative rounded-xl overflow-hidden bg-muted poster-shadow flex-shrink-0", className)}
      style={{ width: w, height: h }}
    >
      {url ? (
        <Image
          src={url}
          alt={title}
          fill
          className="object-cover"
          sizes={`${w}px`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs text-center p-2">
          {title}
        </div>
      )}
    </div>
  );
}
