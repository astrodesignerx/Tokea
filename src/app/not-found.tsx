import "./not-found.css";

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260801_001207_ec20d138-aa45-4b2b-ab8c-bdc71607f240.mp4";

export default function NotFound() {
  return (
    <main className="nf">
      <video
        className="nf-video"
        src={VIDEO_SRC}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />

      <div className="nf-brand">
        <span className="nf-wordmark">NikoForm</span>
      </div>

      <div className="nf-content">
        <h1 className="nf-code">404</h1>
        <div className="nf-divider" aria-hidden="true" />
        <p className="nf-message">
          The path may be broken, but the journey isn&apos;t. Let&apos;s get you back.
        </p>
      </div>
    </main>
  );
}
