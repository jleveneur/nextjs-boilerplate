"use client";

import { HugeiconsIcon, type HugeiconsProps, type IconSvgElement } from "@hugeicons/react";

export type IconProps = Omit<HugeiconsProps, "icon"> & {
  /** HugeIcons glyph from `@hugeicons/core-free-icons`. */
  icon: IconSvgElement;
};

/**
 * Single swap point for the icon set. Apps import {@link Icon} from
 * `@repo/ui/icons` rather than `@hugeicons/react` directly.
 */
export function Icon({ strokeWidth = 2, ...props }: IconProps) {
  return <HugeiconsIcon strokeWidth={strokeWidth} {...props} />;
}
