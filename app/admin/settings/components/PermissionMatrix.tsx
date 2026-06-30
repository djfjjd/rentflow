"use client";

import { useMemo, useState } from "react";
import {
  applyColumnMode,
  cloneMatrix,
  columnLabels,
  cycleColumnMode,
  cyclePermissionLevel,
  defaultPermissionPresetMatrix,
  matrixSubjects,
  modeForColumn,
  permissionColumns,
  protectDeveloperMinimums,
  type ColumnMode,
  type PermissionColumn,
  type PermissionLevel,
  type PermissionPresetMatrix,
} from "@/lib/permissions";

const levelStyle: Record<PermissionLevel, string> = {
  write: "bg-[#116149] text-white border-[#116149]",
  read: "bg-[#eef0ed] text-[#3d4842] border-[#d8ded8]",
  none: "border-transparent text-[#9f2d21]",
};

const levelLabel: Record<PermissionLevel, string> = {
  write: "편집",
  read: "읽기만",
  none: "⛔",
};

const modeLabel: Record<ColumnMode, string> = {
  allWrite: "전체편집",
  allNone: "전체접근금지",
  custom: "사용자화",
};

export function PermissionMatrix() {
  const [saved, setSaved] = useState<PermissionPresetMatrix>(() => cloneMatrix(defaultPermissionPresetMatrix));
  const [matrix, setMatrix] = useState<PermissionPresetMatrix>(() => cloneMatrix(defaultPermissionPresetMatrix));
  const [customColumns, setCustomColumns] = useState<Record<PermissionColumn, boolean>>({
    developer: false,
    admin: false,
    manager: true,
    staff: true,
  });
  const [message, setMessage] = useState("");
  const columnModes = useMemo(() => {
    return Object.fromEntries(permissionColumns.map((column) => [column, modeForColumn(matrix, column, customColumns[column])])) as Record<PermissionColumn, ColumnMode>;
  }, [customColumns, matrix]);

  function cycleCell(column: PermissionColumn, key: keyof PermissionPresetMatrix[PermissionColumn]) {
    setMatrix((current) => {
      const next = cloneMatrix(current);
      next[column][key] = cyclePermissionLevel(next[column][key]);
      return protectDeveloperMinimums(next);
    });
    setCustomColumns((current) => ({ ...current, [column]: true }));
    setMessage("");
  }

  function cycleColumn(column: PermissionColumn) {
    const nextMode = cycleColumnMode(columnModes[column]);
    setMatrix((current) => applyColumnMode(current, column, nextMode));
    setCustomColumns((current) => ({ ...current, [column]: nextMode === "custom" }));
    setMessage("");
  }

  function save() {
    const next = protectDeveloperMinimums(matrix);
    setSaved(cloneMatrix(next));
    setMatrix(cloneMatrix(next));
    setMessage("권한이 최신화되었습니다.");
  }

  function cancel() {
    setMatrix(cloneMatrix(saved));
    setMessage("");
  }

  function restoreDefaults() {
    const next = cloneMatrix(defaultPermissionPresetMatrix);
    setSaved(cloneMatrix(next));
    setMatrix(next);
    setCustomColumns({ developer: false, admin: false, manager: true, staff: true });
    setMessage("");
  }

  return (
    <section className="panel overflow-hidden">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xl font-black">권한 매트릭스</h3>
        <div className="flex flex-wrap gap-2">
          <button className="primary-btn" type="button" onClick={save}>권한 최신화</button>
          <button className="small-btn" type="button" onClick={cancel}>변경 취소</button>
          <button className="small-btn" type="button" onClick={restoreDefaults}>기본값으로 복원</button>
        </div>
      </div>
      {message ? <p className="mb-3 rounded-lg bg-[#eef4ed] px-3 py-2 text-sm font-black text-[#116149]">{message}</p> : null}
      <div data-horizontal-scroll="true" className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[860px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 border-b border-[#d8ded8] bg-white p-2 text-left">권한 항목</th>
              {permissionColumns.map((column) => (
                <th className="sticky top-0 z-20 border-b border-[#d8ded8] bg-white p-2 text-center" key={column}>{columnLabels[column]}</th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 top-[37px] z-30 border-b border-[#d8ded8] bg-[#f6f7f4] p-2 text-left">전체 상태</th>
              {permissionColumns.map((column) => (
                <th className="sticky top-[37px] z-20 border-b border-[#d8ded8] bg-[#f6f7f4] p-2 text-center" key={column}>
                  <button className="small-btn mx-auto" type="button" onClick={() => cycleColumn(column)}>{modeLabel[columnModes[column]]}</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrixSubjects.map((subject) => (
              <tr key={subject.key}>
                <th className="sticky left-0 z-10 border-b border-[#edf0ec] bg-white p-2 text-left font-black">
                  <span className="block">{subject.label}</span>
                  <span className="text-xs font-bold text-[#68746d]">{subject.key}</span>
                </th>
                {permissionColumns.map((column) => {
                  const level = matrix[column][subject.key];
                  return (
                    <td className="border-b border-[#edf0ec] p-2 text-center" key={`${column}-${subject.key}`}>
                      <button className={`inline-flex min-w-16 justify-center rounded-full border px-3 py-1 text-xs font-black ${levelStyle[level]}`} type="button" onClick={() => cycleCell(column, subject.key)}>
                        {levelLabel[level]}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
