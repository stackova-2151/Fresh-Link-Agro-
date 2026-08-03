'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function StockReportLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/printing');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Back button */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="w-full px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
