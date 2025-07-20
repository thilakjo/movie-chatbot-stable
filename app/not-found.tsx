import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900">
      <div className="mb-6 animate-bounce">
        {/* Movie clapperboard SVG icon */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="20"
            y="50"
            width="80"
            height="50"
            rx="8"
            fill="#222"
            stroke="#444"
            strokeWidth="4"
          />
          <rect
            x="20"
            y="35"
            width="80"
            height="20"
            rx="4"
            fill="#fff"
            stroke="#444"
            strokeWidth="4"
          />
          <rect x="20" y="35" width="20" height="20" rx="4" fill="#222" />
          <rect x="40" y="35" width="20" height="20" rx="4" fill="#fff" />
          <rect x="60" y="35" width="20" height="20" rx="4" fill="#222" />
          <rect x="80" y="35" width="20" height="20" rx="4" fill="#fff" />
        </svg>
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-700 dark:text-gray-200 mb-2">
        Page Not Found
      </h1>
      <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">
        Oops! The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="https://movies.thilakjo.com">
        <button className="px-6 py-3 rounded-lg bg-primary text-white font-semibold shadow-lg hover:bg-primary/90 transition text-lg">
          Return to Dashboard
        </button>
      </Link>
    </div>
  );
}
