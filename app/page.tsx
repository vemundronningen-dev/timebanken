import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">
          TimeTracker
        </h1>
        <p className="text-gray-500 mb-10">
          Enkel og effektiv timeregistrering
        </p>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-3">
          <Link
            href="/logg-inn"
            className="block w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors text-center"
          >
            Logg inn
          </Link>
          <Link
            href="/registrer"
            className="block w-full py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-colors text-center"
          >
            Opprett konto
          </Link>
        </div>
      </div>
    </main>
  );
}
