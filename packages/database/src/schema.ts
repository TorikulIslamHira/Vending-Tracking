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
// 1. Enums
// ==============================================================================
export const userRoleEnum = pgEnum("user_role", ["ADMIN", "FIELD_AGENT"]);
export const machineStatusEnum = pgEnum("machine_status", ["ONLINE", "OFFLINE"]);
export const entryTypeEnum = pgEnum("entry_type", ["STANDARD", "MANUAL", "REVERSE"]);

// ==============================================================================
// 2. Tables
// ==============================================================================

// Tenants Table
export const tenants = pgTable("tenants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  themeConfig: jsonb("theme_config"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
});

// Users Table
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: userRoleEnum("role").default("FIELD_AGENT").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => [
    unique("users_tenant_email_idx").on(table.tenantId, table.email),
    index("users_tenant_id_idx").on(table.tenantId),
  ]
);

// Locations Table
export const locations = pgTable(
  "locations",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => [
    index("locations_tenant_id_idx").on(table.tenantId),
  ]
);

// Stores Table
export const stores = pgTable(
  "stores",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").default("Confectionery & Toys"),
    shopCutPercent: integer("shop_cut_percent").default(30).notNull(),
    businessCutPercent: integer("business_cut_percent").default(70).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => [
    index("stores_tenant_id_idx").on(table.tenantId),
    index("stores_location_id_idx").on(table.locationId),
  ]
);

// Machines Table
export const machines = pgTable(
  "machines",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    storeId: text("store_id").references(() => stores.id, { onDelete: "set null" }),
    serialNumber: text("serial_number").notNull(),
    location: text("location").notNull(),
    category: text("category").default("Standard Confectionery"),
    type: text("type").default("Spiral Chute"),
    capacity: integer("capacity").default(100),
    status: machineStatusEnum("status").default("ONLINE").notNull(),
    qrCode: text("qr_code").notNull(),
    virtualCashBalance: numeric("virtual_cash_balance", { precision: 10, scale: 2 }).default("0.00").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => [
    unique("machines_tenant_serial_idx").on(table.tenantId, table.serialNumber),
    unique("machines_tenant_qr_idx").on(table.tenantId, table.qrCode),
    index("machines_tenant_id_idx").on(table.tenantId),
    index("machines_store_id_idx").on(table.storeId),
  ]
);

// Packet Configurations Table
export const packetConfigs = pgTable(
  "packet_configs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    brand: text("brand").notNull(),
    quantityPerPacket: integer("quantity_per_packet").notNull(),
    pricePerItem: numeric("price_per_item", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (table) => [
    index("packet_configs_tenant_id_idx").on(table.tenantId),
  ]
);

// Inventory Logs Table
export const inventoryLogs = pgTable(
  "inventory_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    machineId: text("machine_id")
      .notNull()
      .references(() => machines.id, { onDelete: "cascade" }),
    agentId: text("agent_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    packetId: text("packet_id").references(() => packetConfigs.id, { onDelete: "set null" }),
    entryType: entryTypeEnum("entry_type").default("STANDARD").notNull(),
    quantityAdded: integer("quantity_added").notNull(),
    remarks: text("remarks").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("inventory_logs_tenant_id_idx").on(table.tenantId),
    index("inventory_logs_machine_id_idx").on(table.machineId),
    index("inventory_logs_agent_id_idx").on(table.agentId),
  ]
);

// Cash Logs Table
export const cashLogs = pgTable(
  "cash_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    machineId: text("machine_id")
      .notNull()
      .references(() => machines.id, { onDelete: "cascade" }),
    agentId: text("agent_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    collectedAmount: numeric("collected_amount", { precision: 10, scale: 2 }).notNull(),
    expectedAmount: numeric("expected_amount", { precision: 10, scale: 2 }).notNull(),
    discrepancy: numeric("discrepancy", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("cash_logs_tenant_id_idx").on(table.tenantId),
    index("cash_logs_machine_id_idx").on(table.machineId),
    index("cash_logs_agent_id_idx").on(table.agentId),
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
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  inventoryLogs: many(inventoryLogs),
  cashLogs: many(cashLogs),
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
