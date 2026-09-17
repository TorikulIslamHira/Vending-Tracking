import {
  pgTable,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  numeric,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations, type InferSelectModel, type InferInsertModel } from "drizzle-orm";

// ==============================================================================
// 1. Enums (matching exact PostgreSQL enum types)
// ==============================================================================
export const userRoleEnum = pgEnum("UserRole", ["ADMIN", "FIELD_AGENT"]);
export const machineStatusEnum = pgEnum("MachineStatus", ["ONLINE", "OFFLINE"]);
export const entryTypeEnum = pgEnum("EntryType", ["STANDARD", "MANUAL", "REVERSE"]);
export const paymentModeEnum = pgEnum("PaymentMode", ["CASH", "BANK"]);
export const shopPaymentStatusEnum = pgEnum("ShopPaymentStatus", ["PAID", "PENDING"]);

// ==============================================================================
// 2. Tables (matching exact PostgreSQL column identifiers)
// ==============================================================================

// Tenants Table
export const tenants = pgTable("tenants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  currency: text("currency").default("USD").notNull(),
  themeConfig: jsonb("themeConfig"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// Users Table
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenantId")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: userRoleEnum("role").default("FIELD_AGENT").notNull(),
    email: text("email").notNull(),
    passwordHash: text("passwordHash").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    // Delegated permission to soft-delete machines. The root Super Admin
    // (identified by SUPER_ADMIN_EMAIL, not this column) always has this
    // power regardless of its stored value — only non-root ADMIN users need
    // it explicitly granted. Defaults false: nobody starts with this power.
    canDeleteMachines: boolean("canDeleteMachines").default(false).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => [
    unique("users_tenantId_email_key").on(table.tenantId, table.email),
    index("users_tenantId_idx").on(table.tenantId),
  ]
);

// Locations Table
export const locations = pgTable(
  "locations",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenantId")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address"),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => [
    index("locations_tenantId_idx").on(table.tenantId),
  ]
);

// Stores Table
export const stores = pgTable(
  "stores",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenantId")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    locationId: text("locationId")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").default("Confectionery & Toys"),
    shopCutPercent: integer("shopCutPercent").default(30).notNull(),
    businessCutPercent: integer("businessCutPercent").default(70).notNull(),
    eircode: text("eircode"),
    paymentMode: paymentModeEnum("paymentMode").default("CASH").notNull(),
    qrCode: text("qrCode"),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => [
    index("stores_tenantId_idx").on(table.tenantId),
    index("stores_locationId_idx").on(table.locationId),
    // Deliberately a plain index, not a unique constraint: adding a UNIQUE
    // constraint to an already-populated table makes `drizzle-kit push`
    // stop for an interactive "truncate table?" confirmation, which hangs
    // forever in the non-interactive CI/SSH deploy pipeline (no TTY to
    // answer it). Uniqueness is enforced at the application layer instead
    // (see stores.controller.ts).
    index("stores_tenantId_qrCode_idx").on(table.tenantId, table.qrCode),
  ]
);

