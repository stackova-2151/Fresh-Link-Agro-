/**
 * Dashboard metrics — Firestore-only, async.
 * All functions return Promises. Call from useEffect with loading state.
 */
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type TodayCounts = {
  todayInwardCount: number;
  todayOutwardCount: number;
};

export type TotalStock = {
  totalQuantity: number;
  totalWeight: number;
};

export type UserCounts = {
  totalAdmins: number;
  activeAdmins: number;
  inactiveAdmins: number;
  totalSubAdmins: number;
  activeSubAdmins: number;
  inactiveSubAdmins: number;
};

export type OccupancyStatus = 'LOW' | 'MEDIUM' | 'HIGH';

export type ChamberOccupancyRow = {
  chamberId: string;
  chamberName: string;
  capacityVolume: number;
  usedVolume: number;
  emptyVolume: number;
  occupiedPercent: number;
  emptyPercent: number;
  occupancyStatus: OccupancyStatus;
};

function toIsoDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function safeNumber(n: unknown) {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

function percent(part: number, total: number) {
  const p = total > 0 ? (part / total) * 100 : 0;
  return Math.max(0, Math.min(100, p));
}

function statusFromOccupiedPercent(p: number): OccupancyStatus {
  if (p <= 50) return 'LOW';
  if (p <= 80) return 'MEDIUM';
  return 'HIGH';
}

export async function getTodayCounts(): Promise<TodayCounts> {
  const today = toIsoDate(new Date());

  const [inwardSnap, outwardSnap] = await Promise.all([
    getDocs(query(collection(db, 'inwardVouchers'), where('date', '==', today))),
    getDocs(query(collection(db, 'outwardVouchers'), where('date', '==', today))),
  ]);

  return {
    todayInwardCount: inwardSnap.size,
    todayOutwardCount: outwardSnap.size,
  };
}

export async function getTotalStock(): Promise<TotalStock> {
  const snap = await getDocs(collection(db, 'rentalItems'));

  let totalQuantity = 0;
  let totalWeight = 0;

  snap.docs.forEach((d) => {
    const data = d.data();
    totalQuantity += safeNumber(data.quantityAvailable);
    totalWeight += safeNumber(data.balanceWeight);
  });

  return { totalQuantity, totalWeight };
}

export async function getUserCounts(): Promise<UserCounts> {
  const snap = await getDocs(collection(db, 'users'));

  let totalAdmins = 0;
  let activeAdmins = 0;
  let totalSubAdmins = 0;
  let activeSubAdmins = 0;

  snap.docs.forEach((d) => {
    const data = d.data() as { role: string; status: string };
    const isActive = data.status !== 'INACTIVE';

    if (data.role === 'ADMIN') {
      totalAdmins++;
      if (isActive) activeAdmins++;
    } else if (data.role === 'SUB_ADMIN') {
      totalSubAdmins++;
      if (isActive) activeSubAdmins++;
    }
  });

  return {
    totalAdmins,
    activeAdmins,
    inactiveAdmins: totalAdmins - activeAdmins,
    totalSubAdmins,
    activeSubAdmins,
    inactiveSubAdmins: totalSubAdmins - activeSubAdmins,
  };
}

export async function getChamberOccupancy(): Promise<ChamberOccupancyRow[]> {
  const [chambersSnap, itemsSnap] = await Promise.all([
    getDocs(collection(db, 'chambers')),
    getDocs(collection(db, 'rentalItems')),
  ]);

  // Group items by chamberId
  const itemsByChamber = new Map<string, Array<{ quantityAvailable: number; boxDimensions?: { length: number; width: number; height: number } }>>();

  itemsSnap.docs.forEach((d) => {
    const data = d.data();
    if (!data.chamberId) return;
    const arr = itemsByChamber.get(data.chamberId) || [];
    arr.push(data as { quantityAvailable: number; boxDimensions?: { length: number; width: number; height: number } });
    itemsByChamber.set(data.chamberId, arr);
  });

  return chambersSnap.docs.map((d) => {
    const chamber = d.data() as {
      id?: string;
      name: string;
      boxDimensions?: { length: number; width: number; height: number };
    };
    const chamberId = d.id;
    const dims = chamber.boxDimensions;
    const capacityVolume = dims
      ? safeNumber(dims.length) * safeNumber(dims.width) * safeNumber(dims.height)
      : 0;

    const chamberItems = itemsByChamber.get(chamberId) || [];
    const usedVolume = chamberItems.reduce((acc, item) => {
      const itemDims = item.boxDimensions;
      const itemVolume = itemDims
        ? safeNumber(itemDims.length) * safeNumber(itemDims.width) * safeNumber(itemDims.height)
        : 0;
      return acc + itemVolume * safeNumber(item.quantityAvailable);
    }, 0);

    const cappedUsed = Math.min(usedVolume, capacityVolume);
    const emptyVolume = Math.max(0, capacityVolume - cappedUsed);
    const occupiedPercent = percent(cappedUsed, capacityVolume);

    return {
      chamberId,
      chamberName: chamber.name,
      capacityVolume,
      usedVolume: cappedUsed,
      emptyVolume,
      occupiedPercent,
      emptyPercent: 100 - occupiedPercent,
      occupancyStatus: statusFromOccupiedPercent(occupiedPercent),
    };
  });
}
