import { z } from "zod";
import { UserRole, MachineStatus, EntryType } from "@vending/shared-types";

/**
 * Enums Mapped to Prisma Schemas
 */
export const UserRoleSchema = z.nativeEnum(UserRole);
export const MachineStatusSchema = z.nativeEnum(MachineStatus);
export const EntryTypeSchema = z.nativeEnum(EntryType);

/**
 * 📦 API Payload Validation Schemas (Inventory & Cash workflows)
 */

/**
 * RestockSchema: Validates standard restocks
 * Requires machineId, packetId, positive quantity
 */
export const RestockSchema = z.object({
  machineId: z.string().min(1, "Machine ID is required"),
  packetId: z.string().min(1, "Packet ID is required"),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .positive("Quantity must be greater than 0"),
  remarks: z.string().optional(),
});

export type RestockInput = z.infer<typeof RestockSchema>;
export type RestockDto = RestockInput;

/**
 * ManualEntrySchema: Validates non-standard or reverse entries
 * Requires machineId, quantityAdded, entryType, and strictly mandatory remarks (min 5 chars)
 */
export const ManualEntrySchema = z.object({
  machineId: z.string().min(1, "Machine ID is required"),
  quantityAdded: z
    .number()
    .int("Quantity added must be an integer")
    .refine((val) => val !== 0, "Quantity added cannot be 0"),
  entryType: z.nativeEnum(EntryType, {
    errorMap: () => ({ message: "Invalid entry type (STANDARD, MANUAL, REVERSE)" }),
  }),
  remarks: z
    .string()
    .min(5, "Remarks are strictly mandatory with a minimum of 5 characters"),
  brandName: z.string().optional(),
  packetId: z.string().optional().nullable(),
});

export type ManualEntryInput = z.infer<typeof ManualEntrySchema>;
export type ManualEntryDto = ManualEntryInput;

/**
 * CashCollectionSchema: Validates cash drops
 * Requires machineId, positive collectedAmount
 */
export const CashCollectionSchema = z.object({
  machineId: z.string().min(1, "Machine ID is required"),
  collectedAmount: z
    .number()
    .positive("Collected amount must be positive"),
  expectedAmount: z
    .number()
    .min(0, "Expected amount cannot be negative")
    .optional(),
  remarks: z.string().optional(),
});

export type CashCollectionInput = z.infer<typeof CashCollectionSchema>;
export type CashCollectionDto = CashCollectionInput;

/**
 * 🏢 Master Data & Entity Schemas
 */

export const TenantCreateSchema = z.object({
  name: z.string().min(1, "Tenant name is required"),
  themeConfig: z.record(z.any()).optional().nullable(),
  isActive: z.boolean().default(true),
});

export type TenantCreateInput = z.infer<typeof TenantCreateSchema>;
export type TenantCreateDto = TenantCreateInput;

export const UserCreateSchema = z.object({
  name: z.string().min(1, "User name is required"),
  email: z.string().email("Valid email is required"),
  role: UserRoleSchema.default(UserRole.FIELD_AGENT),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type UserCreateInput = z.infer<typeof UserCreateSchema>;
export type UserCreateDto = UserCreateInput;

export const UserLoginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export type UserLoginInput = z.infer<typeof UserLoginSchema>;
export type UserLoginDto = UserLoginInput;

export const MachineCreateSchema = z.object({
  serialNumber: z.string().min(1, "Serial number is required"),
  location: z.string().min(1, "Location is required"),
  status: MachineStatusSchema.default(MachineStatus.ONLINE),
  qrCode: z.string().min(1, "QR code identifier is required"),
  storeId: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  capacity: z.number().optional().nullable(),
  keyNumber: z.string().optional().nullable(),
});

export type MachineCreateInput = z.infer<typeof MachineCreateSchema>;
export type MachineCreateDto = MachineCreateInput;

export const PacketConfigCreateSchema = z.object({
  name: z.string().min(1, "Packet name is required"),
  brand: z.string().min(1, "Brand is required"),
  quantityPerPacket: z
    .number()
    .int("Quantity per packet must be an integer")
    .positive("Quantity per packet must be greater than 0"),
  pricePerItem: z
    .number()
    .positive("Price per item must be greater than 0"),
});

export type PacketConfigCreateInput = z.infer<typeof PacketConfigCreateSchema>;
export type PacketConfigCreateDto = PacketConfigCreateInput;
