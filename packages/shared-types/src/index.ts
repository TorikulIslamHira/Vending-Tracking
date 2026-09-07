/**
 * Core Enums for Vending SaaS (Mapped to Prisma Models)
 */
export const UserRole = {
  ADMIN: "ADMIN",
  FIELD_AGENT: "FIELD_AGENT",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const MachineStatus = {
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
} as const;
export type MachineStatus = (typeof MachineStatus)[keyof typeof MachineStatus];

export const EntryType = {
  STANDARD: "STANDARD",
  MANUAL: "MANUAL",
  REVERSE: "REVERSE",
} as const;
export type EntryType = (typeof EntryType)[keyof typeof EntryType];

/**
 * Core Domain Interfaces (Database & SaaS layer)
 */

export interface ITenant {
  id: string;
  name: string;
  currency?: string;
  themeConfig?: Record<string, any> | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface IUser {
  id: string;
  tenantId: string;
  name: string;
  role: UserRole;
  email: string;
  passwordHash?: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface IMachine {
  id: string;
  tenantId: string;
  storeId?: string | null;
  serialNumber: string;
  location: string;
  category?: string | null;
  type?: string | null;
  capacity?: number | null;
  status: MachineStatus;
  qrCode: string;
  virtualCashBalance: number;
  pricePerPlay?: number | string | null;
  currentEstimatedStock?: number;
  keyNumber?: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface IPacketConfig {
  id: string;
  tenantId: string;
  name: string;
  brand: string;
  quantityPerPacket: number;
  pricePerItem: number;
  packetCost?: number | string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface IInventoryLog {
  id: string;
  tenantId: string;
  machineId: string;
  agentId: string;
  packetId?: string | null;
  entryType: EntryType;
  quantityAdded: number;
  remarks: string;
  reversedLogId?: string | null;
  createdAt: Date | string;
}

export interface ICashLog {
  id: string;
  tenantId: string;
  machineId: string;
  agentId: string;
  collectedAmount: number;
  expectedAmount: number;
  discrepancy: number;
  remarks?: string | null;
  stockCleared: boolean;
  isPartial: boolean;
  createdAt: Date | string;
}

export type ActivityLogType = "INVENTORY" | "CASH";

export interface IMachineActivityLog {
  id: string;
  logType: ActivityLogType;
  tenantId: string;
  machineId: string;
  agentId: string;
  entryType?: EntryType | string | null;
  quantityAdded?: number | null;
  packetId?: string | null;
  packet?: {
    id: string;
    name: string;
    brand: string;
  } | null;
  collectedAmount?: number | null;
  expectedAmount?: number | null;
  discrepancy?: number | null;
  isShortage?: boolean | null;
  stockCleared?: boolean | null;
  isPartial?: boolean | null;
  remarks?: string | null;
  createdAt: Date | string;
  agent?: {
    id: string;
    name: string;
    email: string;
  } | null;
  machine?: {
    id: string;
    serialNumber: string;
    location: string;
  } | null;
}

/**
 * API Request Payloads (Contracts across apps and services)
 */

export interface RestockPayload {
  machineId: string;
  packetId: string;
  quantity: number;
  remarks?: string;
}

export interface ManualEntryPayload {
  machineId: string;
  quantityAdded: number;
  entryType: EntryType;
  remarks: string;
  brandName?: string;
  packetId?: string | null;
}

export interface CashCollectionPayload {
  machineId: string;
  collectedAmount: number;
  expectedAmount?: number;
  remarks?: string;
  stockCleared?: boolean;
  isPartial?: boolean;
}
