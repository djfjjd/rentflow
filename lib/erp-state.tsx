"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  vehicles as initialVehicles, 
  dispatches as initialDispatches,
  reservations as initialReservations,
  maintenanceItems as initialMaintenance,
  returns as initialReturns,
  maintenanceHistories as initialMaintenanceHistories,
  accidentHistories as initialAccidentHistories,
  type Vehicle,
  type Dispatch,
  type Reservation,
  type Maintenance,
  type ReturnRecord,
  type MaintenanceHistory,
  type AccidentHistory,
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

const VEHICLES_KEY = "rentflow_vehicles";
const DISPATCHES_KEY = "rentflow_dispatches";
const RESERVATIONS_KEY = "rentflow_reservations";
const MAINTENANCE_KEY = "rentflow_maintenance";
const RETURNS_KEY = "rentflow_returns";
const UPLOADED_FILES_KEY = "rentflow_uploaded_files";
const MAINTENANCE_HISTORIES_KEY = "rentflow_maintenance_histories";
const ACCIDENT_HISTORIES_KEY = "rentflow_accident_histories";

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
    // 1. Load from cache (localStorage) first for instant UI
    const savedVehicles = localStorage.getItem(VEHICLES_KEY);
    const savedDispatches = localStorage.getItem(DISPATCHES_KEY);
    const savedReservations = localStorage.getItem(RESERVATIONS_KEY);
    const savedMaintenance = localStorage.getItem(MAINTENANCE_KEY);
    const savedReturns = localStorage.getItem(RETURNS_KEY);
    const savedUploadedFiles = localStorage.getItem(UPLOADED_FILES_KEY);
    const savedMaintenanceHistories = localStorage.getItem(MAINTENANCE_HISTORIES_KEY);
    const savedAccidentHistories = localStorage.getItem(ACCIDENT_HISTORIES_KEY);

    if (savedVehicles) setVehicles(JSON.parse(savedVehicles));
    if (savedDispatches) setDispatches(JSON.parse(savedDispatches));
    if (savedReservations) setReservations(JSON.parse(savedReservations));
    if (savedMaintenance) setMaintenance(JSON.parse(savedMaintenance));
    if (savedReturns) setReturns(JSON.parse(savedReturns));
    if (savedUploadedFiles) setUploadedFiles(JSON.parse(savedUploadedFiles));
    if (savedMaintenanceHistories) setMaintenanceHistories(JSON.parse(savedMaintenanceHistories));
    if (savedAccidentHistories) setAccidentHistories(JSON.parse(savedAccidentHistories));

    // 2. Fetch from Server API
    Promise.all([
      fetch("/api/vehicles").then(r => r.json()),
      fetch("/api/dispatches").then(r => r.json()),
      fetch("/api/reservations").then(r => r.json()),
      fetch("/api/maintenance").then(r => r.json()),
      fetch("/api/returns").then(r => r.json()),
      fetch("/api/uploaded-files").then(r => r.json()),
      fetch("/api/maintenance-histories").then(r => r.json()),
      fetch("/api/accident-histories").then(r => r.json()),
    ]).then(([v, d, res, m, ret, f, mh, ah]) => {
      if (Array.isArray(v) && v.length > 0) {
        setVehicles(v);
        localStorage.setItem(VEHICLES_KEY, JSON.stringify(v));
      } else if (Array.isArray(v) && !savedVehicles) {
        // If API is empty and we have no local data, use API (which might be seed data)
        setVehicles(v);
        localStorage.setItem(VEHICLES_KEY, JSON.stringify(v));
      }

      if (Array.isArray(d) && (d.length > 0 || !savedDispatches)) {
        setDispatches(d);
        localStorage.setItem(DISPATCHES_KEY, JSON.stringify(d));
      }
      if (Array.isArray(res) && (res.length > 0 || !savedReservations)) {
        setReservations(res);
        localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(res));
      }
      if (Array.isArray(m) && (m.length > 0 || !savedMaintenance)) {
        setMaintenance(m);
        localStorage.setItem(MAINTENANCE_KEY, JSON.stringify(m));
      }
      if (Array.isArray(ret) && (ret.length > 0 || !savedReturns)) {
        setReturns(ret);
        localStorage.setItem(RETURNS_KEY, JSON.stringify(ret));
      }
      if (Array.isArray(f) && (f.length > 0 || !savedUploadedFiles)) {
        setUploadedFiles(f);
        localStorage.setItem(UPLOADED_FILES_KEY, JSON.stringify(f));
      }
      if (Array.isArray(mh) && (mh.length > 0 || !savedMaintenanceHistories)) {
        setMaintenanceHistories(mh);
        localStorage.setItem(MAINTENANCE_HISTORIES_KEY, JSON.stringify(mh));
      }
      if (Array.isArray(ah) && (ah.length > 0 || !savedAccidentHistories)) {
        setAccidentHistories(ah);
        localStorage.setItem(ACCIDENT_HISTORIES_KEY, JSON.stringify(ah));
      }
      setIsLoaded(true);
    }).catch(err => {
      console.error("Failed to fetch ERP data:", err);
      setIsLoaded(true);
    });
  }, []);

  const updateVehicle = (plateNumber: string, updates: Partial<Vehicle>) => {
    setVehicles((current) => {
      const next = current.map((v) => 
        v.plateNumber === plateNumber ? { ...v, ...updates } : v
      );
      localStorage.setItem(VEHICLES_KEY, JSON.stringify(next));
      return next;
    });
    // API Call
    fetch(`/api/vehicles?plateNumber=${encodeURIComponent(plateNumber)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  };

  const addVehicle = (vehicle: Vehicle) => {
    setVehicles((current) => {
      const next = [vehicle, ...current];
      localStorage.setItem(VEHICLES_KEY, JSON.stringify(next));
      return next;
    });
    // API Call
    fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vehicle),
    });
  };

  const removeVehicle = (id: string) => {
    setVehicles((current) => {
      const next = current.filter((v) => v.id !== id);
      localStorage.setItem(VEHICLES_KEY, JSON.stringify(next));
      return next;
    });
    // API Call
    fetch(`/api/vehicles?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  };

  const addDispatch = (dispatch: Dispatch) => {
    setDispatches((current) => {
      const next = [dispatch, ...current];
      localStorage.setItem(DISPATCHES_KEY, JSON.stringify(next));
      return next;
    });
    // API Call
    fetch("/api/dispatches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dispatch),
    });
  };

  const updateDispatch = (id: string, updates: Partial<Dispatch>) => {
    setDispatches((current) => {
      const next = current.map((d) => 
        d.id === id ? { ...d, ...updates } : d
      );
      localStorage.setItem(DISPATCHES_KEY, JSON.stringify(next));
      return next;
    });
    // API Call
    fetch(`/api/dispatches?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  };

  const addReservation = (reservation: Reservation) => {
    setReservations((current) => {
      const next = [reservation, ...current];
      localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(next));
      return next;
    });
    // API Call
    fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reservation),
    });
  };

  const saveReservations = (newReservations: Reservation[]) => {
    setReservations(newReservations);
    localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(newReservations));
    // API Call
    fetch("/api/reservations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newReservations),
    });
  };

  const saveMaintenance = (newMaintenance: Maintenance[]) => {
    setMaintenance(newMaintenance);
    localStorage.setItem(MAINTENANCE_KEY, JSON.stringify(newMaintenance));
    // API Call
    fetch("/api/maintenance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMaintenance),
    });
  };

  const addReturn = (record: ReturnRecord) => {
    setReturns((current) => {
      const next = [record, ...current];
      localStorage.setItem(RETURNS_KEY, JSON.stringify(next));
      return next;
    });
    // API Call
    fetch("/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
  };

  const addUploadedFile = (file: StoredFileMetadata) => {
    setUploadedFiles((current) => {
      const next = [file, ...current];
      localStorage.setItem(UPLOADED_FILES_KEY, JSON.stringify(next));
      return next;
    });
    // API Call
    fetch("/api/uploaded-files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(file),
    });
  };

  const addMaintenanceHistory = (record: MaintenanceHistory) => {
    setMaintenanceHistories((current) => {
      const next = [record, ...current];
      localStorage.setItem(MAINTENANCE_HISTORIES_KEY, JSON.stringify(next));
      return next;
    });
    // API Call
    fetch("/api/maintenance-histories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
  };

  const addAccidentHistory = (record: AccidentHistory) => {
    setAccidentHistories((current) => {
      const next = [record, ...current];
      localStorage.setItem(ACCIDENT_HISTORIES_KEY, JSON.stringify(next));
      return next;
    });
    // API Call
    fetch("/api/accident-histories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
  };

  const reorderVehicles = async (newOrder: Vehicle[]) => {
    const previousOrder = [...vehicles];
    
    // Update sortOrder values based on new position
    const updatedOrder = newOrder.map((v, i) => ({ ...v, sortOrder: i }));
    
    setVehicles(updatedOrder);
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(updatedOrder));

    try {
      const response = await fetch("/api/vehicles/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: updatedOrder.map(v => ({ id: v.id, sortOrder: v.sortOrder }))
        }),
      });

      if (!response.ok) throw new Error("Failed to reorder");
      
    } catch (error) {
      console.error("Reorder failed, reverting:", error);
      setVehicles(previousOrder);
      localStorage.setItem(VEHICLES_KEY, JSON.stringify(previousOrder));
      throw error;
    }
  };

  return (
    <ERPContext.Provider value={{
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
      reorderVehicles
    }}>
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
