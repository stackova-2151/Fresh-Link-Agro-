'use client';

import type React from 'react';
import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { occupancyService, type BlockStockDetails } from '@/lib/services/occupancy.service';

interface BlockStockDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockDetails: BlockStockDetails | null;
}

export function BlockStockDetailsModal({
  open,
  onOpenChange,
  stockDetails,
}: BlockStockDetailsModalProps) {
  const isEmpty = !stockDetails || stockDetails.customerGroups.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Block Stock Details</DialogTitle>
          {stockDetails && (
            <div className="text-sm text-muted-foreground mt-2 space-y-1">
              <div className="font-medium">
                Chamber: {stockDetails.chamberName}
              </div>
              <div className="font-medium">
                Room: {stockDetails.roomName}
              </div>
              <div className="font-medium">
                Block: {stockDetails.blockName}
              </div>
            </div>
          )}
        </DialogHeader>

        {isEmpty ? (
          <div className="py-12 text-center text-muted-foreground">
            No active stock found in this block.
          </div>
        ) : (
          <div className="space-y-6">
            {stockDetails!.customerGroups.map((customerGroup, customerIndex) => (
              <div key={customerGroup.customerId} className="space-y-3">
                {/* Customer Header */}
                <div className="border-b-2 border-primary pb-2">
                  <h3 className="text-lg font-semibold text-primary">
                    {customerGroup.customerName}
                  </h3>
                </div>

                {/* Customer Stock Table */}
<div className="overflow-hidden rounded-lg border border-slate-300 bg-slate-50 shadow-sm">
  <Table>
    <TableHeader className="bg-slate-200">
      <TableRow className="border-b-2 border-slate-300 hover:bg-slate-200">
        <TableHead className="w-[60px] font-bold text-slate-800">
          Sr No
        </TableHead>

        <TableHead className="font-bold text-slate-800">
          Item Name
        </TableHead>

        <TableHead className="font-bold text-slate-800">
          Brand
        </TableHead>

        <TableHead className="font-bold text-slate-800">
          Batch
        </TableHead>

        <TableHead className="font-bold text-slate-800">
          Inward No
        </TableHead>

        <TableHead className="text-right font-bold text-slate-800">
          Stock Qty
        </TableHead>

        <TableHead className="text-right font-bold text-slate-800">
          Stock Weight
        </TableHead>
      </TableRow>
    </TableHeader>

    <TableBody>
      {customerGroup.items.map((item, itemIndex) => (
        <TableRow
          key={item.rentalItemId}
          className="border-b border-slate-200 bg-white hover:bg-slate-100"
        >
          <TableCell className="font-semibold text-slate-800">
            {itemIndex + 1}
          </TableCell>

          <TableCell className="font-semibold text-slate-900">
            {item.itemName}
          </TableCell>

          <TableCell className="font-medium text-slate-700">
            {item.brand}
          </TableCell>

          <TableCell className="font-medium text-slate-700">
            {item.batch}
          </TableCell>

          <TableCell className="font-mono text-sm font-medium text-slate-700">
            {item.inwardNumber}
          </TableCell>

          <TableCell className="text-right font-mono font-medium text-slate-900">
            {item.balanceQty}
          </TableCell>

          <TableCell className="text-right font-mono font-medium text-slate-900">
            {item.balanceWeight.toFixed(2)}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>

                {/* Customer Total */}
                <div className="flex justify-end space-x-6 text-sm bg-muted/50 p-3 rounded-md">
                  <div>
                    <span className="font-medium">Customer Total Qty:</span>{' '}
                    <span className="font-mono font-bold">{customerGroup.totalBalanceQty}</span>
                  </div>
                  <div>
                    <span className="font-medium">Customer Total Weight:</span>{' '}
                    <span className="font-mono font-bold">{customerGroup.totalBalanceWeight.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Block Grand Total */}
            <div className="border-t-2 border-primary pt-4">
              <div className="flex justify-end space-x-6 text-base bg-primary/10 p-4 rounded-md">
                <div>
                  <span className="">Block Grand Total Qty:</span>{' '}
                  <span className="font-mono text-lg">{stockDetails!.totalBalanceQty}</span>
                </div>
                <div>
                  <span className="">Block Grand Total Weight:</span>{' '}
                  <span className="font-mono text-lg">{stockDetails!.totalBalanceWeight.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
