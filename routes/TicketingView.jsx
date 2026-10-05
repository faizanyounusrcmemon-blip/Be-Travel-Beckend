import React, { useEffect, useState, useRef } from "react";
import usePdf from "../hooks/usePdf";
import Header from "../components/Header";
import Swal from "sweetalert2";

/* ================= CLICK COPY HANDLER ================= */
const handleCopyRef = (refNo) => {
  if (!refNo || refNo === "-") return;

  navigator.clipboard.writeText(refNo).then(() => {
    Swal.fire({
      icon: "success",
      title: "Copied!",
      text: `Ref No: ${refNo} copied to clipboard`,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
    });
  }).catch((err) => {
    console.error("Copy failed: ", err);
  });
};

/* ================= HELPERS ================= */
const fmt = (v) => Number(v || 0).toLocaleString("en-US");

// ✅ Updated date format: 01/FEB/2026
const fmtDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  const day = String(dt.getDate()).padStart(2, "0");
  const mon = dt.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const year = dt.getFullYear();
  return `${day}/${mon}/${year}`;
};



export default function TicketingView({ id, onNavigate, fromPage }) {
  const [data, setData] = useState(null);
  const ref = useRef(null);

  const { exportPDF, printPDF } = usePdf(ref, {
    filePrefix: "Ticket",
    customerName: data?.customer_name,
    bookingDate: data?.booking_date,
    orientation: "p",
  });


  /* ================= LOAD TICKETING ================= */
  useEffect(() => {
    if (!id) return;

    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/ticketing/get/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) return;

        const row = res.row;

        const safe = (v) => {
          if (!v) return [];
          if (Array.isArray(v)) return v;
          try { return JSON.parse(v); } catch { return []; }
        };

        row.flight_from = safe(row.flight_from);
        row.flight_to = safe(row.flight_to);
        row.flight_date = safe(row.flight_date);
        row.airline = safe(row.airline);

        setData(row);
      });
  }, [id]);

  /* ================= EXPORT PDF ================= */


  if (!data) return <div className="p-3">Loading...</div>;

/* ================= TRIP DURATION ================= */
const flightDates = (data.flight_date || [])
  .filter(Boolean)
  .sort();

let tripDays = 0;
let tripNights = 0;

if (flightDates.length >= 2) {
  const startDate = new Date(flightDates[0]);
  const endDate = new Date(
    flightDates[flightDates.length - 1]
  );

  const diff =
    (endDate - startDate) /
    (1000 * 60 * 60 * 24);

  tripDays = diff + 1;
  tripNights = diff;
}


  return (
    <div className="container mt-3 mb-5">
      {/* ===== TOP ACTIONS ===== */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
<button
  className="btn btn-sm text-white fw-bold shadow"
  style={{
    background: "linear-gradient(135deg,#000,#434343)",
    borderRadius: 8,
    padding: "6px 16px",
  }}
  onClick={() => onNavigate(fromPage || "allreports")}
>
  ⬅ Back
</button>

<button
  className="btn btn-success btn-sm fw-bold shadow"
  style={{ borderRadius: 8, padding: "6px 16px" }}
  onClick={exportPDF}
>
  📄 Export PDF
</button>

<button
  className="btn btn-secondary btn-sm fw-bold shadow"
  style={{ borderRadius: 8, padding: "6px 16px" }}
  onClick={printPDF}
>
  🖨️ Print
</button>
      </div>

      {/* ===== PRINT AREA ===== */}
      <div
        ref={ref}
        className="bg-white p-4 rounded-4 shadow-lg"
        style={{ maxWidth: "800px", margin: "auto", fontFamily: "Arial, sans-serif" }}
      >
        {/* ===== HEADER ===== */}


{/* ===== TICKETING DETAILS ===== */}
<Header title="🎫 TICKETING DETAILS" />

{/* 1. BASIC INFO (Ref No & Booking Date) */}
<div className="row mb-3">
  <div className="col-6">
    <b>Ref No:</b>{" "}
    <span
      className="fw-bold text-primary"
      style={{ cursor: "pointer" }}
      title="Click to copy Ref No"
      onClick={() => handleCopyRef(data.ref_no)}
    >
      {data.ref_no}
    </span>
  </div>
  <div className="col-6 text-end">
    <b>Booking Date:</b> {fmtDate(data.booking_date)}
  </div>
</div>

{/* 2. CUSTOMER & SUB CUSTOMER */}
<div className="d-flex justify-content-between mb-3">
  <div><b>Customer Name:</b> {data.customer_name}</div>
  <div className="text-end">
    <b>Sub Customer:</b> {data.sub_customer_name || "-"}
  </div>
</div>

{/* 3. DURATION BADGE */}
<div className="mb-3">
  <div
    style={{
      background: "linear-gradient(135deg,#ff6f61,#ffa07a)",
      color: "#fff",
      padding: "8px 12px",
      borderRadius: "12px",
      textAlign: "center",
      fontWeight: "700",
      boxShadow: "0 3px 8px rgba(0,0,0,0.15)",
    }}
  >
    📅 {tripDays > 0 ? `${tripDays} Days / ${tripNights} Nights` : "Duration N/A"}
  </div>
</div>

<hr />



{/* ===== FLIGHT ROUTES ===== */}
<h5 className="fw-bold text-primary mb-2">✈️ Flight Routes</h5>

{data.flight_from.length === 0 && (
  <p className="text-muted">No routes</p>
)}

{data.flight_from.map((f, i) => (
  <div
    key={i}
    className="border rounded p-3 mb-2 shadow-sm"
  >
    <div className="fw-bold fs-6">
      {f} → {data.flight_to[i]}
    </div>

    <div className="mt-2">
      <span
        className="badge bg-primary"
        style={{
          fontSize: "12px",
          padding: "6px 10px",
        }}
      >
        📅 {fmtDate(data.flight_date[i])}
      </span>

      {data.airline?.[i] && (
        <span className="fw-bold text-success ms-2">
          ✈ {data.airline[i]}
        </span>
      )}
    </div>
  </div>
))}

        {/* ===== PASSENGERS ===== */}
        <h5 className="fw-bold text-primary mb-2">👥 Passengers</h5>
        <p>Adult: {data.adult_qty} × {data.adult_rate}</p>
        <p>Child: {data.child_qty} × {data.child_rate}</p>
        <p>Infant: {data.infant_qty} × {data.infant_rate}</p>

        <hr />

        {/* ===== TOTALS ===== */}
        <h5 className="fw-bold text-success mb-2">💰 Totals</h5>
        <p><b>Total SAR:</b> {fmt(data.total_sar)}</p>
        <p><b>PKR Rate:</b> {fmt(data.pkr_rate)}</p>
        <h4 className="fw-bold text-success">Total PKR: {fmt(data.total_pkr)}</h4>
      </div>
    </div>
  );
}
