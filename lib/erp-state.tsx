"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type {
  AccidentHistory,
  Dispatch,
  Maintenance,
  MaintenanceHistory,
  Reservation,
  ReturnRecord,
  Vehicle,
} from "./erp-data";
import type { StoredFileMetadata } from "@/services/file-upload-service";

type ERPContextType = {
  vehicles: Vehicle[];
  dispatches: Dispatch[];
  reservations: Reservation[];
  maintenance: Maintenance[];
  returns: ReturnRecord[];
  uploadedFiles: StoredFileMetadata[];
  maintenanceHistories: MaintenanceHistory[];
  accidentHistories: AccidentHistory[];
  isLoaded: boolean;
  updateVehicle: (plateNumber: string, updates: Partial<Vehicle>) => void;
  addDispatch: (dispatch: Dispatch) => void;
  updateDispatch: (id: string, updates: Partial<Dispatch>) => void;
  addReservation: (reservation: Reservation) => void;
  saveReservations: (newReservations: Reservation[]) => void;
  saveMaintenance: (newMaintenance: Maintenance[]) => void;
  addVehicle: (vehicle: Vehicle) => void;
  removeVehicle: (id: string) => void;
  addReturn: (record: ReturnRecord) => void;
  addUploadedFile: (file: StoredFileMetadata) => void;
  addMaintenanceHistory: (record: MaintenanceHistory) => void;
  addAccidentHistory: (record: AccidentHistory) => void;
  reorderVehicles: (newOrder: Vehicle[]) => Promise<void>;
};

const ERPContext = createContext<ERPContextType | undefined>(undefined);

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

function postJson(url: string, body: unknown, method = "POST") {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function ERPProvider({ children }: { children: React.ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<StoredFileMetadata[]>([]);
  const [maintenanceHistories, setMaintenanceHistories] = useState<MaintenanceHistory[]>([]);
  const [accidentHistories, setAccidentHistories] = useState<AccidentHistory[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getJson<Vehicle[]>("/api/vehicles", []),
      getJson<Dispatch[]>("/api/dispatches", []),
      getJson<Reservation[]>("/api/reservations", []),
      getJson<Maintenance[]>("/api/maintenance", []),
      getJson<ReturnRecord[]>("/api/returns", []),
      getJson<StoredFileMetadata[]>("/api/uploaded-files", []),
      getJson<MaintenanceHistory[]>("/api/maintenance-histories", []),
      getJson<AccidentHistory[]>("/api/accident-histories", []),
    ]).then(([v, d, res, m, ret, f, mh, ah]) => {
      if (cancelled) return;
      setVehicles(v);
      setDispatches(d);
      setReservations(res);
      setMaintenance(m);
      setReturns(ret);
      setUploadedFiles(f);
      setMaintenanceHistories(mh);
      setAccidentHistories(ah);
      setIsLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateVehicle = (plateNumber: string, updates: Partial<Vehicle>) => {
    setVehicles((current) => current.map((v) => (v.plateNumber === plateNumber ? { ...v, ...updates } : v)));
    postJson(`/api/vehicles?plateNumber=${encodeURIComponent(plateNumber)}`, updates, "PATCH");
  };

  const addVehicle = (vehicle: Vehicle) => {
    setVehicles((current) => [vehicle, ...current]);
    postJson("/api/vehicles", vehicle);
  };

  const removeVehicle = (id: string) => {
    setVehicles((current) => current.filter((v) => v.id !== id));
    fetch(`/api/vehicles?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  };

  const addDispatch = (dispatch: Dispatch) => {
    setDispatches((current) => [dispatch, ...current]);
    postJson("/api/dispatches", dispatch);
  };

  const updateDispatch = (id: string, updates: Partial<Dispatch>) => {
    setDispatches((current) => current.map((d) => (d.id === id ? { ...d, ...updates } : d)));
    postJson(`/api/dispatches?id=${encodeURIComponent(id)}`, updates, "PATCH");
  };

  const addReservation = (reservation: Reservation) => {
    setReservations((current) => [reservation, ...current]);
    postJson("/api/reservations", reservation);
  };

  const saveReservations = (newReservations: Reservation[]) => {
    setReservations(newReservations);
    postJson("/api/reservations", newReservations, "PUT");
  };

  const saveMaintenance = (newMaintenance: Maintenance[]) => {
    setMaintenance(newMaintenance);
    postJson("/api/maintenance", newMaintenance, "PUT");
  };

  const addReturn = (record: ReturnRecord) => {
    setReturns((current) => [record, ...current]);
    postJson("/api/returns", record);
  };

  const addUploadedFile = (file: StoredFileMetadata) => {
    setUploadedFiles((current) => [file, ...current]);
    postJson("/api/uploaded-files", file);
  };

  const addMaintenanceHistory = (record: MaintenanceHistory) => {
    setMaintenanceHistories((current) => [record, ...current]);
    postJson("/api/maintenance-histories", record);
  };

  const addAccidentHistory = (record: AccidentHistory) => {
    setAccidentHistories((current) => [record, ...current]);
    postJson("/api/accident-histories", record);
  };

  const reorderVehicles = async (newOrder: Vehicle[]) => {
    const previousOrder = vehicles;
    const updatedOrder = newOrder.map((v, i) => ({ ...v, sortOrder: i }));
    setVehicles(updatedOrder);

    const response = await postJson(
      "/api/vehicles/reorder",
      { items: updatedOrder.map((v) => ({ id: v.id, sortOrder: v.sortOrder })) },
      "PATCH",
    );

    if (!response.ok) {
      setVehicles(previousOrder);
      throw new Error("Failed to reorder vehicles");
    }
  };

  return (
    <ERPContext.Provider
      value={{
        vehicles,
        dispatches,
        reservations,
        maintenance,
        returns,
        uploadedFiles,
        maintenanceHistories,
        accidentHistories,
        isLoaded,
        updateVehicle,
        addDispatch,
        updateDispatch,
        addReservation,
        saveReservations,
        saveMaintenance,
        addVehicle,
        removeVehicle,
        addReturn,
        addUploadedFile,
        addMaintenanceHistory,
        addAccidentHistory,
        reorderVehicles,
      }}
    >
      {children}
    </ERPContext.Provider>
  );
}

export function useERPState() {
  const context = useContext(ERPContext);
  if (context === undefined) {
    throw new Error("useERPState must be used within an ERPProvider");
  }
  return context;
}
