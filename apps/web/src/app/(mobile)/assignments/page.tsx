"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  ArrowLeft,
  UserCheck,
  Boxes,
  Plus,
  Check,
  Sparkles,
  Loader2,
  MapPin,
  ChevronRight,
  Shield,
  Truck,
} from "lucide-react";

import { useUsers } from "@/hooks/useUsers";
import { useMachines } from "@/hooks/useMachines";

interface RestockerAgent {
  id: string;
  name: string;
  email: string;
  assignedMachines: string[];
  status: "ACTIVE" | "ON_ROUTE" | "IDLE";
}

export default function RestockerAssignmentPage() {
  const router = useRouter();
  const { data: users = [], isLoading: isUsersLoading } = useUsers();
  const { data: machines = [], isLoading: isMachinesLoading } = useMachines();

  const [selectedAgent, setSelectedAgent] = useState<RestockerAgent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentSelectedMachines, setCurrentSelectedMachines] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const restockers: RestockerAgent[] = users
    .filter((u) => u.role === "RESTOCKER" || u.role === "FIELD_AGENT" || u.role === "MANAGER")
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      assignedMachines: [],
      status: "ACTIVE",
    }));

  const allAvailableMachines = machines.map((m) => ({
    id: m.serialNumber,
    location: m.location,
    category: m.category || "Standard Unit",
  }));

  const handleOpenAssign = (agent: RestockerAgent) => {
    setSelectedAgent(agent);
    setCurrentSelectedMachines(agent.assignedMachines);
    setIsDrawerOpen(true);
  };

  const handleToggleMachine = (machineId: string) => {
    setCurrentSelectedMachines((prev) =>
      prev.includes(machineId)
        ? prev.filter((id) => id !== machineId)
        : [...prev, machineId]
    );
  };

  const handleSaveAssignments = () => {
    if (!selectedAgent) return;
    setIsSaving(true);

    setTimeout(() => {
      setIsSaving(false);
      setIsDrawerOpen(false);
      toast.success(
        `Updated route assignments for ${selectedAgent.name} (${currentSelectedMachines.length} machines)`
      );
    }, 300);
  };

  return (
    <div className="w-full px-4 py-4 space-y-4">
      {/* Top Header with Back Navigation */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => router.push("/settings")}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>More & Settings</span>
        </button>

        <div className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          <Truck className="h-3.5 w-3.5" />
          <span>Field Dispatch</span>
        </div>
      </div>

      {/* Screen 8: Header */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-1">
        <h1 className="text-xl font-black tracking-tight text-foreground">
          Restocker Assignment
        </h1>
        <p className="text-xs text-muted-foreground">
          Allocate vending units to field agents for maintenance and refills.
        </p>
      </div>

      {/* Restocker List */}
      <div className="space-y-3">
        {restockers.length > 0 ? (
          restockers.map((agent) => (
            <Card
              key={agent.id}
              className="border-border/50 bg-card shadow-xs overflow-hidden"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-secondary/15 flex items-center justify-center text-secondary font-black text-sm shrink-0 shadow-xs">
                      {agent.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-foreground">
                          {agent.name}
                        </h3>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          Restocker
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {agent.email}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      agent.status === "ON_ROUTE"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : agent.status === "ACTIVE"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {agent.status === "ON_ROUTE"
                      ? "On Route"
                      : agent.status === "ACTIVE"
                      ? "Active"
                      : "Idle"}
                  </span>
                </div>

                {/* Assigned Machines Chips */}
                <div className="space-y-1.5 pt-1 border-t border-border/40">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-muted-foreground">
                      Assigned Machines ({agent.assignedMachines.length})
                    </span>
                    <button
                      onClick={() => handleOpenAssign(agent)}
                      className="font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Assign Machine</span>
                    </button>
                  </div>

                  {agent.assignedMachines.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {agent.assignedMachines.map((mId) => (
                        <span
                          key={mId}
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-accent/60 text-foreground px-2 py-1 rounded-lg border border-border/40"
                        >
                          <Boxes className="h-3 w-3 text-primary" />
                          <span>{mId}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">
                      No vending units currently assigned.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-border/50 bg-card shadow-xs">
            <CardContent className="p-8 text-center space-y-3">
              <Truck className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <h3 className="text-xs font-bold text-foreground">
                No Field Restockers Registered
              </h3>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Onboard field agents under User Management to assign them maintenance routes.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/users")}
                className="rounded-xl text-xs font-bold"
              >
                Go to User Management
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Vaul Bottom Drawer: Machine Multi-Select Assignment */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="max-w-md mx-auto rounded-t-[28px] p-6 space-y-4 max-h-[85vh] flex flex-col">
          <DrawerHeader className="p-0 text-left shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <Truck className="h-4 w-4" />
              </div>
              <DrawerTitle className="text-lg font-bold text-foreground">
                Assign Machines: {selectedAgent?.name}
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-xs text-muted-foreground">
              Select or deselect machines to update this agent&apos;s restock route.
            </DrawerDescription>
          </DrawerHeader>

          {/* Machine Selection Checklist */}
          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {allAvailableMachines.map((machine) => {
              const isSelected = currentSelectedMachines.includes(machine.id);

              return (
                <div
                  key={machine.id}
                  onClick={() => handleToggleMachine(machine.id)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-150 cursor-pointer select-none active:scale-[0.98] ${
                    isSelected
                      ? "bg-primary/10 border-primary/60 shadow-xs"
                      : "bg-muted/30 border-border/50 hover:bg-muted/60"
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "bg-primary text-foreground font-bold shadow-xs"
                        : "border border-muted-foreground/30 bg-card"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs font-mono text-foreground">
                        {machine.id}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {machine.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {machine.location}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <DrawerFooter className="p-0 pt-3 gap-2 shrink-0">
            <Button
              type="button"
              onClick={handleSaveAssignments}
              className="w-full h-12 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold text-sm shadow-md active:scale-[0.97]"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Save Assignments (${currentSelectedMachines.length})`
              )}
            </Button>
            <DrawerClose asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
