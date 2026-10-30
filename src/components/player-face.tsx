import { useState } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { faceUrl } from "@/lib/scout-types";

export type PlayerFaceSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<PlayerFaceSize, string> = {
  xs: "h-12 w-9",
  sm: "h-14 w-10",
  md: "h-20 w-14",
  lg: "h-32 w-24",
  xl: "h-48 w-36",
};

type PlayerFaceProps = {
  uid: string | null | undefined;
  size?: PlayerFaceSize;
  className?: string;
};

export function PlayerFace({ uid, size = "md", className }: PlayerFaceProps) {
  const url = faceUrl(uid);
  const [errored, setErrored] = useState(false);

  if (!url || errored) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground/50",
          SIZE_CLASSES[size],
          className,
        )}
        title={uid ? `UID ${uid}` : "Sem UID"}
      >
        <User className="h-5 w-5 opacity-60" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      onError={() => setErrored(true)}
      className={cn("shrink-0 rounded-md object-cover", SIZE_CLASSES[size], className)}
    />
  );
}
