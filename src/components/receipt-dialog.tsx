import { ReceiptIcon, PrinterIcon } from "lucide-react"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { SessionRecord } from "@/services/parking"

type Props = {
    session: SessionRecord
}

function fmt(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    })
}

function duration(min: number | null) {
    if (min === null) return "—"

    const h = Math.floor(min / 60)
    const m = min % 60

    if (h === 0) return `${m}m`
    return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function ReceiptDialog({ session }: Props) {
    const receiptNo = `SP-${String(session.id).padStart(6, "0")}`

    const printedAt = new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    })

    const rows: { label: string; value: string; mono?: boolean }[] = [
        { label: "Receipt No.", value: receiptNo, mono: true },
        { label: "Slot", value: session.slot },
        { label: "Plate No.", value: session.plate ?? "—", mono: true },
        { label: "Entry", value: fmt(session.entry) },
        { label: "Exit", value: session.exit ? fmt(session.exit) : "—" },
        { label: "Duration", value: duration(session.durationMin) },
    ]

    function handlePrint() {
        const html = `<!DOCTYPE html>
<html>
<head>
  <title>Receipt ${receiptNo}</title>

  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

    *{
      box-sizing:border-box;
      margin:0;
      padding:0;
    }

    body{
      font-family:'IBM Plex Sans',sans-serif;
      background:#fff;
      padding:32px 24px;
      width:320px;
      margin:0 auto;
      color:#0f172a;
    }

    .header{
      display:flex;
      align-items:center;
      gap:10px;
      margin-bottom:16px;
    }

    .logo{
      width:42px;
      height:42px;
      object-fit:contain;
      border-radius:8px;
      flex-shrink:0;
    }

    .brand{
      font-size:13px;
      font-weight:700;
      line-height:1.2;
    }

    .brand-sub{
      font-size:9px;
      color:#75777a;
      letter-spacing:.04em;
      text-transform:uppercase;
    }

    .label-tag{
      font-size:10px;
      font-weight:600;
      letter-spacing:.12em;
      text-transform:uppercase;
      color:#a33738;
      margin-bottom:4px;
    }

    hr.solid{
      border:none;
      border-top:2px solid #0f172a;
      margin:14px 0;
    }

    hr.dash{
      border:none;
      border-top:1px dashed #e2e8f0;
      margin:12px 0;
    }

    .row{
      display:flex;
      justify-content:space-between;
      align-items:baseline;
      margin-bottom:8px;
    }

    .row-label{
      font-size:10px;
      color:#75777a;
      text-transform:uppercase;
      letter-spacing:.06em;
      font-weight:500;
    }

    .row-value{
      font-size:12px;
      font-weight:600;
      text-align:right;
    }

    .mono{
      font-family:'IBM Plex Mono',monospace;
      font-size:11px;
    }

    .total{
      display:flex;
      justify-content:space-between;
      align-items:center;
      background:#a33738;
      border-radius:8px;
      padding:10px 14px;
      margin:14px 0;
    }

    .total-label{
      font-size:11px;
      font-weight:700;
      color:#fff;
      letter-spacing:.06em;
      text-transform:uppercase;
    }

    .total-value{
      font-family:'IBM Plex Mono',monospace;
      font-size:22px;
      font-weight:600;
      color:#fff;
    }

    .stamp{
      border:2.5px solid #16a34a;
      border-radius:6px;
      color:#16a34a;
      font-size:11px;
      font-weight:700;
      letter-spacing:.14em;
      text-transform:uppercase;
      padding:3px 10px;
      display:inline-block;
      transform:rotate(-2deg);
      margin-bottom:14px;
    }

    .footer{
      text-align:center;
      font-size:9px;
      color:#94a3b8;
      line-height:1.7;
      margin-top:8px;
    }

    .printed{
      font-size:9px;
      color:#94a3b8;
      text-align:right;
      margin-top:14px;
    }
  </style>
</head>

<body>

  <div class="header">
    <img
      src="https://i.imgur.com/xDSUCZY.png"
      alt="Logo"
      class="logo"
    />

    <div>
      <div class="brand">TechSentinel</div>
      <div class="brand-sub">Parking Management System</div>
    </div>
  </div>

  <div class="label-tag">Official Receipt</div>

  <hr class="solid"/>

  ${rows
                .map(
                    r => `
    <div class="row">
      <span class="row-label">${r.label}</span>
      <span class="row-value ${r.mono ? "mono" : ""}">
        ${r.value}
      </span>
    </div>
  `
                )
                .join("")}

  <div class="total">
    <span class="total-label">Total Paid</span>

    <span class="total-value">
      ₱${session.bill?.toFixed(2) ?? "0.00"}
    </span>
  </div>

  <div>
    <span class="stamp">✓ Paid</span>
  </div>

  <hr class="dash"/>

  <div class="footer">
    Thank you for using TechSentinel Smart Park.
    <br/>
    Please keep this receipt for your records.
  </div>

  <div class="printed">
    Printed: ${printedAt}
  </div>

  <script>
    window.onload=()=>{
      window.print();
      window.close()
    }
  <\/script>

</body>
</html>`

        const win = window.open("", "_blank", "width=400,height=680")

        if (!win) return

        win.document.write(html)
        win.document.close()
    }

    return (
        <Dialog>
            <DialogTrigger
                nativeButton
                render={
                    <button
                        className="inline-flex items-center justify-center size-7 rounded-md hover:bg-accent transition-colors"
                        onClick={e => e.stopPropagation()}
                    >
                        <ReceiptIcon className="size-3.5" />
                        <span className="sr-only">Print receipt</span>
                    </button>
                }
            />

            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Parking Receipt</DialogTitle>

                    <DialogDescription>
                        Preview and print the receipt for session {receiptNo}.
                    </DialogDescription>
                </DialogHeader>

                {/* Receipt card preview */}
                <div className="overflow-hidden rounded-lg border bg-white">

                    {/* Top Bar */}
                    <div className="border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                        Receipt Preview
                    </div>

                    {/* Receipt Body */}
                    <div
                        className="px-5 py-5 space-y-0"
                        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >

                        {/* Brand */}
                        <div className="flex items-center gap-2.5 mb-4">

                            <img
                                src="https://i.imgur.com/xDSUCZY.png"
                                alt="Logo"
                                className="w-10 h-10 object-contain rounded-md shrink-0"
                            />

                            <div>
                                <p className="text-sm font-bold leading-tight">
                                    TechSentinel
                                </p>

                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                                    Parking Management System
                                </p>
                            </div>
                        </div>

                        {/* Receipt Label */}
                        <p className="text-[10px] font-semibold tracking-widest uppercase text-[#a33738] mb-1">
                            Official Receipt
                        </p>

                        <div className="border-t-2 border-foreground mb-3" />

                        {/* Rows */}
                        <div className="space-y-2">
                            {rows.map(({ label, value, mono }) => (
                                <div
                                    key={label}
                                    className="flex justify-between items-baseline"
                                >
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                                        {label}
                                    </span>

                                    <span
                                        className={`text-xs font-semibold text-right ${mono ? "font-mono" : ""
                                            }`}
                                    >
                                        {value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Total */}
                        <div className="flex justify-between items-center bg-[#a33738] rounded-lg px-3.5 py-2.5 mt-3">

                            <span className="text-[11px] font-bold text-white uppercase tracking-wide">
                                Total Paid
                            </span>

                            <span className="font-mono text-xl font-semibold text-white">
                                ₱{session.bill?.toFixed(2) ?? "0.00"}
                            </span>
                        </div>

                        {/* Paid Stamp */}
                        <div className="mt-3">
                            <span
                                className="inline-block border-2 border-green-600 text-green-600 rounded px-2.5 py-0.5 text-[11px] font-bold tracking-widest uppercase"
                                style={{
                                    transform: "rotate(-2deg)",
                                    display: "inline-block",
                                }}
                            >
                                ✓ Paid
                            </span>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-dashed mt-3 pt-3">

                            <p className="text-center text-[9px] text-muted-foreground leading-relaxed">
                                Thank you for using TechSentinel Smart Park.
                                <br />
                                Please keep this receipt for your records.
                            </p>

                            <p className="text-right text-[9px] text-muted-foreground mt-2">
                                Printed: {printedAt}
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter showCloseButton>
                    <Button
                        onClick={handlePrint}
                        className="gap-2 bg-primary"
                    >
                        <PrinterIcon className="size-4" />
                        Print Receipt
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}