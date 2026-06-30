import { ensureColumns, noStoreHeaders, safeBindValues, safeBoolInt, safeNullableText, safeNumber, safeText } from "./_d1-utils";
import { requirePermission } from "./_permissions";

type Env = {
  DB: any;
  JWT_SECRET?: string;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    await ensureReturnSchema(env);
    const { results } = await env.DB.prepare(`
      SELECT *
      FROM returns
      WHERE retention_archived_at IS NULL
      ORDER BY
        COALESCE(date, '') DESC,
        COALESCE(time, '') DESC,
        COALESCE(updated_at, created_at, '') DESC
    `).all();
    console.log("return rows from D1", results.length, results[0]);

    return Response.json(results.map(mapReturn), { headers: noStoreHeaders() });
  } catch (error) {
    console.error("return list failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request, env: Env }) {
  try {
    const auth = await requirePermission(request, env, "dispatch.create");
    if (auth.response) return auth.response;
    await ensureReturnSchema(env);
    const r = await request.json() as any;
    const fuelLevelText = r.fuelLevelText ?? r.fuelDisplay;
    const memo = r.memo ?? r.notes;
    const vehicleNumber = r.vehicleNumber ?? r.rentalCarNumber;
    const parkingZone = r.parkingZone ?? r.arrivalAddress;
    const dispatchId = safeText(r.dispatchId ?? r.dispatch_id);
    const dispatchSnapshot = dispatchId
      ? await env.DB.prepare("SELECT * FROM dispatches WHERE id = ?").bind(dispatchId).first()
      : null;
    const snapshot = buildDispatchSnapshot(r, dispatchSnapshot);
    const columns = [
      "id", "date", "time", "vehicle_number", "rental_car_number", "return_address", "arrival_address", "mileage",
      "fuel_level", "fuel_display", "fuel_level_text", "vehicle_color", "parking_zone", "notes", "memo", "status", "is_completed",
      "dispatch_id", "dispatch_date_snapshot", "dispatch_info_snapshot", "dispatch_fuel_snapshot", "dispatch_parking_location_snapshot",
      "dispatch_memo_snapshot", "orderer_snapshot", "repair_shop_snapshot", "customer_car_model_snapshot", "customer_phone_snapshot",
      "car_model_color_snapshot", "status_snapshot", "is_corporate_vehicle_snapshot", "updated_at"
    ];
    const values = [
      safeText(r.id),
      safeNullableText(r.date),
      safeNullableText(r.time),
      safeText(vehicleNumber),
      safeText(vehicleNumber),
      safeText(r.returnAddress),
      safeText(parkingZone),
      safeNumber(r.mileage) || 0,
      safeNumber(r.fuelLevel),
      safeText(fuelLevelText),
      safeText(fuelLevelText),
      safeText(r.vehicleColor),
      safeText(parkingZone),
      safeText(memo),
      safeText(memo),
      safeText(r.status || "회차등록"),
      safeBoolInt(r.isCompleted),
      dispatchId,
      safeNullableText(snapshot.dispatchDate),
      safeNullableText(snapshot.dispatchInfo),
      safeNullableText(snapshot.dispatchFuel),
      safeNullableText(snapshot.dispatchParkingLocation),
      safeNullableText(snapshot.dispatchMemo),
      safeNullableText(snapshot.orderer),
      safeNullableText(snapshot.repairShop),
      safeNullableText(snapshot.customerCarModel),
      safeNullableText(snapshot.customerPhone),
      safeNullableText(snapshot.carModelColor),
      safeNullableText(snapshot.status),
      safeBoolInt(snapshot.isCorporateVehicle),
      "CURRENT_TIMESTAMP"
    ];
    const placeholders = values.map((value) => value === "CURRENT_TIMESTAMP" ? "CURRENT_TIMESTAMP" : "?").join(", ");
    const bindValues = values.filter((value) => value !== "CURRENT_TIMESTAMP");
    await env.DB.prepare(`INSERT INTO returns (${columns.join(", ")}) VALUES (${placeholders})`).bind(...bindValues).run();
    if (dispatchId) {
      await env.DB.prepare("UPDATE dispatches SET return_completed = 1, return_at = COALESCE(return_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(dispatchId).run();
    }

    console.log("return saved", r.id);
    return Response.json({ ok: true, success: true, id: safeText(r.id) }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("return save failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

async function hasColumn(db: any, table: string, column: string) {
  const { results } = await db.prepare(`PRAGMA table_info(${table})`).all();
  return (results || []).some((row: any) => String(row.name) === column);
}

export async function onRequestPatch({ request, env }: { request: Request, env: Env }) {
  try {
    const auth = await requirePermission(request, env, "dispatch.update");
    if (auth.response) return auth.response;
    await ensureReturnSchema(env);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    const updates = await request.json() as any;
    const fields = [];
    const values = [];
    const vehicleNumber = updates.vehicleNumber ?? updates.rentalCarNumber;
    const parkingZone = updates.parkingZone ?? updates.arrivalAddress;
    if (updates.rentalCarNumber !== undefined || updates.vehicleNumber !== undefined) {
      fields.push("vehicle_number = ?", "rental_car_number = ?");
      values.push(safeText(vehicleNumber), safeText(vehicleNumber));
    }
    if (updates.date !== undefined) { fields.push("date = ?"); values.push(safeNullableText(updates.date)); }
    if (updates.time !== undefined) { fields.push("time = ?"); values.push(safeNullableText(updates.time)); }
    if (updates.returnAddress !== undefined) { fields.push("return_address = ?"); values.push(safeText(updates.returnAddress)); }
    if (updates.arrivalAddress !== undefined || updates.parkingZone !== undefined) {
      fields.push("arrival_address = ?", "parking_zone = ?");
      values.push(safeText(parkingZone), safeText(parkingZone));
    }
    if (updates.fuelDisplay !== undefined || updates.fuelLevelText !== undefined) {
      const fuelLevelText = updates.fuelLevelText ?? updates.fuelDisplay;
      fields.push("fuel_display = ?", "fuel_level_text = ?");
      values.push(safeText(fuelLevelText), safeText(fuelLevelText));
    }
    if (updates.vehicleColor !== undefined) { fields.push("vehicle_color = ?"); values.push(safeText(updates.vehicleColor)); }
    if (updates.mileage !== undefined) { fields.push("mileage = ?"); values.push(safeNumber(updates.mileage)); }
    if (updates.notes !== undefined || updates.memo !== undefined) {
      const memo = updates.memo ?? updates.notes;
      fields.push("notes = ?", "memo = ?");
      values.push(safeText(memo), safeText(memo));
    }
    if (updates.status !== undefined) { fields.push("status = ?"); values.push(safeText(updates.status)); }
    if (updates.isCompleted !== undefined || updates.is_completed !== undefined) {
      fields.push("is_completed = ?");
      values.push(safeBoolInt(updates.isCompleted ?? updates.is_completed));
    }
    if (fields.length === 0) return Response.json({ success: true });
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    await env.DB.prepare(`UPDATE returns SET ${fields.join(", ")} WHERE id = ?`).bind(...safeBindValues(values)).run();
    if (parkingZone !== undefined && vehicleNumber !== undefined) {
      await env.DB.prepare(
        "UPDATE vehicles SET location = ?, status = ?, active_summary = ?, updated_at = CURRENT_TIMESTAMP WHERE plate_number = ?"
      ).bind(safeText(parkingZone), "주차구역표시", safeText(parkingZone), safeText(vehicleNumber)).run();
    }
    return Response.json({ ok: true, success: true, id: safeText(id) }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("return update failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestDelete({ request, env }: { request: Request, env: Env }) {
  try {
    const auth = await requirePermission(request, env, "dispatch.delete");
    if (auth.response) return auth.response;
    await ensureReturnSchema(env);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });
    await env.DB.prepare("DELETE FROM returns WHERE id = ?").bind(safeText(id)).run();
    return Response.json({ success: true }, { headers: noStoreHeaders() });
  } catch (error) {
    console.error("return delete failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapReturn(row: any) {
  const vehicleNumber = row.vehicle_number || row.rental_car_number || row.plate_number || "";
  const parkingZone = row.parking_zone || row.arrival_address || row.return_address || row.location || "";
  const fuelLevelText = row.fuel_level_text || row.fuel_display || "";
  const memo = row.memo || row.notes || "";
  return {
    id: row.id,
    dispatch_id: row.dispatch_id,
    dispatchId: row.dispatch_id,
    dispatchDateSnapshot: row.dispatch_date_snapshot,
    dispatchInfoSnapshot: row.dispatch_info_snapshot,
    dispatchFuelSnapshot: row.dispatch_fuel_snapshot,
    dispatchParkingLocationSnapshot: row.dispatch_parking_location_snapshot,
    dispatchMemoSnapshot: row.dispatch_memo_snapshot,
    ordererSnapshot: row.orderer_snapshot,
    repairShopSnapshot: row.repair_shop_snapshot,
    customerCarModelSnapshot: row.customer_car_model_snapshot,
    customerPhoneSnapshot: row.customer_phone_snapshot,
    carModelColorSnapshot: row.car_model_color_snapshot,
    statusSnapshot: row.status_snapshot,
    isCorporateVehicleSnapshot: Boolean(row.is_corporate_vehicle_snapshot),
    orderer: row.orderer_snapshot,
    repairShop: row.repair_shop_snapshot,
    customerCarModel: row.customer_car_model_snapshot,
    customerPhone: row.customer_phone_snapshot,
    carModelColor: row.car_model_color_snapshot,
    date: row.date,
    time: row.time,
    vehicle_number: vehicleNumber,
    mileage: row.mileage,
    fuel_level_text: fuelLevelText,
    parking_zone: parkingZone,
    memo,
    is_completed: row.is_completed ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    vehicleNumber,
    rentalCarNumber: vehicleNumber,
    returnAddress: row.return_address,
    arrivalAddress: parkingZone,
    parkingZone,
    fuelLevel: row.fuel_level,
    fuelDisplay: fuelLevelText,
    fuelLevelText,
    vehicleColor: row.vehicle_color,
    notes: memo,
    status: row.status,
    isCompleted: Boolean(row.is_completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function ensureReturnSchema(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      plate_number TEXT,
      location TEXT,
      status TEXT,
      active_summary TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "vehicles", [
    { name: "plate_number", definition: "TEXT" },
    { name: "location", definition: "TEXT" },
    { name: "status", definition: "TEXT" },
    { name: "active_summary", definition: "TEXT" },
    { name: "updated_at", definition: "DATETIME" },
  ]);
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      date TEXT,
      time TEXT,
      vehicle_number TEXT,
      return_address TEXT,
      mileage INTEGER,
      fuel_level_text TEXT,
      parking_zone TEXT,
      memo TEXT,
      is_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  await ensureColumns(env.DB, "returns", [
    { name: "date", definition: "TEXT" },
    { name: "time", definition: "TEXT" },
    { name: "vehicle_number", definition: "TEXT" },
    { name: "rental_car_number", definition: "TEXT" },
    { name: "return_address", definition: "TEXT" },
    { name: "arrival_address", definition: "TEXT" },
    { name: "mileage", definition: "INTEGER" },
    { name: "is_completed", definition: "INTEGER DEFAULT 0" },
    { name: "parking_zone", definition: "TEXT" },
    { name: "fuel_level", definition: "REAL" },
    { name: "fuel_display", definition: "TEXT" },
    { name: "fuel_level_text", definition: "TEXT" },
    { name: "vehicle_color", definition: "TEXT" },
    { name: "notes", definition: "TEXT" },
    { name: "status", definition: "TEXT" },
    { name: "memo", definition: "TEXT" },
    { name: "dispatch_id", definition: "TEXT" },
    { name: "dispatch_date_snapshot", definition: "TEXT" },
    { name: "dispatch_info_snapshot", definition: "TEXT" },
    { name: "dispatch_fuel_snapshot", definition: "TEXT" },
    { name: "dispatch_parking_location_snapshot", definition: "TEXT" },
    { name: "dispatch_memo_snapshot", definition: "TEXT" },
    { name: "orderer_snapshot", definition: "TEXT" },
    { name: "repair_shop_snapshot", definition: "TEXT" },
    { name: "customer_car_model_snapshot", definition: "TEXT" },
    { name: "customer_phone_snapshot", definition: "TEXT" },
    { name: "car_model_color_snapshot", definition: "TEXT" },
    { name: "status_snapshot", definition: "TEXT" },
    { name: "is_corporate_vehicle_snapshot", definition: "INTEGER DEFAULT 0" },
    { name: "created_at", definition: "DATETIME" },
    { name: "updated_at", definition: "DATETIME" },
    { name: "retention_archived_at", definition: "DATETIME" },
    { name: "retention_archived_reason", definition: "TEXT" },
  ]);
}

function buildDispatchSnapshot(input: any, dispatch: any) {
  const vehicleNumber = dispatch?.vehicle_number || dispatch?.rental_car_number || input.vehicleNumber || input.rentalCarNumber || "";
  const carModelColor = [dispatch?.customer_car_model || input.customerCarModel, dispatch?.vehicle_color || input.vehicleColor].filter(Boolean).join(" / ");
  return {
    dispatchDate: dispatch?.date || input.dispatchDate,
    dispatchInfo: input.dispatchInfo || formatSnapshotDispatchInfo(dispatch),
    dispatchFuel: dispatch?.fuel_level_text || dispatch?.fuel_display || input.dispatchFuel || input.fuelLevelText || input.fuelDisplay,
    dispatchParkingLocation: dispatch?.parking_zone || dispatch?.delivery_address || input.dispatchParkingLocation,
    dispatchMemo: dispatch?.memo || dispatch?.notes || input.dispatchMemo,
    orderer: dispatch?.orderer || dispatch?.ordered_by || dispatch?.customer_name || input.orderer,
    repairShop: dispatch?.repair_shop || input.repairShop,
    customerCarModel: dispatch?.customer_car_model || input.customerCarModel,
    customerPhone: dispatch?.customer_phone || input.customerPhone,
    carModelColor: input.carModelColor || carModelColor || vehicleNumber,
    status: dispatch?.dispatch_type || dispatch?.business_type || dispatch?.status || input.status,
    isCorporateVehicle: dispatch?.is_corporate ?? dispatch?.corporate_vehicle ?? input.isCorporateVehicle,
  };
}

function formatSnapshotDispatchInfo(dispatch: any) {
  if (!dispatch) return "";
  const orderer = dispatch.orderer || dispatch.ordered_by || dispatch.customer_name || "";
  const repairShop = dispatch.repair_shop || "";
  return [dispatch.date, orderer && repairShop ? `${orderer} / ${repairShop}` : orderer || repairShop].filter(Boolean).join(" · ");
}
