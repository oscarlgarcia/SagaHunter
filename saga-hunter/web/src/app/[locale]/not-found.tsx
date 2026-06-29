import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="text-5xl mb-4">🔍</div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Page not found</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-5 py-2 text-sm font-medium text-white bg-saga-600 hover:bg-saga-700 rounded-lg transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
