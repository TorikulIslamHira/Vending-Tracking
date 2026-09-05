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
  createdAt: Date | string;
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
}
