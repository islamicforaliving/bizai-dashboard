// pages/index.tsx - Redirect to login
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const clientId = localStorage.getItem('client_id');
    if (clientId) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-lg font-semibold text-gray-700">Redirecting...</span>
      </div>
    </div>
  );
}
