'use client';

import { chambers, rentalItems } from '@/lib/data';
import { loadInwardVouchers, loadOutwardVouchers } from '@/lib/voucher-storage';
import { loadUsers, normalizeStatus } from '@/lib/user-storage';

import type { UserStatus } from '@/lib/types';

type TodayCounts = {
  todayInwardCount: number;
  todayOutwardCount: number;
};

type TotalStock = {
  totalQuantity: number;
  totalWeight: number;
};

type UserCounts = {
  totalAdmins: number;
  activeAdmins: number;
  inactiveAdmins: number;
  totalSubAdmins: number;
  activeSubAdmins: number;
  inactiveSubAdmins: number;
};

type OccupancyStatus = 'LOW' | 'MEDIUM' | 'HIGH';

type ChamberOccupancyRow = {
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

export function getTodayCounts(): TodayCounts {
  const today = toIsoDate(new Date());

  const inward = loadInwardVouchers();
  const outward = loadOutwardVouchers();

  return {
    todayInwardCount: inward.filter((v) => v.date === today).length,
    todayOutwardCount: outward.filter((v) => v.date === today).length,
  };
}

export function getTotalStock(): TotalStock {
  const totalQuantity = rentalItems.reduce((acc, item) => acc + safeNumber(item.quantityAvailable), 0);
  const totalWeight = rentalItems.reduce((acc, item) => acc + safeNumber(item.balanceWeight), 0);
  return { totalQuantity, totalWeight };
}

export function getUserCounts(): UserCounts {
  const users = loadUsers();

  const isActive = (status: UserStatus | undefined) => normalizeStatus(status) === 'ACTIVE';

  const admins = users.filter((u) => u.role === 'ADMIN');
  const subAdmins = users.filter((u) => u.role === 'SUB_ADMIN');

  const activeAdmins = admins.filter((u) => isActive(u.status)).length;
  const activeSubAdmins = subAdmins.filter((u) => isActive(u.status)).length;

  return {
    totalAdmins: admins.length,
    activeAdmins,
    inactiveAdmins: admins.length - activeAdmins,
    totalSubAdmins: subAdmins.length,
    activeSubAdmins,
    inactiveSubAdmins: subAdmins.length - activeSubAdmins,
  };
}

export function getChamberOccupancy(): ChamberOccupancyRow[] {
  const itemsByChamber = new Map<string, typeof rentalItems>();

  rentalItems.forEach((item) => {
    if (!item.chamberId) return;
    const arr = itemsByChamber.get(item.chamberId) || [];
    arr.push(item);
    itemsByChamber.set(item.chamberId, arr);
  });

  return chambers.map((chamber) => {
    const dims = chamber.boxDimensions;
    const capacityVolume = dims ? safeNumber(dims.length) * safeNumber(dims.width) * safeNumber(dims.height) : 0;

    const chamberItems = itemsByChamber.get(chamber.id) || [];

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
    const emptyPercent = 100 - occupiedPercent;

    return {
      chamberId: chamber.id,
      chamberName: chamber.name,
      capacityVolume,
      usedVolume: cappedUsed,
      emptyVolume,
      occupiedPercent,
      emptyPercent,
      occupancyStatus: statusFromOccupiedPercent(occupiedPercent),
    };
  });
}