// Machines Table
export const machines = pgTable(
  "machines",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenantId")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    storeId: text("storeId").references(() => stores.id, { onDelete: "set null" }),
    serialNumber: text("serialNumber").notNull(),
    location: text("location").notNull(),
    category: text("category").default("Standard Confectionery"),
    type: text("type").default("Spiral Chute"),
    capacity: integer("capacity").default(100),
    pricePerPlay: numeric("pricePerPlay", { precision: 10, scale: 2 }).default("1.00").notNull(),
    status: machineStatusEnum("status").default("ONLINE").notNull(),
    qrCode: text("qrCode").notNull(),
    virtualCashBalance: numeric("virtualCashBalance", { precision: 10, scale: 2 }).default("0.00").notNull(),
    keyNumber: text("keyNumber"),
    // Independent of `status`: a machine can be ONLINE and still flagged (e.g.
    // "Key Lost") without being taken offline. Set via the cash-collection
    // quick-action presets (Malfunction / Key Lost / Locker Broken).
    attentionNeeded: boolean("attentionNeeded").default(false).notNull(),
    attentionReason: text("attentionReason"),
    // Soft delete: kept non-null (not hard-deleted) so existing inventory_logs
    // and cash_logs rows referencing this machine never become orphaned. Every
    // "active fleet" query (list, detail, dashboard, and any handler that
    // mutates the machine) must filter isNull(deletedAt); historical log/report
    // views intentionally do not, so past activity stays visible.
    deletedAt: timestamp("deletedAt", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => [
    unique("machines_tenantId_serialNumber_key").on(table.tenantId, table.serialNumber),
    unique("machines_tenantId_qrCode_key").on(table.tenantId, table.qrCode),
    index("machines_tenantId_idx").on(table.tenantId),
    index("machines_storeId_idx").on(table.storeId),
  ]
);

// Packet Configurations Table
export const packetConfigs = pgTable(
  "packet_configs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenantId")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    brand: text("brand").notNull(),
    quantityPerPacket: integer("quantityPerPacket").notNull(),
    pricePerItem: numeric("pricePerItem", { precision: 10, scale: 2 }).notNull(),
    packetCost: numeric("packetCost", { precision: 10, scale: 2 }).default("0.00").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => [
    index("packet_configs_tenantId_idx").on(table.tenantId),
  ]
);

// Inventory Logs Table
export const inventoryLogs = pgTable(
  "inventory_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenantId")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    machineId: text("machineId")
      .notNull()
      .references(() => machines.id, { onDelete: "cascade" }),
    agentId: text("agentId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    packetId: text("packetId").references(() => packetConfigs.id, { onDelete: "set null" }),
    entryType: entryTypeEnum("entryType").default("STANDARD").notNull(),
    quantityAdded: integer("quantityAdded").notNull(),
    remarks: text("remarks").notNull(),
    // Self-reference: set on a REVERSE entry to the original log it reverses.
    // Used to enforce "most recent restock only" + prevent double-reversal.
    reversedLogId: text("reversedLogId").references((): any => inventoryLogs.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("inventory_logs_tenantId_idx").on(table.tenantId),
    index("inventory_logs_machineId_idx").on(table.machineId),
    index("inventory_logs_agentId_idx").on(table.agentId),
    index("inventory_logs_reversedLogId_idx").on(table.reversedLogId),
  ]
);

// Cash Logs Table
export const cashLogs = pgTable(
  "cash_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenantId")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    machineId: text("machineId")
      .notNull()
      .references(() => machines.id, { onDelete: "cascade" }),
    agentId: text("agentId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    collectedAmount: numeric("collectedAmount", { precision: 10, scale: 2 }).notNull(),
    expectedAmount: numeric("expectedAmount", { precision: 10, scale: 2 }).notNull(),
    // Signed: expectedAmount - collectedAmount. Positive = shortage, negative = overage.
    discrepancy: numeric("discrepancy", { precision: 10, scale: 2 }).notNull(),
    remarks: text("remarks"),
    // Agent's explicit acknowledgement that they physically cleared/collected the
    // machine despite a cash/expected mismatch ("Force Reconcile"). Required by
    // cashCollectionHandler whenever collectedAmount !== expectedAmount and the
    // collection is not a partial one.
    stockCleared: boolean("stockCleared").default(false).notNull(),
    // Agent intentionally collected less than the expected balance and left the
    // rest in the machine — not a discrepancy, so the mismatch guardrail
    // (mandatory remark + stockCleared) does not apply.
    isPartial: boolean("isPartial").default(false).notNull(),
    // Tracks the shopkeeper's cut of this collection. Auto-set to PAID when the
    // store's paymentMode is CASH (paid out on the spot); left for the agent to
    // set explicitly (PAID or PENDING + expectedPaymentDate) when BANK.
    shopPaymentStatus: shopPaymentStatusEnum("shopPaymentStatus"),
    expectedPaymentDate: timestamp("expectedPaymentDate", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("cash_logs_tenantId_idx").on(table.tenantId),
    index("cash_logs_machineId_idx").on(table.machineId),
    index("cash_logs_agentId_idx").on(table.agentId),
  ]
);

