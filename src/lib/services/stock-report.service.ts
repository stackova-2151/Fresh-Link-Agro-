import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { clientsService } from '@/lib/firestore';
import { chambersService } from '@/lib/firestore';
import type {
  StockReportData,
  StockReportCustomerGroup,
  StockReportRow,
  StockReportItemWiseData,
  StockReportItemGroup,
  StockReportItemRow,
  StockReportChamberWiseData,
  StockReportChamberGroup,
  StockReportChamberRow,
  InwardVoucher,
  OutwardVoucher,
  InwardVoucherItem,
  OutwardVoucherItem,
} from '@/lib/types/stock-report';
import type { Client, Chamber } from '@/lib/types';

export async function generateStockReport(customerId?: string): Promise<StockReportData> {
  console.log('========== STOCK REPORT GENERATION START ==========');
  console.log('Customer ID:', customerId || 'ALL CUSTOMERS');

  // Fetch all clients
  console.log('========== FETCHING CLIENTS ==========');
  const clients = await clientsService.getAll();
  console.log('Clients Loaded:', clients.length);

  // Filter clients if specific customer selected
  const clientsToProcess = customerId 
    ? clients.filter(c => c.id === customerId)
    : clients;
  console.log('Clients to Process:', clientsToProcess.length);

  // Fetch all chambers for chamber names
  console.log('========== FETCHING CHAMBERS ==========');
  const chambers = await chambersService.getAll();
  console.log('Chambers Loaded:', chambers.length);
  const chamberMap = new Map(chambers.map(c => [c.id, c.name]));

  // Fetch all inward vouchers
  console.log('========== FETCHING INWARD VOUCHERS ==========');
  const inwardQuery = query(
    collection(db, 'inwardVouchers'),
    orderBy('date', 'asc')
  );
  const inwardSnap = await getDocs(inwardQuery);
  const inwardVouchers = inwardSnap.docs.map((d) => ({ id: d.id, ...d.data() } as InwardVoucher));
  console.log('Inward Vouchers Count:', inwardVouchers.length);

  // Fetch all outward vouchers
  console.log('========== FETCHING OUTWARD VOUCHERS ==========');
  const outwardQuery = query(
    collection(db, 'outwardVouchers'),
    orderBy('date', 'asc')
  );
  const outwardSnap = await getDocs(outwardQuery);
  const outwardVouchers = outwardSnap.docs.map((d) => ({ id: d.id, ...d.data() } as OutwardVoucher));
  console.log('Outward Vouchers Count:', outwardVouchers.length);

  // Group inward items by customer and inward number
  const inwardMap = new Map<string, Map<string, InwardVoucherItem[]>>();
  inwardVouchers.forEach(voucher => {
    if (!inwardMap.has(voucher.clientId)) {
      inwardMap.set(voucher.clientId, new Map());
    }
    const clientMap = inwardMap.get(voucher.clientId)!;
    if (!clientMap.has(voucher.inwardNo)) {
      clientMap.set(voucher.inwardNo, []);
    }
    clientMap.get(voucher.inwardNo)!.push(...voucher.items);
  });

  // Group outward items by customer and inward number
  const outwardMap = new Map<string, Map<string, OutwardVoucherItem[]>>();
  outwardVouchers.forEach(voucher => {
    if (!outwardMap.has(voucher.clientId)) {
      outwardMap.set(voucher.clientId, new Map());
    }
    const clientMap = outwardMap.get(voucher.clientId)!;
    voucher.items.forEach(item => {
      if (!clientMap.has(item.inwardNumber)) {
        clientMap.set(item.inwardNumber, []);
      }
      clientMap.get(item.inwardNumber)!.push(item);
    });
  });

  console.log('========== GENERATING CUSTOMER GROUPS ==========');
  const customerGroups: StockReportCustomerGroup[] = [];

  for (const client of clientsToProcess) {
    console.log('\n--- Processing Customer:', client.name, '---');

    const clientInwardMap = inwardMap.get(client.id) || new Map();
    const clientOutwardMap = outwardMap.get(client.id) || new Map();

    const rows: StockReportRow[] = [];
    let totalInvQty = 0;
    let totalOutQty = 0;
    let totalBalQty = 0;
    let totalInvWeight = 0;
    let totalOutWeight = 0;
    let totalBalWeight = 0;

    // Process each inward entry
    for (const [inwardNo, inwardItems] of clientInwardMap) {
      const inwardVoucher = inwardVouchers.find(v => v.inwardNo === inwardNo);
      const inwardDate = inwardVoucher?.date || '';

      for (const inwardItem of inwardItems) {
        const outwardItems = clientOutwardMap.get(inwardNo) || [];
        
        // Sum all outward quantities for this inward item
        let totalOutQtyForItem = 0;
        let totalOutWeightForItem = 0;
        
        outwardItems.forEach((outItem: OutwardVoucherItem) => {
          if (outItem.itemName === inwardItem.itemName && 
              outItem.brand === inwardItem.brand &&
              outItem.batch === inwardItem.batch) {
            totalOutQtyForItem += typeof outItem.qty === 'number' ? outItem.qty : 0;
            totalOutWeightForItem += outItem.totalWeight;
          }
        });

        const invQty = typeof inwardItem.bags === 'number' ? inwardItem.bags : 0;
        const invWeight = inwardItem.totalWeight;
        const outQty = totalOutQtyForItem;
        const outWeight = totalOutWeightForItem;
        const balQty = invQty - outQty;
        const balWeight = invWeight - outWeight;

        // Calculate balance days
        const balDay = inwardDate ? Math.floor((new Date().getTime() - new Date(inwardDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

        const chamberName = chamberMap.get(inwardItem.chamberId) || 'Unassigned';

        const row: StockReportRow = {
          invNo: inwardNo,
          invDate: inwardDate,
          chamberName,
          itemDescription: inwardItem.itemName,
          brand: inwardItem.brand,
          batchNumber: inwardItem.batch,
          invQty,
          outQty,
          balQty,
          invWeight,
          outWeight,
          balWeight,
          balDay,
        };

        rows.push(row);

        // Add to totals
        totalInvQty += invQty;
        totalOutQty += outQty;
        totalBalQty += balQty;
        totalInvWeight += invWeight;
        totalOutWeight += outWeight;
        totalBalWeight += balWeight;
      }
    }

    console.log('Rows Generated for', client.name, ':', rows.length);

    if (rows.length > 0) {
      customerGroups.push({
        customerName: client.name,
        clientId: client.id,
        rows,
        totals: {
          totalInvQty,
          totalOutQty,
          totalBalQty,
          totalInvWeight,
          totalOutWeight,
          totalBalWeight,
        },
      });
    }
  }

  console.log('========== STOCK REPORT GENERATION COMPLETE ==========');
  console.log('Customer Groups:', customerGroups.length);
  console.log('Total Rows:', customerGroups.reduce((sum, g) => sum + g.rows.length, 0));

  return {
    customerGroups,
    reportDate: new Date().toISOString(),
  };
}

export async function generateStockReportItemWise(params: {
  customerId?: string;
  itemName?: string;
  asOnDate?: string;
  reportType?: 'all' | 'bal';
}): Promise<StockReportItemWiseData> {
  console.log('========== STOCK REPORT ITEM WISE GENERATION START ==========');
  console.log('Customer ID:', params.customerId || 'ALL CUSTOMERS');
  console.log('Item Name:', params.itemName || 'ALL ITEMS');
  console.log('As On Date:', params.asOnDate || new Date().toISOString());
  console.log('Report Type:', params.reportType || 'all');

  const asOnDate = params.asOnDate || new Date().toISOString();

  // Fetch all clients
  console.log('========== FETCHING CLIENTS ==========');
  const clients = await clientsService.getAll();
  console.log('Clients Loaded:', clients.length);

  // Filter clients if specific customer selected
  const clientsToProcess = params.customerId
    ? clients.filter(c => c.id === params.customerId)
    : clients;
  console.log('Clients to Process:', clientsToProcess.length);

  const clientMap = new Map(clients.map(c => [c.id, c.name]));

  // Fetch all inward vouchers
  console.log('========== FETCHING INWARD VOUCHERS ==========');
  const inwardQuery = query(
    collection(db, 'inwardVouchers'),
    orderBy('date', 'asc')
  );
  const inwardSnap = await getDocs(inwardQuery);
  const inwardVouchers = inwardSnap.docs.map((d) => ({ id: d.id, ...d.data() } as InwardVoucher));
  console.log('Inward Vouchers Count:', inwardVouchers.length);

  // Fetch all outward vouchers
  console.log('========== FETCHING OUTWARD VOUCHERS ==========');
  const outwardQuery = query(
    collection(db, 'outwardVouchers'),
    orderBy('date', 'asc')
  );
  const outwardSnap = await getDocs(outwardQuery);
  const outwardVouchers = outwardSnap.docs.map((d) => ({ id: d.id, ...d.data() } as OutwardVoucher));
  console.log('Outward Vouchers Count:', outwardVouchers.length);

  // Group inward items by customer and inward number
  const inwardMap = new Map<string, Map<string, InwardVoucherItem[]>>();
  inwardVouchers.forEach(voucher => {
    if (!inwardMap.has(voucher.clientId)) {
      inwardMap.set(voucher.clientId, new Map());
    }
    const clientMap = inwardMap.get(voucher.clientId)!;
    if (!clientMap.has(voucher.inwardNo)) {
      clientMap.set(voucher.inwardNo, []);
    }
    clientMap.get(voucher.inwardNo)!.push(...voucher.items);
  });

  // Group outward items by customer and inward number
  const outwardMap = new Map<string, Map<string, OutwardVoucherItem[]>>();
  outwardVouchers.forEach(voucher => {
    if (!outwardMap.has(voucher.clientId)) {
      outwardMap.set(voucher.clientId, new Map());
    }
    const clientMap = outwardMap.get(voucher.clientId)!;
    voucher.items.forEach(item => {
      if (!clientMap.has(item.inwardNumber)) {
        clientMap.set(item.inwardNumber, []);
      }
      clientMap.get(item.inwardNumber)!.push(item);
    });
  });

  console.log('========== GENERATING ITEM GROUPS ==========');

  // Collect all rows first
  const allRows: StockReportItemRow[] = [];

  for (const client of clientsToProcess) {
    console.log('\n--- Processing Customer:', client.name, '---');

    const clientInwardMap = inwardMap.get(client.id) || new Map();
    const clientOutwardMap = outwardMap.get(client.id) || new Map();

    // Process each inward entry
    for (const [inwardNo, inwardItems] of clientInwardMap) {
      const inwardVoucher = inwardVouchers.find(v => v.inwardNo === inwardNo);
      const inwardDate = inwardVoucher?.date || '';

      for (const inwardItem of inwardItems) {
        // Filter by item name if specified
        if (params.itemName && inwardItem.itemName !== params.itemName) {
          continue;
        }

        const outwardItems = clientOutwardMap.get(inwardNo) || [];

        // Sum all outward quantities for this inward item
        let totalOutQtyForItem = 0;
        let totalOutWeightForItem = 0;

        outwardItems.forEach((outItem: OutwardVoucherItem) => {
          if (outItem.itemName === inwardItem.itemName &&
              outItem.brand === inwardItem.brand &&
              outItem.batch === inwardItem.batch) {
            totalOutQtyForItem += typeof outItem.qty === 'number' ? outItem.qty : 0;
            totalOutWeightForItem += outItem.totalWeight;
          }
        });

        const invQty = typeof inwardItem.bags === 'number' ? inwardItem.bags : 0;
        const invWeight = inwardItem.totalWeight;
        const outQty = totalOutQtyForItem;
        const outWeight = totalOutWeightForItem;
        const balQty = invQty - outQty;
        const balWeight = invWeight - outWeight;

        // Calculate balance days based on asOnDate
        const balDay = inwardDate ? Math.floor((new Date(asOnDate).getTime() - new Date(inwardDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

        // For Bal Qty report, skip rows with zero balance
        if (params.reportType === 'bal' && balQty <= 0) {
          continue;
        }

        const row: StockReportItemRow = {
          invNo: inwardNo,
          invDate: inwardDate,
          brand: inwardItem.brand,
          batchNumber: inwardItem.batch,
          invQty,
          outQty,
          balQty,
          invWeight,
          outWeight,
          balWeight,
          balDay,
          customerName: client.name,
          itemName: inwardItem.itemName,
        };

        allRows.push(row);
      }
    }
  }

  console.log('Total Rows Generated:', allRows.length);

  // Group rows by item name
  const itemMap = new Map<string, StockReportItemRow[]>();
  allRows.forEach(row => {
    const itemName = row.itemName || 'Unknown';
    if (!itemMap.has(itemName)) {
      itemMap.set(itemName, []);
    }
    itemMap.get(itemName)!.push(row);
  });

  // Create item groups with totals
  const itemGroups: StockReportItemGroup[] = [];
  for (const [itemName, rows] of itemMap.entries()) {
    let totalInvQty = 0;
    let totalOutQty = 0;
    let totalBalQty = 0;
    let totalInvWeight = 0;
    let totalOutWeight = 0;
    let totalBalWeight = 0;

    rows.forEach(row => {
      totalInvQty += row.invQty;
      totalOutQty += row.outQty;
      totalBalQty += row.balQty;
      totalInvWeight += row.invWeight;
      totalOutWeight += row.outWeight;
      totalBalWeight += row.balWeight;
    });

    itemGroups.push({
      itemName,
      rows,
      totals: {
        totalInvQty,
        totalOutQty,
        totalBalQty,
        totalInvWeight,
        totalOutWeight,
        totalBalWeight,
      },
    });
  }

  // Sort item groups alphabetically
  itemGroups.sort((a, b) => a.itemName.localeCompare(b.itemName));

  console.log('========== STOCK REPORT ITEM WISE GENERATION COMPLETE ==========');
  console.log('Item Groups:', itemGroups.length);
  console.log('Total Rows:', allRows.length);

  return {
    itemGroups,
    reportDate: new Date().toISOString(),
    asOnDate,
    customerName: params.customerId ? clientMap.get(params.customerId) : undefined,
  };
}

export async function getUniqueItemNames(customerId?: string): Promise<string[]> {
  console.log('========== FETCHING UNIQUE ITEM NAMES ==========');
  console.log('Customer ID:', customerId || 'ALL CUSTOMERS');

  // Fetch all inward vouchers
  const inwardQuery = query(
    collection(db, 'inwardVouchers'),
    orderBy('date', 'asc')
  );
  const inwardSnap = await getDocs(inwardQuery);
  const inwardVouchers = inwardSnap.docs.map((d) => ({ id: d.id, ...d.data() } as InwardVoucher));

  // Filter by customer if specified
  const vouchersToProcess = customerId
    ? inwardVouchers.filter(v => v.clientId === customerId)
    : inwardVouchers;

  // Collect unique item names
  const itemNamesSet = new Set<string>();
  vouchersToProcess.forEach(voucher => {
    voucher.items.forEach(item => {
      if (item.itemName) {
        itemNamesSet.add(item.itemName);
      }
    });
  });

  const itemNames = Array.from(itemNamesSet).sort();
  console.log('Unique Item Names:', itemNames.length);

  return itemNames;
}

export async function generateStockReportChamberWise(params: {
  customerId?: string;
  chamberName?: string;
  asOnDate?: string;
}): Promise<StockReportChamberWiseData> {
  console.log('========== STOCK REPORT CHAMBER WISE GENERATION START ==========');
  console.log('Customer ID:', params.customerId || 'ALL CUSTOMERS');
  console.log('Chamber Name:', params.chamberName || 'ALL CHAMBERS');
  console.log('As On Date:', params.asOnDate || new Date().toISOString());

  const asOnDate = params.asOnDate || new Date().toISOString();

  // Fetch all clients
  console.log('========== FETCHING CLIENTS ==========');
  const clients = await clientsService.getAll();
  console.log('Clients Loaded:', clients.length);

  // Filter clients if specific customer selected
  const clientsToProcess = params.customerId
    ? clients.filter(c => c.id === params.customerId)
    : clients;
  console.log('Clients to Process:', clientsToProcess.length);

  const clientMap = new Map(clients.map(c => [c.id, c.name]));

  // Fetch all chambers for chamber names
  console.log('========== FETCHING CHAMBERS ==========');
  const chambers = await chambersService.getAll();
  console.log('Chambers Loaded:', chambers.length);
  const chamberMap = new Map(chambers.map(c => [c.id, c.name]));

  // Fetch all inward vouchers
  console.log('========== FETCHING INWARD VOUCHERS ==========');
  const inwardQuery = query(
    collection(db, 'inwardVouchers'),
    orderBy('date', 'asc')
  );
  const inwardSnap = await getDocs(inwardQuery);
  const inwardVouchers = inwardSnap.docs.map((d) => ({ id: d.id, ...d.data() } as InwardVoucher));
  console.log('Inward Vouchers Count:', inwardVouchers.length);

  // Fetch all outward vouchers
  console.log('========== FETCHING OUTWARD VOUCHERS ==========');
  const outwardQuery = query(
    collection(db, 'outwardVouchers'),
    orderBy('date', 'asc')
  );
  const outwardSnap = await getDocs(outwardQuery);
  const outwardVouchers = outwardSnap.docs.map((d) => ({ id: d.id, ...d.data() } as OutwardVoucher));
  console.log('Outward Vouchers Count:', outwardVouchers.length);

  // Group inward items by customer and inward number
  const inwardMap = new Map<string, Map<string, InwardVoucherItem[]>>();
  inwardVouchers.forEach(voucher => {
    if (!inwardMap.has(voucher.clientId)) {
      inwardMap.set(voucher.clientId, new Map());
    }
    const clientMap = inwardMap.get(voucher.clientId)!;
    if (!clientMap.has(voucher.inwardNo)) {
      clientMap.set(voucher.inwardNo, []);
    }
    clientMap.get(voucher.inwardNo)!.push(...voucher.items);
  });

  // Group outward items by customer and inward number
  const outwardMap = new Map<string, Map<string, OutwardVoucherItem[]>>();
  outwardVouchers.forEach(voucher => {
    if (!outwardMap.has(voucher.clientId)) {
      outwardMap.set(voucher.clientId, new Map());
    }
    const clientMap = outwardMap.get(voucher.clientId)!;
    voucher.items.forEach(item => {
      if (!clientMap.has(item.inwardNumber)) {
        clientMap.set(item.inwardNumber, []);
      }
      clientMap.get(item.inwardNumber)!.push(item);
    });
  });

  console.log('========== GENERATING CHAMBER GROUPS ==========');

  // Collect all rows first
  const allRows: StockReportChamberRow[] = [];

  for (const client of clientsToProcess) {
    console.log('\n--- Processing Customer:', client.name, '---');

    const clientInwardMap = inwardMap.get(client.id) || new Map();
    const clientOutwardMap = outwardMap.get(client.id) || new Map();

    // Process each inward entry
    for (const [inwardNo, inwardItems] of clientInwardMap) {
      const inwardVoucher = inwardVouchers.find(v => v.inwardNo === inwardNo);
      const inwardDate = inwardVoucher?.date || '';

      for (const inwardItem of inwardItems) {
        const chamberName = chamberMap.get(inwardItem.chamberId) || 'Unassigned';

        // Filter by chamber name if specified
        if (params.chamberName && chamberName !== params.chamberName) {
          continue;
        }

        const outwardItems = clientOutwardMap.get(inwardNo) || [];

        // Sum all outward quantities for this inward item
        let totalOutQtyForItem = 0;
        let totalOutWeightForItem = 0;

        outwardItems.forEach((outItem: OutwardVoucherItem) => {
          if (outItem.itemName === inwardItem.itemName &&
              outItem.brand === inwardItem.brand &&
              outItem.batch === inwardItem.batch) {
            totalOutQtyForItem += typeof outItem.qty === 'number' ? outItem.qty : 0;
            totalOutWeightForItem += outItem.totalWeight;
          }
        });

        const invQty = typeof inwardItem.bags === 'number' ? inwardItem.bags : 0;
        const invWeight = inwardItem.totalWeight;
        const outQty = totalOutQtyForItem;
        const outWeight = totalOutWeightForItem;
        const balQty = invQty - outQty;
        const balWeight = invWeight - outWeight;

        // Calculate balance days based on asOnDate
        const balDay = inwardDate ? Math.floor((new Date(asOnDate).getTime() - new Date(inwardDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

        const row: StockReportChamberRow = {
          invNo: inwardNo,
          invDate: inwardDate,
          itemDescription: inwardItem.itemName,
          brand: inwardItem.brand,
          batchNumber: inwardItem.batch,
          invQty,
          outQty,
          balQty,
          invWeight,
          outWeight,
          balWeight,
          balDay,
          customerName: client.name,
          chamberName,
        };

        allRows.push(row);
      }
    }
  }

  console.log('Total Rows Generated:', allRows.length);

  // Group rows by chamber name
  const chamberGroupMap = new Map<string, StockReportChamberRow[]>();
  allRows.forEach(row => {
    if (!chamberGroupMap.has(row.chamberName)) {
      chamberGroupMap.set(row.chamberName, []);
    }
    chamberGroupMap.get(row.chamberName)!.push(row);
  });

  // Create chamber groups with totals
  const chamberGroups: StockReportChamberGroup[] = [];
  for (const [chamberName, rows] of chamberGroupMap.entries()) {
    let totalInvQty = 0;
    let totalOutQty = 0;
    let totalBalQty = 0;
    let totalInvWeight = 0;
    let totalOutWeight = 0;
    let totalBalWeight = 0;

    rows.forEach(row => {
      totalInvQty += row.invQty;
      totalOutQty += row.outQty;
      totalBalQty += row.balQty;
      totalInvWeight += row.invWeight;
      totalOutWeight += row.outWeight;
      totalBalWeight += row.balWeight;
    });

    chamberGroups.push({
      chamberName,
      rows,
      totals: {
        totalInvQty,
        totalOutQty,
        totalBalQty,
        totalInvWeight,
        totalOutWeight,
        totalBalWeight,
      },
    });
  }

  // Sort chamber groups alphabetically
  chamberGroups.sort((a, b) => a.chamberName.localeCompare(b.chamberName));

  console.log('========== STOCK REPORT CHAMBER WISE GENERATION COMPLETE ==========');
  console.log('Chamber Groups:', chamberGroups.length);
  console.log('Total Rows:', allRows.length);

  return {
    chamberGroups,
    reportDate: new Date().toISOString(),
    asOnDate,
    customerName: params.customerId ? clientMap.get(params.customerId) : undefined,
  };
}

export async function getUniqueChamberNames(customerId?: string): Promise<string[]> {
  console.log('========== FETCHING UNIQUE CHAMBER NAMES ==========');
  console.log('Customer ID:', customerId || 'ALL CUSTOMERS');

  // Fetch all inward vouchers
  const inwardQuery = query(
    collection(db, 'inwardVouchers'),
    orderBy('date', 'asc')
  );
  const inwardSnap = await getDocs(inwardQuery);
  const inwardVouchers = inwardSnap.docs.map((d) => ({ id: d.id, ...d.data() } as InwardVoucher));

  // Fetch all chambers for chamber names
  const chambers = await chambersService.getAll();
  const chamberMap = new Map(chambers.map(c => [c.id, c.name]));

  // Filter by customer if specified
  const vouchersToProcess = customerId
    ? inwardVouchers.filter(v => v.clientId === customerId)
    : inwardVouchers;

  // Collect unique chamber names
  const chamberNamesSet = new Set<string>();
  vouchersToProcess.forEach(voucher => {
    voucher.items.forEach(item => {
      const chamberName = chamberMap.get(item.chamberId);
      if (chamberName) {
        chamberNamesSet.add(chamberName);
      }
    });
  });

  const chamberNames = Array.from(chamberNamesSet).sort();
  console.log('Unique Chamber Names:', chamberNames.length);

  return chamberNames;
}
