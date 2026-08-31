/**
 * The splash shown while a profile-template card page settles: the
 * organisation's logo centred on white, exactly like the vCard landing pages
 * this template follows. It hides itself with a pure CSS animation after a
 * second (see cards.css), so it works without JavaScript and never blocks
 * taps — pointer-events stay off from the start.
 *
 * Rendered from the page rather than the card: the card animates its
 * transform on entry, which would trap a fixed-position overlay inside the
 * card's box instead of covering the viewport.
 */
export function CardSplash({
  logoUrl,
  name,
}: {
  logoUrl: string | null;
  name: string;
}) {
  return (
    <div
      aria-hidden="true"
      className="card-splash pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-white"
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="h-20 max-w-[80%] object-contain"
        />
      ) : (
        <span className="px-8 text-center text-2xl font-semibold text-black">
          {name}
        </span>
      )}
    </div>
  );
}
