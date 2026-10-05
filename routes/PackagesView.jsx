import React, { useEffect, useState, useRef } from "react";
import usePdf from "../hooks/usePdf";
import Header from "../components/Header";
import Swal from "sweetalert2";

/* ================= CLICK COPY HANDLER ================= */
const handleCopyRef = (refNo) => {
  if (!refNo || refNo === "-") return;

  const showToast = () => {
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
  };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(refNo).then(showToast).catch(() => fallbackCopy(refNo, showToast));
  } else {
    fallbackCopy(refNo, showToast);
  }
};

const fallbackCopy = (text, callback) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand("copy");
    if (callback) callback();
  } catch (err) {
    console.error("Fallback copy failed", err);
  }
  document.body.removeChild(textArea);
};

/* ================= DATE FORMAT ================= */
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

export default function PackagesView({ id, onNavigate, fromPage }) {
  const [data, setData] = useState(null);
  
  // DEFAULT INITIALLY OFF (FALSE) FOR ALL SWITCHES
  const [hideAmounts, setHideAmounts] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showAgentComm, setShowAgentComm] = useState(false);
  
  // NEW SWITCH FOR TOGGLING DESIGN VIEWS (Classic vs Modern VIP)
  const [useModernUI, setUseModernUI] = useState(true);

  const ref = useRef(null);

  const { exportPDF, printPDF } = usePdf(ref, {
    filePrefix: "Package",
    customerName: data?.customer_name,
    bookingDate: data?.booking_date,
    orientation: "p",
  });

  useEffect(() => {
    if (!id) return;

    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bookings/get/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) return;
        setData(res.row);
      });
  }, [id]);

  if (!data) return <div className="p-4 text-center text-secondary fw-semibold">Loading package quotation...</div>;

/* ================= PACKAGE DURATION ================= */
  const flightDates = Array.isArray(data.flights)
    ? data.flights
        .map((f) => f.date)
        .filter(Boolean)
        .sort()
    : [];

  let packageDays = 0;
  let packageNights = 0;

  if (flightDates.length >= 2) {
    const startDate = new Date(flightDates[0]);
    const endDate = new Date(flightDates[flightDates.length - 1]);

    const diff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));

    packageDays = diff + 1;
    packageNights = diff;
  } else if (Array.isArray(data.hotels) && data.hotels.length > 0) {
    // Agar valid flight dates na hon, toh hotels ke nights ka sum calculation ke liye use hoga
    const totalHotelNights = data.hotels.reduce(
      (sum, h) => sum + (Number(h.nights) || 0),
      0
    );

    if (totalHotelNights > 0) {
      packageNights = totalHotelNights;
      packageDays = totalHotelNights + 1;
    }
  }

  /* ================= AMOUNTS & CALCULATIONS ================= */
  let adultCount = Number(data.adult_count || 0);
  let childCount = Number(data.child_count || 0);
  let infantCount = Number(data.infant_count || 0);

  const rate = {
    flight: Number(data.flight_sar_rate || 1),
    hotels: Number(data.hotel_sar_rate || 0),
    visa: Number(data.visa_sar_rate || 0),
    transport: Number(data.transport_sar_rate || 0),
    ziyarat: Number(data.ziyarat_sar_rate || 0),
  };

  const adultFlightPKR = adultCount * Number(data.adult_rate || 0) * rate.flight;
  const childFlightPKR = childCount * Number(data.child_rate || 0) * rate.flight;
  const infantFlightPKR = infantCount * Number(data.infant_rate || 0) * rate.flight;

  const totalPassengers = adultCount + childCount + infantCount;

  const visaPKR = Number(data.visa_pkr_total || Number(data.visa_sar_total || 0) * rate.visa);
  const visaPerPerson = totalPassengers > 0 ? visaPKR / totalPassengers : 0;

  const hotelsPKR = Number(data.hotel_pkr_total || Number(data.hotel_sar_total || 0) * rate.hotels);
  const transportPKR = Number(data.transport_pkr_total || Number(data.transport_sar_total || 0) * rate.transport);
  const ziyaratPKR = Number(data.ziyarat_pkr_total || Number(data.ziyarat_sar_total || 0) * rate.ziyarat);

  let giftPKR = Number(data.gifting_total || data.gifting_pkr_total || 0);
  if (!giftPKR && Array.isArray(data.gifting)) {
    giftPKR = data.gifting.reduce((acc, item) => {
      const itemTotal = Number(item.total || Number(item.qty || 0) * Number(item.rate || 0));
      return acc + (isNaN(itemTotal) ? 0 : itemTotal);
    }, 0);
  }

  let agentCommPKR = Number(data.agent_comm_total || data.agent_commission_pkr || 0);
  if (!agentCommPKR && Array.isArray(data.agent_comm)) {
    agentCommPKR = data.agent_comm.reduce((acc, item) => {
      const itemTotal = Number(item.total || Number(item.persons || 0) * Number(item.rate || 0));
      return acc + (isNaN(itemTotal) ? 0 : itemTotal);
    }, 0);
  }
  if (isNaN(agentCommPKR)) agentCommPKR = 0;

  const agentCommPerPerson = totalPassengers > 0 ? agentCommPKR / totalPassengers : 0;

  const sharedPKR = hotelsPKR + transportPKR + ziyaratPKR + (showGift ? giftPKR : 0);
  const sharedPerAdult = adultCount > 0 ? sharedPKR / adultCount : 0;

  const adultPerPerson = Math.round(
    (adultCount > 0 ? adultFlightPKR / adultCount : 0) + visaPerPerson + sharedPerAdult + agentCommPerPerson
  );

  const childPerPerson = childCount > 0
    ? Math.round((childFlightPKR / childCount) + visaPerPerson + agentCommPerPerson)
    : 0;

  const infantPerPerson = infantCount > 0
    ? Math.round((infantFlightPKR / infantCount) + visaPerPerson + agentCommPerPerson)
    : 0;

