export function BrandLogo({
  size = "sm",
  variant = "auto",
  className,
}: {
  size?: "sm" | "lg";
  variant?: "auto" | "light" | "dark";
  className?: string;
}) {
  const dimensionsClass =
    size === "lg" ? "h-12 w-auto sm:h-16" : "h-8 w-auto sm:h-9";

  return (
    <span
      className={["inline-flex items-center", className]
        .filter(Boolean)
        .join(" ")}
    >
      {variant !== "dark" ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src="/brand/praktoteka.svg"
          alt="Praktoteka"
          width={1983}
          height={440}
          decoding="async"
          className={[
            dimensionsClass,
            variant === "auto" ? "brand-logo-light" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      ) : null}

      {variant !== "light" ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src="/brand/praktoteka-dark.svg"
          alt="Praktoteka"
          width={1983}
          height={440}
          decoding="async"
          className={[
            dimensionsClass,
            variant === "auto" ? "brand-logo-dark" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      ) : null}
    </span>
  );
}
