/**
 * The JDM (Jenzo Download Manager) official mark — uses the high-resolution JDM icon asset
 * everywhere so all windows, dialogs, dropzone, and headers match the official app icon.
 */
export function LogoMark({ size = 22 }: { size?: number; glass?: "white" | "indigo" }) {
  const src = size >= 48 ? "/icon-512.png" : "/icon-128.png";
  return (
    <img
      src={src}
      alt="JDM"
      width={size}
      height={size}
      className="logo-mark"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        objectFit: "cover",
        display: "inline-block",
        flex: "none",
      }}
      draggable={false}
    />
  );
}

/** High-resolution enhanced JDM icon on the brand tile. */
export function BrandTile({ size = 28 }: { size?: number }) {
  const src = size >= 48 ? "/icon-512.png" : "/icon-128.png";
  return (
    <span
      className="brand-tile"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.24),
        overflow: "hidden",
        background: "transparent",
        boxShadow: "0 2px 8px rgb(0 0 0 / 0.38)",
      }}
    >
      <img
        src={src}
        alt="JDM"
        width={size}
        height={size}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        draggable={false}
      />
    </span>
  );
}