// Admin Audit Logs Table — records sensitive administrative actions
// (currently: machine deletion). Visible only to the root Super Admin.
export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenantId")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    actorId: text("actorId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    targetId: text("targetId"),
    details: jsonb("details"),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("admin_audit_logs_tenantId_idx").on(table.tenantId),
    index("admin_audit_logs_actorId_idx").on(table.actorId),
  ]
);

// ==============================================================================
// 3. Relations
// ==============================================================================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  machines: many(machines),
  locations: many(locations),
  stores: many(stores),
  packetConfigs: many(packetConfigs),
  inventoryLogs: many(inventoryLogs),
  cashLogs: many(cashLogs),
  adminAuditLogs: many(adminAuditLogs),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  inventoryLogs: many(inventoryLogs),
  cashLogs: many(cashLogs),
  adminAuditLogs: many(adminAuditLogs),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [locations.tenantId],
    references: [tenants.id],
  }),
  stores: many(stores),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [stores.tenantId],
    references: [tenants.id],
  }),
  location: one(locations, {
    fields: [stores.locationId],
    references: [locations.id],
  }),
  machines: many(machines),
}));

export const machinesRelations = relations(machines, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [machines.tenantId],
    references: [tenants.id],
  }),
  store: one(stores, {
    fields: [machines.storeId],
    references: [stores.id],
  }),
  inventoryLogs: many(inventoryLogs),
  cashLogs: many(cashLogs),
}));

export const packetConfigsRelations = relations(packetConfigs, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [packetConfigs.tenantId],
    references: [tenants.id],
  }),
  inventoryLogs: many(inventoryLogs),
}));

export const inventoryLogsRelations = relations(inventoryLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [inventoryLogs.tenantId],
    references: [tenants.id],
  }),
  machine: one(machines, {
    fields: [inventoryLogs.machineId],
    references: [machines.id],
  }),
  agent: one(users, {
    fields: [inventoryLogs.agentId],
    references: [users.id],
  }),
  packet: one(packetConfigs, {
    fields: [inventoryLogs.packetId],
    references: [packetConfigs.id],
  }),
}));

export const cashLogsRelations = relations(cashLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [cashLogs.tenantId],
    references: [tenants.id],
  }),
  machine: one(machines, {
    fields: [cashLogs.machineId],
    references: [machines.id],
  }),
  agent: one(users, {
    fields: [cashLogs.agentId],
    references: [users.id],
  }),
}));

export const adminAuditLogsRelations = relations(adminAuditLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [adminAuditLogs.tenantId],
    references: [tenants.id],
  }),
  actor: one(users, {
    fields: [adminAuditLogs.actorId],
    references: [users.id],
  }),
}));

// ==============================================================================
// 4. Inferred Types
// ==============================================================================
export type Tenant = InferSelectModel<typeof tenants>;
export type NewTenant = InferInsertModel<typeof tenants>;

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Location = InferSelectModel<typeof locations>;
export type NewLocation = InferInsertModel<typeof locations>;

export type Store = InferSelectModel<typeof stores>;
export type NewStore = InferInsertModel<typeof stores>;

export type Machine = InferSelectModel<typeof machines>;
export type NewMachine = InferInsertModel<typeof machines>;

export type PacketConfig = InferSelectModel<typeof packetConfigs>;
export type NewPacketConfig = InferInsertModel<typeof packetConfigs>;

export type InventoryLog = InferSelectModel<typeof inventoryLogs>;
export type NewInventoryLog = InferInsertModel<typeof inventoryLogs>;

export type CashLog = InferSelectModel<typeof cashLogs>;
export type NewCashLog = InferInsertModel<typeof cashLogs>;

export type AdminAuditLog = InferSelectModel<typeof adminAuditLogs>;
export type NewAdminAuditLog = InferInsertModel<typeof adminAuditLogs>;
