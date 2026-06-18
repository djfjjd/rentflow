"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ParsedShop = {
  name: string;
  address: string;
};

type ImportResult = {
  saved?: ParsedShop[];
  skipped?: Array<ParsedShop & { reason?: string }>;
  failedGeocode?: ParsedShop[];
  error?: string;
  message?: string;
};

export function RepairShopImportPage() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const parsed = useMemo(() => parseRepairShopText(text), [text]);

  async function save() {
    setSaving(true);
    setResult(null);
    try {
      const response = await fetch("/api/repair-shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shops: parsed }),
        cache: "no-store",
      });
      const responseBody = await response.text();
      console.log("repair shops import response", { status: response.status, body: responseBody });
      const data = parseImportResponse(responseBody);
      if (!response.ok) throw new Error(data.error || responseBody || "저장 실패");
      setResult({ ...data, message: `저장 완료: ${data.saved?.length || 0}건` });
    } catch (error) {
      setResult({ error: `저장 실패: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] p-4 text-[#16211d]">
      <section className="mx-auto grid max-w-5xl gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black">정비업체 가져오기</h1>
            <p className="text-sm font-bold text-[#667269]">TXT 파일 또는 직접 입력으로 업체명과 주소를 저장합니다.</p>
          </div>
          <Link className="small-btn" href="/admin/repair-shops/map">지도 보기</Link>
        </div>

        <section className="panel space-y-3">
          <label className="label">
            TXT 파일 업로드
            <input
              className="field"
              type="file"
              accept=".txt,text/plain"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setText(await file.text());
              }}
            />
          </label>
          <label className="label">
            텍스트 직접 붙여넣기
            <textarea
              className="field min-h-52"
              placeholder={"믿음자동차공업사 | 서울 양천구 오목로52길 1\n남도자동차공업사 | 서울 강서구 양천로47길 30"}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <button className="primary-btn w-full" disabled={!parsed.length || saving} type="button" onClick={save}>
            {saving ? "좌표 변환 및 저장 중" : `저장 ${parsed.length}건`}
          </button>
        </section>

        <section className="panel">
          <h2 className="mb-3 text-xl font-black">미리보기</h2>
          {parsed.length ? (
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b"><th>업체명</th><th>주소</th></tr></thead>
                <tbody>
                  {parsed.map((shop, index) => (
                    <tr className="border-b" key={`${shop.name}-${shop.address}-${index}`}>
                      <td className="py-2 font-black">{shop.name}</td>
                      <td className="py-2 font-bold text-[#667269]">{shop.address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-10 text-center text-sm font-bold text-[#667269]">업체명 | 주소 형식으로 입력하면 미리보기가 표시됩니다.</p>
          )}
        </section>

        {result ? (
          <section className="panel space-y-3">
            <h2 className="text-xl font-black">처리 결과</h2>
            {result.error ? <p className="font-black text-red-700">{result.error}</p> : null}
            {result.message ? <p className="font-black text-green-700">{result.message}</p> : null}
            <div className="grid gap-2 sm:grid-cols-3">
              <ResultCard label="저장" value={`${result.saved?.length || 0}건`} />
              <ResultCard label="중복 제외" value={`${result.skipped?.length || 0}건`} />
              <ResultCard label="좌표 실패" value={`${result.failedGeocode?.length || 0}건`} />
            </div>
            {result.failedGeocode?.length ? (
              <div>
                <h3 className="mb-2 font-black">좌표 변환 실패 업체</h3>
                <div className="grid gap-2">
                  {result.failedGeocode.map((shop, index) => (
                    <p className="rounded-lg bg-[#fff7f4] p-3 text-sm font-bold text-[#9a3f24]" key={`${shop.name}-${index}`}>
                      {shop.name} · {shop.address}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </section>
    </main>
  );
}

function parseImportResponse(value: string): ImportResult {
  if (!value) return {};
  try {
    return JSON.parse(value) as ImportResult;
  } catch {
    return { error: value };
  }
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-[#d8ded8] bg-white p-4">
      <p className="text-sm font-black text-[#68746d]">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </article>
  );
}

function parseRepairShopText(value: string) {
  const seen = new Set<string>();
  const shops: ParsedShop[] = [];

  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes("|")) continue;
    const [namePart, ...addressParts] = trimmed.split("|");
    const name = namePart.trim();
    const address = addressParts.join("|").trim();
    const key = `${name}:${address}`;
    if (!name || !address || seen.has(key)) continue;
    seen.add(key);
    shops.push({ name, address });
  }

  return shops;
}
