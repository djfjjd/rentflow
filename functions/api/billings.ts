type Env = {
  DB: any;
};

export async function onRequestGet({ env }: { env: Env }) {
  try {
    const { results } = await env.DB.prepare("SELECT * FROM billings ORDER BY created_at DESC").all();
    return Response.json(results.map(mapBilling));
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const billing = await request.json() as any;
    const id = billing.id || `billing_${Date.now()}`;
    await env.DB.prepare(
      "INSERT INTO billings (id, dispatch_id, contract_title, amount, fault_rate, tax_invoice_status, receivable_status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      id,
      billing.dispatchId || null,
      billing.contractTitle || null,
      Number(billing.amount || 0),
      billing.faultRate || null,
      billing.taxInvoiceStatus || null,
      billing.receivableStatus || "입금대기",
    ).run();
    return Response.json({ success: true, id });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

function mapBilling(row: any) {
  return {
    id: row.id,
    dispatchId: row.dispatch_id,
    contractTitle: row.contract_title,
    amount: row.amount,
    faultRate: row.fault_rate,
    taxInvoiceStatus: row.tax_invoice_status,
    receivableStatus: row.receivable_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
