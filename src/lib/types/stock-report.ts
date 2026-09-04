export interface StockReportRow {
  invNo: string;
  invDate: string;
  chamberName: string;
  itemDescription: string;
  brand: string;
  batchNumber: string;
  invQty: number;
  outQty: number;
  balQty: number;
  invWeight: number;
  outWeight: number;
  balWeight: number;
  balDay: number;
}

export interface StockReportCustomerGroup {
  customerName: string;
  clientId: string;
  rows: StockReportRow[];
  totals: {
    totalInvQty: number;
    totalOutQty: number;
    totalBalQty: number;
    totalInvWeight: number;
    totalOutWeight: number;
    totalBalWeight: number;
  };
}

export interface StockReportData {
  customerGroups: StockReportCustomerGroup[];
  reportDate: string;
}

export interface StockReportItemRow {
  invNo: string;
  invDate: string;
  brand: string;
  batchNumber: string;
  invQty: number;
  outQty: number;
  balQty: number;
  invWeight: number;
  outWeight: number;
  balWeight: number;
  balDay: number;
  customerName?: string;
  itemName: string;
}

export interface StockReportItemGroup {
  itemName: string;
  rows: StockReportItemRow[];
  totals: {
    totalInvQty: number;
    totalOutQty: number;
    totalBalQty: number;
    totalInvWeight: number;
    totalOutWeight: number;
    totalBalWeight: number;
  };
}

export interface StockReportItemWiseData {
  itemGroups: StockReportItemGroup[];
  reportDate: string;
  asOnDate: string;
  customerName?: string;
}

export interface StockReportChamberRow {
  invNo: string;
  invDate: string;
  itemDescription: string;
  brand: string;
  batchNumber: string;
  invQty: number;
  outQty: number;
  balQty: number;
  invWeight: number;
  outWeight: number;
  balWeight: number;
  balDay: number;
  customerName?: string;
  chamberName: string;
}

export interface StockReportChamberGroup {
  chamberName: string;
  rows: StockReportChamberRow[];
  totals: {
    totalInvQty: number;
    totalOutQty: number;
    totalBalQty: number;
    totalInvWeight: number;
    totalOutWeight: number;
    totalBalWeight: number;
  };
}

export interface StockReportChamberWiseData {
  chamberGroups: StockReportChamberGroup[];
  reportDate: string;
  asOnDate: string;
  customerName?: string;
}

export interface InwardVoucherItem {
  id: string;
  itemName: string;
  brand: string;
  batch: string;
  chamberId: string;
  roomId?: string;             // Optional room reference for Chamber → Room → Block structure
  blockId?: string;            // Optional block reference for Chamber → Room → Block structure
  bags: number | '';
  unit: string;
  bagWeight: number | '';
  totalWeight: number;
  rentalItemId?: string;       // Optional: Link to the exact rental item document (for unique identity tracking)
}

export interface InwardVoucher {
  id: string;
  inwardNo: string;
  clientId: string;
  clientName: string;
  date: string;
  items: InwardVoucherItem[];
  // Audit fields
  createdById?: string;
  createdByName?: string;
  createdAt?: string;
  updatedById?: string;
  updatedByName?: string;
  updatedAt?: string;
  updateReason?: string;
  // Version control and concurrency lock
  version?: number;
  activeApprovalRequestId?: string;
  voucherWriteApprovalRequestId?: string; // Idempotency marker for approval-driven voucher writes
}

export interface OutwardVoucherItem {
  id: string;
  itemName: string;
  brand: string;
  batch: string;
  chamberId: string;
  roomId?: string;             // Optional room reference for Chamber → Room → Block structure
  blockId?: string;            // Optional block reference for Chamber → Room → Block structure
  qty: number | '';
  bags: number | '';
  bagWeight: number | '';
  totalWeight: number;
  inwardNumber: string;
  expDate: string;
  sourceRentalItemId: string;
}

export interface OutwardVoucher {
  id: string;
  outwardNo: string;
  clientId: string;
  clientName: string;
  date: string;
  items: OutwardVoucherItem[];
  // Audit fields
  createdById?: string;
  createdByName?: string;
  createdAt?: string;
  updatedById?: string;
  updatedByName?: string;
  updatedAt?: string;
  updateReason?: string;
  // Version control and concurrency lock
  version?: number;
  activeApprovalRequestId?: string;
  voucherWriteApprovalRequestId?: string; // Idempotency marker for approval-driven voucher writes
}

export interface StockReportInwardWiseRow {
  srNo?: number;
  itemName: string;
  brand?: string;
  batch?: string;
  inwardQty?: number;
  inwardWeight?: number;
  outwardNo?: string;
  outwardDate?: string;
  outwardQty?: number;
  outwardWeight?: number;
  balanceQty: number;
  balanceWeight: number;
  rowType: 'INWARD' | 'OUTWARD';
}

export interface StockReportInwardWiseData {
  customerName: string;
  inwardNo: string;
  inwardDate?: string;
  gatePassNo?: string;
  selectedItemName?: string;
  rows: StockReportInwardWiseRow[];
  totalInwardQty: number;
  totalInwardWeight: number;
  totalOutwardQty: number;
  totalOutwardWeight: number;
  totalBalanceQty: number;
  totalBalanceWeight: number;
  reportDate: string;
}

export interface StockReportInwardOutwardWiseRow {
  inwardNo: string;
  inwardDate: string;
  itemName: string;
  brand: string;
  batch: string;
  inwardQty?: number;
  inwardWeight?: number;
  outwardNo?: string;
  outwardDate?: string;
  outwardQty?: number;
  outwardWeight?: number;
  balanceQty: number;
  balanceWeight: number;
  rowType: 'INWARD' | 'OUTWARD';
}

export interface StockReportInwardOutwardWiseData {
  customerName: string;
  customerId: string;
  fromDate: string;
  toDate: string;
  selectedItemName?: string;
  rows: StockReportInwardOutwardWiseRow[];
  totalInwardQty: number;
  totalInwardWeight: number;
  totalOutwardQty: number;
  totalOutwardWeight: number;
  totalBalanceQty: number;
  totalBalanceWeight: number;
  reportDate: string;
}
