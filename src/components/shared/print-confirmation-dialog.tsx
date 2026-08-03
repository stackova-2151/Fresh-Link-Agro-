'use client';

import { useRouter } from 'next/navigation';
import { Printer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucherNo: string;
  voucherType: 'inward' | 'outward';
  onClose: () => void;
};

export function PrintConfirmationDialog({
  open,
  onOpenChange,
  voucherNo,
  voucherType,
  onClose,
}: Props) {
  const router = useRouter();

  const handlePrint = () => {
    onOpenChange(false);
    const printPath = voucherType === 'inward'
      ? `/inventory/inward/${encodeURIComponent(voucherNo)}/print`
      : `/outward/${encodeURIComponent(voucherNo)}/print`;
    router.push(printPath);
  };

  const handleNo = () => {
    onOpenChange(false);
    onClose();
  };

  const title = voucherType === 'inward' ? 'Print Inward?' : 'Print Outward?';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">✅ Entry Saved Successfully</DialogTitle>
          <DialogDescription className="text-center pt-2">
            <span className="font-mono font-bold text-primary text-base">{voucherNo}</span> has been saved.
            <span className="block mt-4 text-base font-semibold">{title}</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0 sm:justify-center">
          <Button 
            variant="destructive" 
            onClick={handleNo}
            className="min-w-[100px]"
          >
            NO
          </Button>
          <Button 
            onClick={handlePrint}
            className="min-w-[100px] bg-green-600 hover:bg-green-700"
          >
            <Printer className="mr-2 h-4 w-4" />
            YES
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
