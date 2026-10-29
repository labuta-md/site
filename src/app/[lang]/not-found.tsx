import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap narrow stack">
      <h1>404</h1>
      <p>
        <Link href="/">labuta.md</Link>
      </p>
    </div>
  );
}
