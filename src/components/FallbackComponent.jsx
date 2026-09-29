import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function FallbackComponent({ resetError }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center border border-gray-100">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-8">
          We've been notified and are looking into it. Please try reloading the page.
        </p>
        <button
          onClick={() => {
            if (resetError) resetError();
            window.location.reload();
          }}
          className="w-full inline-flex justify-center items-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <RefreshCcw className="w-5 h-5" />
          Reload Page
        </button>
      </div>
    </div>
  );
}

