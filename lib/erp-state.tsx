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
  saveReservations: (newReservations: Reservation[]) => void;
  saveMaintenance: (newMaintenance: Maintenance[]) => void;
  addVehicle: (vehicle: Vehicle) => void;
  removeVehicle: (id: string) => void;
  addReturn: (record: ReturnRecord) => void;
  addUploadedFile: (file: StoredFileMetadata) => void;
  addMaintenanceHistory: (record: MaintenanceHistory) => void;
  addAccidentHistory: (record: AccidentHistory) => void;
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
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [dispatches, setDispatches] = useState<Dispatch[]>(initialDispatches);
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [maintenance, setMaintenance] = useState<Maintenance[]>(initialMaintenance);
  const [returns, setReturns] = useState<ReturnRecord[]>(initialReturns);
  const [uploadedFiles, setUploadedFiles] = useState<StoredFileMetadata[]>([]);
  const [maintenanceHistories, setMaintenanceHistories] = useState<MaintenanceHistory[]>(initialMaintenanceHistories);
  const [accidentHistories, setAccidentHistories] = useState<AccidentHistory[]>(initialAccidentHistories);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
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

    setIsLoaded(true);
  }, []);

  const saveVehicles = (newVehicles: Vehicle[]) => {
    setVehicles(newVehicles);
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(newVehicles));
  };

  const saveDispatches = (newDispatches: Dispatch[]) => {
    setDispatches(newDispatches);
    localStorage.setItem(DISPATCHES_KEY, JSON.stringify(newDispatches));
  };

  const saveReturns = (newReturns: ReturnRecord[]) => {
    setReturns(newReturns);
    localStorage.setItem(RETURNS_KEY, JSON.stringify(newReturns));
  };

  const updateVehicle = (plateNumber: string, updates: Partial<Vehicle>) => {
    setVehicles((current) => {
      const next = current.map((v) => 
        v.plateNumber === plateNumber ? { ...v, ...updates } : v
      );
      localStorage.setItem(VEHICLES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const addVehicle = (vehicle: Vehicle) => {
    setVehicles((current) => {
      const next = [vehicle, ...current];
      localStorage.setItem(VEHICLES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeVehicle = (id: string) => {
    setVehicles((current) => {
      const next = current.filter((v) => v.id !== id);
      localStorage.setItem(VEHICLES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const addDispatch = (dispatch: Dispatch) => {
    setDispatches((current) => {
      const next = [dispatch, ...current];
      localStorage.setItem(DISPATCHES_KEY, JSON.stringify(next));
      return next;
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
  };

  const addReturn = (record: ReturnRecord) => {
    setReturns((current) => {
      const next = [record, ...current];
      localStorage.setItem(RETURNS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const addUploadedFile = (file: StoredFileMetadata) => {
    setUploadedFiles((current) => {
      const next = [file, ...current];
      localStorage.setItem(UPLOADED_FILES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const addMaintenanceHistory = (record: MaintenanceHistory) => {
    setMaintenanceHistories((current) => {
      const next = [record, ...current];
      localStorage.setItem(MAINTENANCE_HISTORIES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const addAccidentHistory = (record: AccidentHistory) => {
    setAccidentHistories((current) => {
      const next = [record, ...current];
      localStorage.setItem(ACCIDENT_HISTORIES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const saveReservations = (newReservations: Reservation[]) => {
    setReservations(newReservations);
    localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(newReservations));
  };

  const saveMaintenance = (newMaintenance: Maintenance[]) => {
    setMaintenance(newMaintenance);
    localStorage.setItem(MAINTENANCE_KEY, JSON.stringify(newMaintenance));
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
      saveReservations,
      saveMaintenance,
      addVehicle,
      removeVehicle,
      addReturn,
      addUploadedFile,
      addMaintenanceHistory,
      addAccidentHistory
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