/* ================= LIGHT ICE BLUE VOUCHER ================= */
  const GiftSection = () => (
    showGift ? (
      <div className="my-3">
        <div
          className="rounded-4 overflow-hidden"
          style={{
            backgroundColor: "#f0f9ff", // Soft Light Blue Tint
            border: "1.5px solid #bae6fd",
            boxShadow: "0 2px 8px rgba(14, 165, 233, 0.08)",
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact"
          }}
        >
          <div className="row g-0 align-items-stretch">
            {/* LEFT VOUCHER STRIP */}
            <div 
              className="col-3 col-md-2 p-3 text-center d-flex flex-column justify-content-center align-items-center"
              style={{
                backgroundColor: "#e0f2fe",
                borderRight: "2px dashed #7dd3fc",
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact"
              }}
            >
              <span style={{ fontSize: "26px" }}>🎁</span>
              <span className="fw-bold mt-1" style={{ fontSize: "10px", color: "#0369a1", letterSpacing: "0.5px" }}>
                FREE GIFT
              </span>
            </div>

            {/* RIGHT CONTENT AREA */}
            <div className="col-9 col-md-10 p-3" style={{ backgroundColor: "#f0f9ff" }}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <h6 className="fw-bold m-0" style={{ fontSize: "13px", color: "#0c4a6e", letterSpacing: ".3px" }}>
                    COMPLIMENTARY PACKAGE BONUS
                  </h6>
                  <span style={{ color: "#0369a1", fontSize: "10px" }}>Special gift included with your booking</span>
                </div>
                <span 
                  className="px-2 py-1 rounded-pill fw-bold" 
                  style={{ fontSize: "9px", backgroundColor: "#e0f2fe", color: "#0369a1", border: "1px solid #7dd3fc" }}
                >
                  ★ INCLUDED
                </span>
              </div>

              {/* ITEMS CONTAINER */}
              <div className="rounded-3 p-2 my-2" style={{ backgroundColor: "#ffffff", border: "1px solid #bae6fd" }}>
                {Array.isArray(data.gifting) && data.gifting.length > 0 ? (
                  data.gifting.map((g, i) => (
                    <div 
                      key={i} 
                      className="d-flex justify-content-between align-items-center py-1.5 px-2"
                      style={{ borderBottom: i !== data.gifting.length - 1 ? "1px solid #f0f9ff" : "none" }}
                    >
                      <span className="fw-semibold" style={{ fontSize: "11px", color: "#1f2937" }}>
                        <span style={{ color: "#0284c7", marginRight: "4px" }}>✦</span>
                        {g.item || g.gift_item || g.name || "Gift Item"}
                      </span>
                      {g.qty && (
                        <span 
                          className="px-2 py-0.5 rounded-pill fw-bold" 
                          style={{ fontSize: "9px", backgroundColor: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd" }}
                        >
                          QTY: {g.qty}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <span className="fw-semibold" style={{ fontSize: "11px", color: "#1f2937" }}>
                    <span style={{ color: "#0284c7", marginRight: "4px" }}>✦</span>
                    {data.gift || data.gift_details || "Complimentary Gift Included"}
                  </span>
                )}
              </div>

              {/* FOOTER TOTAL */}
              {!hideAmounts && (
                <div className="d-flex justify-content-between align-items-center mt-2 pt-1">
                  <span style={{ fontSize: "10px", color: "#0369a1", fontWeight: "700", letterSpacing: "0.5px" }}>
                    TOTAL GIFT VALUE:
                  </span>
                  <span 
                    className="fw-bold px-2.5 py-1 rounded-3" 
                    style={{ backgroundColor: "#0284c7", color: "#ffffff", fontSize: "11px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                  >
                    {giftPKR.toLocaleString()} PKR
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    ) : null
  );

  return (
    <div className="container mt-3 mb-5" style={{ maxWidth: "900px" }}>
      {/* ===== TOP CONTROL PANEL ===== */}
      <div className="d-flex justify-content-between mb-3 align-items-center flex-wrap gap-2 p-3 bg-white rounded-4 shadow-sm border">
        <div className="d-flex gap-2">
          <button className="btn btn-secondary btn-sm rounded-3" onClick={() => onNavigate(fromPage || "allreports")}>
            ⬅ Back
          </button>
        </div>

        {/* TOGGLE OPTIONS */}
        <div className="d-flex gap-3 bg-light p-2 rounded-3 border align-items-center flex-wrap">
          {/* UI STYLE SWITCH */}
          <div className="form-check form-switch m-0 pe-2 border-end">
            <input
              className="form-check-input style-pointer"
              type="checkbox"
              id="uiToggleSwitch"
              checked={useModernUI}
              onChange={(e) => setUseModernUI(e.target.checked)}
            />
            <label className="form-check-label fw-bold text-dark style-pointer small" htmlFor="uiToggleSwitch">
              {useModernUI ? "✨ VIP Modern UI" : "📄 Classic UI"}
            </label>
          </div>

          <div className="form-check form-switch m-0">
            <input className="form-check-input style-pointer" type="checkbox" id="hideAmountCheck" checked={hideAmounts} onChange={(e) => setHideAmounts(e.target.checked)} />
            <label className="form-check-label fw-bold text-dark style-pointer small" htmlFor="hideAmountCheck">
              👁️ Hide Amounts
            </label>
          </div>

          <div className="form-check form-switch m-0">
            <input className="form-check-input style-pointer" type="checkbox" id="commCheck" checked={showAgentComm} onChange={(e) => setShowAgentComm(e.target.checked)} />
            <label className="form-check-label fw-bold text-primary style-pointer small" htmlFor="commCheck">
              🤝 Agent Comm
            </label>
          </div>

          <div className="form-check form-switch m-0">
            <input className="form-check-input style-pointer" type="checkbox" id="giftCheck" checked={showGift} onChange={(e) => setShowGift(e.target.checked)} />
            <label className="form-check-label fw-bold text-success style-pointer small" htmlFor="giftCheck">
              🎁 Gifting
            </label>
          </div>
        </div>

        {/* EXPORT BUTTONS */}
        <div className="d-flex gap-2">
          <button className="btn btn-sm text-white fw-bold shadow-sm rounded-3 px-3" style={{ background: "linear-gradient(135deg,#28a745,#20c997)", border: "none" }} onClick={exportPDF}>
            📄 Export PDF
          </button>
          <button className="btn btn-sm text-white fw-bold shadow-sm rounded-3 px-3" style={{ background: "linear-gradient(135deg,#6c757d,#343a40)", border: "none" }} onClick={printPDF}>
            🖨️ Print
          </button>
        </div>
      </div>

      {/* ================= Printable Document Container ================= */}
      <div ref={ref}>
        {useModernUI ? (
          /* =========================================================
             1. MODERN VIP DESIGN (NEW UI)
          ========================================================= */
          <div className="bg-white p-4 p-md-5 rounded-4 shadow-lg border" style={{ margin: "auto", fontFamily: "'Segoe UI', Roboto, sans-serif", color: "#2d3748" }}>
            <Header title="PACKAGE QUOTATION" />

<div className="p-3 mb-4 rounded-4" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
    <div>
      <span className="badge bg-primary px-3 py-2 rounded-pill fs-6 mb-2">
        PACKAGE —{" "}
        <span
          style={{ cursor: "pointer" }}
          title="Click to copy Ref No"
          onClick={() => handleCopyRef(data.ref_no)}
        >
          {data.ref_no}
        </span>
      </span>
<div className="mb-2" style={{ fontSize: "14px", fontWeight: "600" }}>
  <span style={{ color: "#6c757d", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
    Customer:{" "}
  </span>
  <span className="fw-bold" style={{ color: "#0d6efd", fontSize: "17px" }}>
    {data.customer_name || "-"}
  </span>
</div>

<div style={{ fontSize: "14px", fontWeight: "600" }}>
  <span style={{ color: "#6c757d", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
    Sub Customer:{" "}
  </span>
  <span className="fw-bold" style={{ color: "#0d9488", fontSize: "15px" }}>
    {data.sub_customer_name || "-"}
  </span>
</div>

      <div className="text-secondary small">
        📞 {data.contact_no || "N/A"} | 📅 Booking Date: {fmtDate(data.booking_date)}
      </div>
    </div>

    {/* PDF & PRINT FRIENDLY DURATION BOX */}
    <div 
      className="px-4 py-2 rounded-4 text-center shadow-sm" 
      style={{ 
        backgroundColor: "#059669", 
        color: "#ffffff",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact" 
      }}
    >
      <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "#ffffff", opacity: 0.9 }}>
        Duration
      </div>
      <div style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff" }}>
        📅 {packageDays} Days / 🌙 {packageNights} Nights
      </div>
    </div>
  </div>
</div>

            {/* Flights */}
            <div className="mb-4">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="fs-5">✈️</span>
                <h5 className="fw-bold text-primary m-0">Flight Details</h5>
              </div>
              <div className="border rounded-3 p-3 bg-white shadow-sm mb-2">
                {Array.isArray(data.flights) && data.flights.length > 0 ? (
                  data.flights.map((f, i) => (
                    <div key={i} className="d-flex justify-content-between align-items-center py-1 border-bottom last-no-border">
                      <span className="fw-medium text-dark">{fmtDate(f.date)} — <span className="text-primary">{f.from}</span> → <span className="text-primary">{f.to}</span></span>
                      {f.airline && <span className="badge bg-light text-dark border">{f.airline}</span>}
                    </div>
                  ))
                ) : <p className="m-0 text-muted small">No flight details</p>}
              </div>
              {!hideAmounts && (
                <div className="p-2 px-3 rounded-3 bg-light border small d-flex justify-content-between text-secondary">
                  <div><strong>Breakdown:</strong> Adult ({data.adult_count}×{data.adult_rate}) | Child ({data.child_count}×{data.child_rate}) | Infant ({data.infant_count}×{data.infant_rate})</div>
                  <div><strong>Flight PKR:</strong> <span className="text-dark fw-bold">{Number(data.flight_pkr_total || 0).toLocaleString()} PKR</span></div>
                </div>
              )}
            </div>

            {/* Hotels */}
            <div className="mb-4">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="fs-5">🏨</span>
                <h5 className="fw-bold text-success m-0">Hotels</h5>
              </div>
              {Array.isArray(data.hotels) && data.hotels.length > 0 ? (
                <div className="row g-2">
                  {data.hotels.map((h, i) => (
                    <div key={i} className="col-12">
                      <div className="border p-3 rounded-3 shadow-sm bg-white">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <strong className="text-dark fs-6">🛏️ {h.hotel}</strong>
                          <span className="badge bg-soft-success text-success border border-success-subtle">📍 {h.location}</span>
                        </div>
                        <div className="text-muted small mb-1">Check In: <span className="fw-semibold text-primary">{fmtDate(h.checkIn)}</span> ➔ Check Out: <span className="fw-semibold text-danger">{fmtDate(h.checkOut)}</span></div>
                        <div className="d-flex justify-content-between border-top pt-2 mt-2 small">
                          <span className="text-secondary">Nights: <b>{h.nights}</b> | Rooms: <b>{h.rooms}</b> | Type: <b>{h.type}</b></span>
                          {!hideAmounts && <span className="fw-bold text-dark">Rate: {h.rate} — Total: {h.total}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted small">No hotels</p>}
            </div>

            {/* Visa */}
            <div className="mb-4">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="fs-5">🛂</span>
                <h5 className="fw-bold text-warning m-0 text-dark">Visa Details</h5>
              </div>
              {Array.isArray(data.visa) && data.visa.length > 0 ? (
                data.visa.map((v, i) => (
                  <div key={i} className="border p-2 px-3 rounded-3 mb-1 shadow-sm bg-white d-flex justify-content-between small">
                    <span className="fw-medium text-dark">{v.type || "Visa"} ({v.persons} Person/s)</span>
                    {!hideAmounts && <span className="fw-bold">{v.persons} × {v.rate} = {v.total}</span>}
                  </div>
                ))
              ) : <p className="text-muted small">No visa</p>}
            </div>

{/* Transport & Ziyarat */}
<div className="row">
  <div className="col-md-6 mb-3">
    <h6 className="fw-bold text-danger">🚐 Transport</h6>
    {Array.isArray(data.transport) && data.transport.length > 0 ? (
      data.transport.map((t, i) => (
        <div key={i} className="border p-2 rounded mb-1 bg-white small d-flex justify-content-between align-items-center">
          <div>
            {t.date && <span className="fw-bold text-primary d-block">{fmtDate(t.date)}</span>}
            <span>{t.text}</span>
          </div>
          {!hideAmounts && <b className="ms-2">{Number(t.amount || 0).toLocaleString()} SAR</b>}
        </div>
      ))
    ) : <p className="text-muted small">No transport</p>}
  </div>
  <div className="col-md-6 mb-3">
    <h6 className="fw-bold" style={{ color: "#6f42c1" }}>🕌 Ziyarat</h6>
    {Array.isArray(data.ziyarat) && data.ziyarat.length > 0 ? (
      data.ziyarat.map((z, i) => (
        <div key={i} className="border p-2 rounded mb-1 bg-white small d-flex justify-content-between">
          <span>{z.text || z.route || z.description}</span>
          {!hideAmounts && <b>{Number(z.amount || 0).toLocaleString()} SAR</b>}
        </div>
      ))
    ) : <p className="text-muted small">No ziyarat</p>}
  </div>
</div>

            <GiftSection />

            {/* Agent Comm */}
            {showAgentComm && (
              <div className="mb-4">
                <h6 className="fw-bold text-dark">💼 Agent Commission</h6>
                <div className="border p-3 rounded-3 bg-light small">
                  {Array.isArray(data.agent_comm) && data.agent_comm.length > 0 ? (
                    data.agent_comm.map((a, i) => (
                      <div key={i}><b>Type:</b> {a.type || "Agent Commission"} {a.persons ? `(${a.persons} Persons)` : ""} {!hideAmounts && a.rate ? `— Rate: ${a.rate} PKR` : ""}</div>
                    ))
                  ) : <div><b>Agent:</b> {data.agent_name || "Agent Commission"}</div>}
                  {!hideAmounts && <div className="fw-bold mt-1">Amount: {agentCommPKR.toLocaleString()} PKR</div>}
                </div>
              </div>
            )}

{/* NET TOTAL SECTION (PDF PRINT OPTIMIZED) */}
<div 
  className="p-3 rounded-4 text-end my-4 shadow-sm" 
  style={{ 
    backgroundColor: "#047857", // Solid Dark Green (Gradient hataya gaya hai)
    color: "#ffffff", 
    WebkitPrintColorAdjust: "exact", 
    printColorAdjust: "exact" 
  }}
>
  <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "#ffffff", fontWeight: "600" }}>
    Total Package Amount
  </div>
  <h3 className="fw-bold m-0 mt-1" style={{ color: "#ffffff", fontSize: "28px" }}>
    NET PKR {Number(data.net_pkr_total || 0).toLocaleString()}
  </h3>
</div>

            <div className="border rounded-4 p-4 bg-white shadow-sm">
              <h5 className="fw-bold mb-3 text-dark">👥 Per Person Cost Breakdown</h5>
              <div className="row g-2 text-center">
                <div className="col-md-4"><div className="p-3 rounded-3 bg-light border"><span className="text-secondary small d-block">Adults ({adultCount})</span><span className="fs-5 fw-bold">{adultPerPerson.toLocaleString()} PKR</span></div></div>
                <div className="col-md-4"><div className="p-3 rounded-3 bg-light border"><span className="text-secondary small d-block">Children ({childCount})</span><span className="fs-5 fw-bold">{childPerPerson.toLocaleString()} PKR</span></div></div>
                <div className="col-md-4"><div className="p-3 rounded-3 bg-light border"><span className="text-secondary small d-block">Infants ({infantCount})</span><span className="fs-5 fw-bold">{infantPerPerson.toLocaleString()} PKR</span></div></div>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================
             2. CLASSIC DESIGN (YOUR ORIGINAL UI)
          ========================================================= */
          <div className="bg-white p-4 rounded-4 shadow-lg" style={{ maxWidth: "800px", margin: "auto", fontFamily: "Arial, sans-serif" }}>
            <Header title="PACKAGE QUOTATION" />

<div className="mb-3">
  <h4 className="fw-bold">
    PACKAGE —{" "}
    <span
      className="text-primary"
      style={{ cursor: "pointer" }}
      title="Click to copy Ref No"
      onClick={() => handleCopyRef(data.ref_no)}
    >
      {data.ref_no}
    </span>
  </h4>
  <p className="mb-1"><b>Customer:</b> {data.customer_name}</p>
  <p className="mb-1"><b>Sub Customer:</b> {data.sub_customer_name || "-"}</p>
  <p className="mb-1"><b>Contact No:</b> {data.contact_no || "-"}</p>
  <p className="mb-1"><b>Booking Date:</b> {fmtDate(data.booking_date)}</p>
  <div className="border rounded-3 p-3 mt-2 shadow-sm" style={{ background: "linear-gradient(135deg,#f8f9fa,#e9f7ef)", borderLeft: "5px solid #198754" }}>
    <div style={{ fontSize: "12px", color: "#6c757d", textTransform: "uppercase", fontWeight: "600" }}>Package Duration</div>
    <div style={{ fontSize: "22px", fontWeight: "800", color: "#198754" }}>📅 {packageDays} Days / 🌙 {packageNights} Nights</div>
  </div>
</div>

            <hr />

            <h5 className="fw-bold text-primary mb-2">✈️ Flight</h5>
            <div className="border p-2 rounded mb-2">
              {Array.isArray(data.flights) && data.flights.length > 0 ? (
                data.flights.map((f, i) => (
                  <div key={i} className="mb-1">
                    {fmtDate(f.date)} — {f.from} → {f.to} {f.airline && <b>({f.airline})</b>}
                  </div>
                ))
              ) : <p className="m-0">No flights</p>}
            </div>
            {!hideAmounts && (
              <p>
                Adults: {data.adult_count} × {data.adult_rate} <br />
                Child: {data.child_count} × {data.child_rate} <br />
                Infant: {data.infant_count} × {data.infant_rate} <br />
                <b>Flight SAR:</b> {Number(data.flight_sar_total || 0).toLocaleString()} <br />
                <b>SAR Rate:</b> {rate.flight} <br />
                <b>Flight PKR:</b> {Number(data.flight_pkr_total || 0).toLocaleString()}
              </p>
            )}

            <hr />

            <h5 className="fw-bold text-success mb-2">🏨 Hotels</h5>
            {Array.isArray(data.hotels) && data.hotels.length > 0 ? (
              data.hotels.map((h, i) => (
                <div key={i} className="border p-2 rounded mb-2 shadow-sm">
                  <b>🛏️ {h.hotel}</b> — 📍 {h.location}<br />
                  Check In: <span style={{ color: "#0d6efd", fontWeight: "bold" }}>{fmtDate(h.checkIn)}</span> → Check Out: <span style={{ color: "#dc3545", fontWeight: "bold" }}>{fmtDate(h.checkOut)}</span><br />
                  Nights: {h.nights}, Rooms: {h.rooms}, Type: {h.type}<br />
                  {!hideAmounts && <>Rate: {h.rate} — Total: {h.total}</>}
                </div>
              ))
            ) : <p>No hotels</p>}
            {!hideAmounts && (
              <p>
                <b>Hotel SAR:</b> {Number(data.hotel_sar_total || 0).toLocaleString()} <br />
                <b>SAR Rate:</b> {rate.hotels} <br />
                <b>Hotel PKR:</b> {Number(data.hotel_pkr_total || 0).toLocaleString()}
              </p>
            )}

            <hr />

            <h5 className="fw-bold text-warning mb-2">🛂 Visa</h5>
            {Array.isArray(data.visa) && data.visa.length > 0 ? (
              data.visa.map((v, i) => (
                <div key={i} className="border p-2 rounded mb-1 shadow-sm">
                  {v.type || "Visa"} — {v.persons} {!hideAmounts && <> × {v.rate} = {v.total}</>}
                </div>
              ))
            ) : <p>No visa</p>}
            {!hideAmounts && (
              <p>
                <b>Visa SAR:</b> {Number(data.visa_sar_total || 0).toLocaleString()} <br />
                <b>SAR Rate:</b> {rate.visa} <br />
                <b>Visa PKR:</b> {visaPKR.toLocaleString()}
              </p>
            )}

            <hr />

<h5 className="fw-bold text-danger mb-2">🚐 Transport</h5>
{Array.isArray(data.transport) && data.transport.length > 0 ? (
  data.transport.map((t, i) => (
    <div key={i} className="border p-2 rounded mb-1 shadow-sm">
      {t.date && <b className="text-primary">{fmtDate(t.date)} — </b>}
      {t.text} {!hideAmounts && <>— {Number(t.amount || 0).toLocaleString()} SAR</>}
    </div>
  ))
) : <p>No transport</p>}
            {!hideAmounts && (
              <p>
                <b>Transport SAR:</b> {Number(data.transport_sar_total || 0).toLocaleString()} <br />
                <b>SAR Rate:</b> {rate.transport} <br />
                <b>Transport PKR:</b> {Number(data.transport_pkr_total || 0).toLocaleString()}
              </p>
            )}

            <hr />

            <h5 className="fw-bold text-purple mb-2">🕌 Ziyarat</h5>
            {Array.isArray(data.ziyarat) && data.ziyarat.length > 0 ? (
              data.ziyarat.map((z, i) => (
                <div key={i} className="border p-2 rounded mb-1 shadow-sm">
                  {z.text || z.route || z.description} {!hideAmounts && <> — {Number(z.amount || 0).toLocaleString()}</>}
                </div>
              ))
            ) : <p>No ziyarat</p>}
            {!hideAmounts && (
              <p>
                <b>Ziyarat SAR:</b> {Number(data.ziyarat_sar_total || 0).toLocaleString()} <br />
                <b>SAR Rate:</b> {rate.ziyarat} <br />
                <b>Ziyarat PKR:</b> {Number(data.ziyarat_pkr_total || 0).toLocaleString()}
              </p>
            )}

            <GiftSection />

            {showAgentComm && (
              <>
                <hr />
                <h5 className="fw-bold text-dark mb-2">💼 Agent Commission</h5>
                <div className="border p-2 rounded mb-2 shadow-sm bg-light">
                  {Array.isArray(data.agent_comm) && data.agent_comm.length > 0 ? (
                    data.agent_comm.map((a, i) => (
                      <div key={i} className="mb-1">
                        <b>Type / Details:</b> {a.type || "Agent Commission"} {a.persons ? `(${a.persons} Persons)` : ""} {!hideAmounts && a.rate ? ` — Rate: ${a.rate} PKR` : ""}
                      </div>
                    ))
                  ) : <p className="m-0"><b>Agent Name / Details:</b> {data.agent_name || "Agent Commission"}</p>}
                  {!hideAmounts && <p className="m-0 mt-1 fw-bold text-dark">Commission Amount: {agentCommPKR.toLocaleString()} PKR</p>}
                </div>
              </>
            )}

            <hr />

            <h4 className="fw-bold text-end text-success">
              NET PKR TOTAL: {Number(data.net_pkr_total || 0).toLocaleString()}
            </h4>  

            <hr />

            <div className="border rounded p-3 bg-light">
              <h5 className="fw-bold mb-3">👥 Per Person Cost</h5>
              <div className="d-flex justify-content-between border-bottom py-2">
                <span><b>Adults ({adultCount})</b></span>
                <span className="fw-bold">{adultPerPerson.toLocaleString()} PKR</span>
              </div>
              <div className="d-flex justify-content-between border-bottom py-2">
                <span><b>Children ({childCount})</b></span>
                <span className="fw-bold">{childPerPerson.toLocaleString()} PKR</span>
              </div>
              <div className="d-flex justify-content-between py-2">
                <span><b>Infants ({infantCount})</b></span>
                <span className="fw-bold">{infantPerPerson.toLocaleString()} PKR</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}