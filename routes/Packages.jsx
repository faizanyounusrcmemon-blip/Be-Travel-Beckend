import Swal from "sweetalert2";
import "./packages.css";
import React, { useState, useRef, useEffect } from "react";
import usePdf from "../hooks/usePdf";
import Header from "../components/Header";

const calcNights = (inD, outD) => {
  if (!inD || !outD) return "";
  const diff = (new Date(outD) - new Date(inD)) / (1000 * 60 * 60 * 24);
  return diff > 0 ? diff : "";
};

export default function Packages({ onNavigate }) {
  const [refNo, setRefNo] = useState("");

  // CUSTOMER SELECTOR STATES
  const [customerName, setCustomerName] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [subCustomerName, setSubCustomerName] = useState("");
  const [savedCustomers, setSavedCustomers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [bookingDate, setBookingDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [contactNo, setContactNo] = useState("");
  const [searchRef, setSearchRef] = useState("");
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dynamic Visibility Toggles
  const [showAgentComm, setShowAgentComm] = useState(false);
  const [showGifting, setShowGifting] = useState(false);

  const [adultCount, setAdultCount] = useState(0);
  const [adultRate, setAdultRate] = useState(0);
  const [childCount, setChildCount] = useState(0);
  const [childRate, setChildRate] = useState(0);
  const [infantCount, setInfantCount] = useState(0);
  const [infantRate, setInfantRate] = useState(0);

  const dropdownRef = useRef(null);

  const flightTotal = adultCount * adultRate + childCount * childRate + infantCount * infantRate;

  const [flights, setFlights] = useState([
    { date: "", from: "", to: "", airline: "" },
    { date: "", from: "", to: "", airline: "" },
  ]);

  const [hotels, setHotels] = useState([]);
  const addHotelRow = () => setHotels([...hotels, { checkIn: "", checkOut: "", nights: "", location: "", hotel: "", rooms: "", type: "", rate: "", total: 0 }]);
  const removeHotelRow = (i) => setHotels(hotels.filter((_, x) => x !== i));
  const handleHotelChange = (i, field, value) => {
    const rows = [...hotels];
    rows[i][field] = value;
    if (field === "checkIn" || field === "checkOut") {
      rows[i].nights = calcNights(rows[i].checkIn, rows[i].checkOut);
    }
    const rate = Number(rows[i].rate);
    const rooms = Number(rows[i].rooms);
    const nights = Number(rows[i].nights);
    rows[i].total = rate * rooms * nights;
    setHotels(rows);
  };
  const hotelsTotal = hotels.reduce((sum, h) => sum + (h.total || 0), 0);

  // Visa Rows
  const [visaRows, setVisaRows] = useState([]);
  const addVisaRow = () => setVisaRows([...visaRows, { type: "", persons: 0, rate: 0, total: 0 }]);
  const removeVisaRow = (i) => setVisaRows(visaRows.filter((_, x) => x !== i));
  const handleVisaChange = (i, field, value) => {
    const rows = [...visaRows];
    rows[i][field] = value;
    const persons = Number(rows[i].persons);
    const rate = Number(rows[i].rate);
    rows[i].total = persons * rate;
    setVisaRows(rows);
  };
  const visaTotal = visaRows.reduce((sum, v) => sum + (v.total || 0), 0);

  // Agent Commission Rows (Visa Jaisa Structure)
  const [agentCommRows, setAgentCommRows] = useState([]);
  const addAgentCommRow = () => setAgentCommRows([...agentCommRows, { type: "", persons: 0, rate: 0, total: 0 }]);
  const removeAgentCommRow = (i) => setAgentCommRows(agentCommRows.filter((_, x) => x !== i));
  const handleAgentCommChange = (i, field, value) => {
    const rows = [...agentCommRows];
    rows[i][field] = value;
    const persons = Number(rows[i].persons);
    const rate = Number(rows[i].rate);
    rows[i].total = persons * rate;
    setAgentCommRows(rows);
  };
  const agentCommTotal = agentCommRows.reduce((sum, a) => sum + (a.total || 0), 0);

  // Gifting Rows
  const [giftingRows, setGiftingRows] = useState([]);
  const addGiftingRow = () => setGiftingRows([...giftingRows, { item: "", qty: 0, rate: 0, total: 0 }]);
  const removeGiftingRow = (i) => setGiftingRows(giftingRows.filter((_, x) => x !== i));
  const handleGiftingChange = (i, field, value) => {
    const rows = [...giftingRows];
    rows[i][field] = value;
    const qty = Number(rows[i].qty);
    const rate = Number(rows[i].rate);
    rows[i].total = qty * rate;
    setGiftingRows(rows);
  };
  const giftingTotal = giftingRows.reduce((sum, g) => sum + (g.total || 0), 0);

  // Transport Rows
  const [transportRows, setTransportRows] = useState([]);
  const addTransportRow = () => setTransportRows([...transportRows, { date: "", text: "", amount: 0 }]);
  const removeTransportRow = (i) => setTransportRows(transportRows.filter((_, x) => x !== i));
  const transportTotal = transportRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  // Ziyarat Rows
  const [ziyaratRows, setZiyaratRows] = useState([]);
  const addZiyaratRow = () => setZiyaratRows([...ziyaratRows, { text: "", amount: 0 }]);
  const removeZiyaratRow = (i) => setZiyaratRows(ziyaratRows.filter((_, x) => x !== i));
  const ziyaratTotal = ziyaratRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  // Exchange Rates
  const [flightRate, setFlightRate] = useState(0);
  const [hotelsRate, setHotelsRate] = useState(0);
  const [visaRatePKR, setVisaRatePKR] = useState(0);
  const [transportRate, setTransportRate] = useState(0);
  const [ziyaratRate, setZiyaratRate] = useState(0);

  const flightPKR = flightTotal * flightRate;
  const hotelsPKR = hotelsTotal * hotelsRate;
  const sarToPkrRate = Number(visaRatePKR || 0);
  const visaPKR = visaTotal * sarToPkrRate;
  const transportPKR = transportTotal * transportRate;
  const ziyaratPKR = ziyaratTotal * ziyaratRate;
  
  // Grand Total Includes Agent Commission & Gifting (if enabled)
  const grandPKR = flightPKR + hotelsPKR + visaPKR + transportPKR + ziyaratPKR + (showAgentComm ? agentCommTotal : 0) + (showGifting ? giftingTotal : 0);

  // Fetch customer list
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/customers/list`);
        const data = await res.json();
        if (data.success) setSavedCustomers(data.rows || []);
      } catch (err) {
        console.error("Failed to fetch customer list:", err);
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ================= PER PERSON LOGIC =================
  const adultFlightPKRTotal = adultCount * adultRate * flightRate;
  const childFlightPKRTotal = childCount * childRate * flightRate;
  const infantFlightPKRTotal = infantCount * infantRate * flightRate;

  const totalPassengers = Number(adultCount || 0) + Number(childCount || 0) + Number(infantCount || 0);

  // Visa & Agent Comm Per Person Calculation
  const visaPerPerson = totalPassengers > 0 ? visaPKR / totalPassengers : 0;
  const agentCommPerPerson = (showAgentComm && totalPassengers > 0) ? agentCommTotal / totalPassengers : 0;

  const sharedPKR = hotelsPKR + transportPKR + ziyaratPKR + (showGifting ? giftingTotal : 0);
  const sharedPerAdult = adultCount > 0 ? sharedPKR / adultCount : 0;

  // ======== FINAL PER PERSON CALCULATION WITH AGENT COMMISSION ========
  const adultPerPerson = Math.round(
    (adultCount > 0 ? adultFlightPKRTotal / adultCount : 0) + visaPerPerson + sharedPerAdult + agentCommPerPerson
  );

  const childPerPerson = childCount > 0
    ? Math.round((childFlightPKRTotal / childCount) + visaPerPerson + agentCommPerPerson)
    : 0;

  const infantPerPerson = infantCount > 0
    ? Math.round((infantFlightPKRTotal / infantCount) + visaPerPerson + agentCommPerPerson)
    : 0;

  const quoteRef = useRef(null);
  const { exportPDF, printPDF } = usePdf(quoteRef, {
    filePrefix: "Package",
    customerName: customerName,
    bookingDate: bookingDate,
    orientation: "p",
  });

  const showDate = (val) => {
    if (!val) return "";
    const d = new Date(val);
    const day = String(d.getDate()).padStart(2, "0");
    const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const year = d.getFullYear();
    return `${day}/${mon}/${year}`;
  };

const validFlights = flights.filter((f) => f.date && !isNaN(new Date(f.date)));
  let packageDays = 0;
  let packageNights = 0;

  if (validFlights.length >= 2) {
    const sortedFlights = [...validFlights].sort((a, b) => new Date(a.date) - new Date(b.date));
    const startDate = new Date(sortedFlights[0].date);
    const endDate = new Date(sortedFlights[sortedFlights.length - 1].date);
    const diffDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    packageDays = diffDays + 1;
    packageNights = diffDays;
  } else {
    // Agar ticket / flight na ho, toh Hotel Nights se calculate hoga
    const totalHotelNights = hotels.reduce((sum, h) => sum + (Number(h.nights) || 0), 0);
    if (totalHotelNights > 0) {
      packageNights = totalHotelNights;
      packageDays = totalHotelNights + 1;
    }
  }

  const filteredCustomers = savedCustomers.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.customer_code && c.customer_code.toLowerCase().includes(q))
    );
  });

  const loadPackage = async () => {
    if (!searchRef) {
      return Swal.fire({ width: "280px", icon: "warning", text: "Search Ref No likho" });
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bookings/get/${searchRef}`);
      const data = await res.json();
      if (!data.success) {
        return Swal.fire({ width: "280px", icon: "error", text: "Record not found" });
      }

      const d = data.row;
      const purchaseRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/purchase/check/${d.ref_no}`);
      const purchaseData = await purchaseRes.json();

      if (purchaseData.total > 0) {
        return Swal.fire({
          width: "300px",
          icon: "error",
          text: "❌ Cannot edit. Purchase entries exist.\nDelete purchases first."
        });
      }

      setRefNo(d.ref_no);
      setCustomerName(d.customer_name);
      setCustomerCode(d.customer_code || "");
      setSearchQuery(d.customer_code ? `${d.customer_name} (${d.customer_code})` : "");
      setSubCustomerName(d.sub_customer_name || "");
      setContactNo(d.contact_no || "");
      setBookingDate(d.booking_date);
      setAdultCount(d.adult_count);
      setAdultRate(d.adult_rate);
      setChildCount(d.child_count);
      setChildRate(d.child_rate);
      setInfantCount(d.infant_count);
      setInfantRate(d.infant_rate);
      setFlights(d.flights || []);
      setHotels(d.hotels || []);

      setVisaRows(d.visa || []);
      setAgentCommRows(d.agent_comm || []);
      setShowAgentComm(d.show_agent_comm || false);
      setGiftingRows(d.gifting || []);
      setShowGifting(d.show_gifting || false);

      setTransportRows(d.transport || []);
      setZiyaratRows(d.ziyarat || []);
      setZiyaratRate(d.ziyarat_sar_rate || 0);
      setFlightRate(d.flight_sar_rate);
      setHotelsRate(d.hotel_sar_rate);
      setVisaRatePKR(d.visa_sar_rate);
      setTransportRate(d.transport_sar_rate);
      setIsEdit(true);

      Swal.fire({ width: "260px", icon: "success", text: "Package Edit Mode Loaded" });
    } catch (err) {
      Swal.fire({ width: "300px", icon: "error", text: "Load failed" });
    }
  };

  const handleCopyPackage = () => {
    if (!isEdit) {
      return Swal.fire({ width: "280px", icon: "warning", text: "Pehle package Edit Mode me load karein" });
    }
    Swal.fire({
      width: "320px", icon: "question", text: "Create copy of this package?", showCancelButton: true, confirmButtonText: "Copy", cancelButtonText: "Cancel"
    }).then((result) => {
      if (result.isConfirmed) {
        setRefNo("");
        setIsEdit(false);
        Swal.fire({ width: "300px", icon: "success", title: "Package Copied", text: "Ab Save karne se new Ref No generate hoga" });
      }
    });
  };

  const handleSavePackage = async () => {
    if (saving) return;
    if (!customerName || !bookingDate) {
      return Swal.fire({ width: "300px", icon: "error", text: "Customer name & booking date required" });
    }

    const confirm = await Swal.fire({
      width: "300px", icon: "question", text: "Do you want to save this Package?", showCancelButton: true, confirmButtonText: "Save", cancelButtonText: "Cancel"
    });

    if (!confirm.isConfirmed) return;
    setSaving(true);

    Swal.fire({ width: "260px", title: "Saving...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const payload = {
      ref_no: refNo || null,
      customer_code: customerCode || null,
      customer_name: customerName,
      sub_customer_name: subCustomerName || null,
      contact_no: contactNo,
      booking_date: bookingDate,
      adult_count: adultCount,
      adult_rate: adultRate,
      child_count: childCount,
      child_rate: childRate,
      infant_count: infantCount,
      infant_rate: infantRate,
      flight_total: flightTotal,
      flights,
      hotels,
      hotels_total: hotelsTotal,
      transport: transportRows,
      transport_total: transportTotal,
      ziyarat: ziyaratRows,
      ziyarat_total: ziyaratTotal,
      
      // Dynamic New Fields
      show_agent_comm: showAgentComm,
      agent_comm: agentCommRows,
      agent_comm_total: agentCommTotal,
      show_gifting: showGifting,
      gifting: giftingRows,
      gifting_total: giftingTotal,

      flight_sar_total: flightTotal,
      hotel_sar_total: hotelsTotal,
      visa: visaRows,
      visa_total: visaTotal,
      visa_sar_total: visaTotal,
      transport_sar_total: transportTotal,
      ziyarat_sar_total: ziyaratTotal,
      flight_sar_rate: flightRate,
      hotel_sar_rate: hotelsRate,
      visa_sar_rate: visaRatePKR,
      transport_sar_rate: transportRate,
      ziyarat_sar_rate: ziyaratRate,
      flight_pkr_total: flightPKR,
      hotel_pkr_total: hotelsPKR,
      visa_pkr_total: visaPKR,
      transport_pkr_total: transportPKR,
      ziyarat_pkr_total: ziyaratPKR,
      net_pkr_total: grandPKR,
      total_sar: flightTotal + hotelsTotal + visaTotal + transportTotal + ziyaratTotal,
      total_pkr: grandPKR,
      per_person_qty: totalPassengers,
      per_person_final: adultPerPerson,
      adult_per_person: adultPerPerson,
      child_per_person: childPerPerson,
      infant_per_person: infantPerPerson
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bookings/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      Swal.close();

      if (data.success) {
        await Swal.fire({
          width: "320px", icon: "success", title: "Saved Successfully",
          html: `<div style="text-align:left"><b>Ref#:</b> ${data.ref_no}<br/><b>Customer:</b> ${customerName} ${customerCode ? `(${customerCode})` : "(Walk-In)"}</div>`
        });
        onNavigate("dashboard");
      } else {
        Swal.fire({ width: "300px", icon: "error", text: data.error || "Save failed" });
      }
    } catch (err) {
      Swal.close();
      Swal.fire({ width: "300px", icon: "error", text: "Server Error" });
    }
    setSaving(false);
  };

  const styles = {
    container: { minHeight: "100vh", padding: 20, background: "linear-gradient(to right, #e0f7fa, #fdf6e3)", fontFamily: "'Cairo', sans-serif" },
    quoteCard: { background: "#fff", borderRadius: 15, padding: 20, boxShadow: "0 8px 20px rgba(0,0,0,0.12)" },
  };

  return (
    <div style={styles.container}>
      {/* TOP BAR */}
      <div className="d-flex justify-content-between mb-3 align-items-center">
        <button className="btn btn-secondary btn-sm" onClick={() => onNavigate("dashboard")}>⬅ Back</button>
        
        {/* HIDE / SHOW CHECKBOXES */}
        <div className="d-flex gap-3 bg-white p-2 rounded shadow-sm border">
          <div className="form-check form-switch m-0">
            <input className="form-check-input" type="checkbox" id="commCheck" checked={showAgentComm} onChange={(e) => setShowAgentComm(e.target.checked)} />
            <label className="form-check-label fw-bold text-primary" htmlFor="commCheck">🤝 Agent Commission</label>
          </div>
          <div className="form-check form-switch m-0">
            <input className="form-check-input" type="checkbox" id="giftCheck" checked={showGifting} onChange={(e) => setShowGifting(e.target.checked)} />
            <label className="form-check-label fw-bold text-success" htmlFor="giftCheck">🎁 Gifting</label>
          </div>
        </div>

        <div className="d-flex gap-2">
          <button className={`btn btn-sm ${isEdit ? "btn-warning text-dark" : "btn-primary"}`} onClick={handleSavePackage} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "✏ Update Save" : "💾 Save"}
          </button>
          <input className="form-control form-control-sm" style={{ width: "150px" }} placeholder="Search Ref No" value={searchRef} onChange={(e) => setSearchRef(e.target.value)} />
          <button className="btn btn-warning btn-sm" onClick={loadPackage}>🔄 Load / Edit</button>
          <button className="btn btn-success btn-sm" onClick={handleCopyPackage}>📋 Copy Package</button>
{/* 📄 Export PDF (With Uplift Effect) */}
          <button
            className="btn fw-bold text-white shadow"
            style={{
              background: "linear-gradient(135deg,#28a745,#20c997)",
              border: "none",
              borderRadius: "12px",
              padding: "8px 18px",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px) scale(1.03)";
              e.currentTarget.style.boxShadow = "0 6px 15px rgba(40, 167, 69, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.15)";
            }}
            onClick={exportPDF}
          >
            📄 Export PDF
          </button>

          {/* 🖨️ Print (With Uplift Effect) */}
          <button
            className="btn fw-bold text-white shadow"
            style={{
              background: "linear-gradient(135deg,#6c757d,#343a40)",
              border: "none",
              borderRadius: "12px",
              padding: "8px 18px",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px) scale(1.03)";
              e.currentTarget.style.boxShadow = "0 6px 15px rgba(108, 117, 125, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.15)";
            }}
            onClick={printPDF}
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* QUOTE CARD */}
      <div ref={quoteRef} style={styles.quoteCard}>


        <Header title="PACKAGE QUOTATION" />

        {/* CUSTOMER INFO - WITH NEW AUTOCOMPLETE SEARCH DROPDOWN */}
        <div className="row g-3 mb-3">
          <div className="col-md-2">
            <label className="fw-bold mb-1">Ref No</label>
            <input className="form-control form-control-sm" value={refNo} readOnly />
          </div>

          {/* Autocomplete Dynamic Dropdown */}
          <div className="col-md-3" ref={dropdownRef} style={{ position: "relative" }}>
            <label className="fw-bold mb-1 text-primary">🔍 Registered Customer</label>
            <div className="input-group input-group-sm">
              <input
                className="form-control"
                placeholder="Search registered..."
                value={searchQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
              />
              {searchQuery && (
                <button 
                  className="btn btn-outline-danger btn-sm" 
                  type="button" 
                  onClick={() => {
                    setSearchQuery("");
                    setCustomerCode("");
                    setCustomerName("");
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {showDropdown && (
              <div 
                className="dropdown-menu show shadow w-100 p-2" 
                style={{ 
                  maxHeight: "200px", 
                  overflowY: "auto", 
                  position: "absolute", 
                  zIndex: 9999,
                  background: "#fff"
                }}
              >
                {filteredCustomers.length === 0 ? (
                  <div className="dropdown-item text-muted text-center py-2">No customers found</div>
                ) : (
                  filteredCustomers.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      className="dropdown-item d-flex justify-content-between align-items-center py-2 border-bottom"
                      onClick={() => {
                        setCustomerName(c.name); 
                        setCustomerCode(c.customer_code); 
                        setSearchQuery(`${c.name} (${c.customer_code})`);
                        setShowDropdown(false);
                      }}
                    >
                      <span className="fw-bold text-dark">{c.name}</span>
                      <span className="badge bg-danger text-white">{c.customer_code}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Customer Manual Fallback Textbox */}
          <div className="col-md-3">
            <label className="fw-bold mb-1">Customer Name</label>
            <input 
              className="form-control form-control-sm" 
              placeholder="Or write manually here..."
              value={customerName} 
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (customerCode) {
                  setCustomerCode("");
                  setSearchQuery("");
                }
              }} 
            />
            {customerCode ? (
              <small className="text-success d-block mt-1 fw-bold">
                ✓ Linked ({customerCode})
              </small>
            ) : (
              customerName && (
                <small className="text-warning d-block mt-1 fw-bold">
                  Manual Walk-In
                </small>
              )
            )}
          </div>

  {/* FIELD 4: SUB / END CUSTOMER NAME (2 cols) */}
  <div className="col-md-2">
    <label className="fw-bold mb-1 text-dark">🏷️ Sub Customer</label>
    <input
      type="text"
      className="form-control form-control-sm"
      placeholder="Passenger / Client..."
      value={subCustomerName}
      onChange={(e) => setSubCustomerName(e.target.value)}
    />
    <small className="text-muted d-block mt-1">End client / Pax</small>
  </div>



          <div className="col-md-2">
            <label className="fw-bold mb-1">Contact No</label>
            <input type="text" className="form-control form-control-sm" value={contactNo} onChange={(e) => setContactNo(e.target.value)} />
          </div>




          <div className="col-md-2">
            <label className="fw-bold mb-1">Booking Date</label>
            <input type="date" className="form-control form-control-sm" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
            <small className="text-muted d-block mt-1">{showDate(bookingDate)}</small>
          </div>

          <div className="col-md-2">
            <label className="fw-bold text-muted mb-1 d-block">
              📅 Package Duration
            </label>

            <div
              style={{
                minWidth: "200px",
                padding: "8px 12px",
                borderRadius: "12px",
                background: "#f8f9fa",
                border: "2px solid #20c997",
                textAlign: "center",
                boxShadow: "0 2px 10px rgba(0,0,0,.08)",
              }}
            >
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  color: "#198754",
                }}
              >
                {packageDays}
                <span style={{ fontSize: "12px" }}> Days</span>
              </div>

              <div
                style={{
                  fontSize: "13px",
                  color: "#6c757d",
                  fontWeight: "600",
                }}
              >
                🌙 {packageNights} Nights
              </div>
            </div>
          </div>
        </div>

        {/* FLIGHT SECTION */}
        <h6 className="section-title">✈️ Flight</h6>
        <table className="table table-sm">
          <thead><tr><th>Details</th><th>Adult</th><th>Child</th><th>Infant</th><th>Total</th></tr></thead>
          <tbody>
<tr>
              <td>
                {flights.map((f, idx) => (
                  <div key={idx} className="mb-2">
                    <div className="d-flex gap-2">
                      <input type="date" className="form-control form-control-sm" value={f.date} onChange={(e) => { const updated = [...flights]; updated[idx].date = e.target.value; setFlights(updated); }} />
                      <input type="text" placeholder="From" className="form-control form-control-sm" value={f.from} onChange={(e) => { const updated = [...flights]; updated[idx].from = e.target.value; setFlights(updated); }} />
                      <input type="text" placeholder="To" className="form-control form-control-sm" value={f.to} onChange={(e) => { const updated = [...flights]; updated[idx].to = e.target.value; setFlights(updated); }} />
                      <input type="text" placeholder="Airline" className="form-control form-control-sm" style={{ width: "140px" }} value={f.airline} onChange={(e) => { const updated = [...flights]; updated[idx].airline = e.target.value; setFlights(updated); }} />
                    </div>
                    {f.date && (
                      <small className="text-muted d-block mt-1 fw-bold ms-1">
                        {showDate(f.date)}
                      </small>
                    )}
                  </div>
                ))}
              </td>

              <td>Qty: <input type="number" value={adultCount} className="form-control form-control-sm" onChange={(e) => setAdultCount(+e.target.value)} /> Rate: <input type="number" value={adultRate} className="form-control form-control-sm" onChange={(e) => setAdultRate(+e.target.value)} /></td>
              <td>Qty: <input type="number" value={childCount} className="form-control form-control-sm" onChange={(e) => setChildCount(+e.target.value)} /> Rate: <input type="number" value={childRate} className="form-control form-control-sm" onChange={(e) => setChildRate(+e.target.value)} /></td>
              <td>Qty: <input type="number" value={infantCount} className="form-control form-control-sm" onChange={(e) => setInfantCount(+e.target.value)} /> Rate: <input type="number" value={infantRate} className="form-control form-control-sm" onChange={(e) => setInfantRate(+e.target.value)} /></td>
              <td className="fw-bold">{flightTotal.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

{/* HOTELS SECTION */}
<h6 className="section-title">🏨 Hotels</h6>
<button className="btn btn-outline-primary btn-sm mb-2" onClick={addHotelRow}>➕ Add Hotel Row</button>
<table className="table table-sm" style={{ minWidth: "100%" }}>
  <tbody>
    {hotels.map((h, i) => (
      <React.Fragment key={i}>
        {/* HOTEL NAME ROW */}
        <tr>
          <td colSpan={9} style={{ fontWeight: "700", textAlign: "left", padding: "5px 10px", background: "#cce5ff" }}>
            HOTEL NAME
          </td>
        </tr>
        <tr>
          <td colSpan={9}>
            <input 
              type="text" 
              className="form-control form-control-sm fs-6 fw-semibold" 
              placeholder="Enter Hotel Name" 
              value={h.hotel} 
              onChange={(e) => handleHotelChange(i, "hotel", e.target.value)} 
            />
          </td>
        </tr>

        {/* DETAILS ROW HEADER */}
        <tr style={{ background: "#20c997", color: "#fff", fontWeight: "600", textAlign: "center" }}>
          <th style={{ width: "165px" }}>Check-in</th>
          <th style={{ width: "165px" }}>Check-out</th>
          <th style={{ width: "70px" }}>Nights</th>
          <th>Location</th>
          <th style={{ width: "75px" }}>Rooms</th>
          <th style={{ width: "100px" }}>Type</th>
          <th style={{ width: "100px" }}>Rate</th>
          <th style={{ width: "80px" }}>Total</th>
          <th style={{ width: "40px" }}>Action</th>
        </tr>

{/* DETAILS INPUTS */}
        <tr className="align-middle text-center">
          <td style={{ width: "165px" }}>
            <input type="date" className="form-control form-control-sm" value={h.checkIn} onChange={(e) => handleHotelChange(i, "checkIn", e.target.value)} />
            {h.checkIn && (
              <small className="text-muted d-block mt-1 fw-bold">
                {showDate(h.checkIn)}
              </small>
            )}
          </td>
          <td style={{ width: "165px" }}>
            <input type="date" className="form-control form-control-sm" value={h.checkOut} onChange={(e) => handleHotelChange(i, "checkOut", e.target.value)} />
            {h.checkOut && (
              <small className="text-muted d-block mt-1 fw-bold">
                {showDate(h.checkOut)}
              </small>
            )}
          </td>
          {/* BOLD NIGHTS */}
          <td style={{ width: "70px" }}>
            <input type="number" className="form-control form-control-sm text-center fw-bold text-dark px-1" value={h.nights} readOnly />
          </td>
          {/* EXPANDED LOCATION */}
          <td>
            <input type="text" className="form-control form-control-sm" placeholder="Enter Location (e.g. Makkah)" value={h.location} onChange={(e) => handleHotelChange(i, "location", e.target.value)} />
          </td>
          <td style={{ width: "75px" }}>
            <input type="number" className="form-control form-control-sm text-center" value={h.rooms} onChange={(e) => handleHotelChange(i, "rooms", e.target.value)} />
          </td>
          <td style={{ width: "100px" }}>
            <input type="text" className="form-control form-control-sm text-center" placeholder="Quad/Dbl" value={h.type} onChange={(e) => handleHotelChange(i, "type", e.target.value)} />
          </td>
          <td style={{ width: "100px" }}>
            <input type="number" className="form-control form-control-sm text-center" value={h.rate} onChange={(e) => handleHotelChange(i, "rate", e.target.value)} />
          </td>
          <td className="fw-bold" style={{ width: "80px" }}>{h.total}</td>
          <td style={{ width: "40px" }}>
            <button className="btn btn-link text-danger p-0 border-0" onClick={() => removeHotelRow(i)}>✖</button>
          </td>
        </tr>
      </React.Fragment>
    ))}
  </tbody>
</table>

        {/* VISA SECTION */}
        <h6 className="section-title">🛂 Visa</h6>
        <button className="btn btn-outline-primary btn-sm mb-2" onClick={addVisaRow}>➕ Add Visa Row</button>
        <table className="table table-sm">
          <thead><tr><th>Visa Type</th><th width="120">Persons</th><th width="150">Rate</th><th width="150">Total</th><th></th></tr></thead>
          <tbody>
            {visaRows.map((v, i) => (
              <tr key={i}>
                <td><input type="text" className="form-control form-control-sm" placeholder="Visa Type" value={v.type} onChange={(e) => handleVisaChange(i, "type", e.target.value)} /></td>
                <td><input type="number" className="form-control form-control-sm" value={v.persons} onChange={(e) => handleVisaChange(i, "persons", e.target.value)} /></td>
                <td><input type="number" className="form-control form-control-sm" value={v.rate} onChange={(e) => handleVisaChange(i, "rate", e.target.value)} /></td>
                <td className="fw-bold">{v.total}</td>
                <td><button className="btn btn-link text-danger" onClick={() => removeVisaRow(i)}>✖</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* AGENT COMMISSION SECTION (CHECKBOX DRIVEN) */}
        {showAgentComm && (
          <>
            <h6 className="section-title" style={{ background: "linear-gradient(to right, #6f42c1, #a17fe0)" }}>🤝 Agent Commission</h6>
            <button className="btn btn-outline-primary btn-sm mb-2" onClick={addAgentCommRow}>➕ Add Agent Comm Row</button>
            <table className="table table-sm">
              <thead><tr><th>Type / Description</th><th width="120">Persons</th><th width="150">Rate (PKR)</th><th width="150">Total</th><th></th></tr></thead>
              <tbody>
                {agentCommRows.map((a, i) => (
                  <tr key={i}>
                    <td><input type="text" className="form-control form-control-sm" placeholder="e.g. Adult Comm" value={a.type} onChange={(e) => handleAgentCommChange(i, "type", e.target.value)} /></td>
                    <td><input type="number" className="form-control form-control-sm" value={a.persons} onChange={(e) => handleAgentCommChange(i, "persons", e.target.value)} /></td>
                    <td><input type="number" className="form-control form-control-sm" value={a.rate} onChange={(e) => handleAgentCommChange(i, "rate", e.target.value)} /></td>
                    <td className="fw-bold">{a.total}</td>
                    <td><button className="btn btn-link text-danger" onClick={() => removeAgentCommRow(i)}>✖</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {agentCommRows.length > 0 && <div className="fw-bold text-end mb-3 text-purple">Agent Comm Total: {agentCommTotal.toLocaleString()} PKR</div>}
          </>
        )}

        {/* GIFTING SECTION (CHECKBOX DRIVEN) */}
        {showGifting && (
          <>
            <h6 className="section-title" style={{ background: "linear-gradient(to right, #198754, #20c997)" }}>🎁 Gifting</h6>
            <button className="btn btn-outline-success btn-sm mb-2" onClick={addGiftingRow}>➕ Add Gift Item</button>
            <table className="table table-sm">
              <thead><tr><th>Gift Item</th><th width="120">Qty</th><th width="150">Rate</th><th width="150">Total</th><th></th></tr></thead>
              <tbody>
                {giftingRows.map((g, i) => (
                  <tr key={i}>
                    <td><input type="text" className="form-control form-control-sm" placeholder="e.g. Dates, Zamzam" value={g.item} onChange={(e) => handleGiftingChange(i, "item", e.target.value)} /></td>
                    <td><input type="number" className="form-control form-control-sm" value={g.qty} onChange={(e) => handleGiftingChange(i, "qty", e.target.value)} /></td>
                    <td><input type="number" className="form-control form-control-sm" value={g.rate} onChange={(e) => handleGiftingChange(i, "rate", e.target.value)} /></td>
                    <td className="fw-bold">{g.total}</td>
                    <td><button className="btn btn-link text-danger" onClick={() => removeGiftingRow(i)}>✖</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {giftingRows.length > 0 && <div className="fw-bold text-end mb-3 text-success">Gifting Total: {giftingTotal.toLocaleString()} PKR</div>}
          </>
        )}


{/* TRANSPORT & ZIYARAT */}
<h6 className="section-title">🚐 Transport</h6>
<button className="btn btn-outline-primary btn-sm mb-2" onClick={addTransportRow}>
  ➕ Add Transport Row
</button>
<table className="table table-sm">
  <thead>
    <tr>
      <th width="170">Travel Date</th>
      <th>Description</th>
      <th width="150">Amount (SAR)</th>
      <th width="40"></th>
    </tr>
  </thead>
  <tbody>
    {transportRows.map((t, i) => (
      <tr key={i}>
        <td>
          <input
            type="date"
            className="form-control form-control-sm"
            value={t.date || ""}
            onChange={(e) => {
              const updated = [...transportRows];
              updated[i].date = e.target.value;
              setTransportRows(updated);
            }}
          />
          {t.date && (
            <small className="text-muted d-block mt-1 fw-bold">
              {showDate(t.date)}
            </small>
          )}
        </td>
        <td>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Transport details..."
            value={t.text}
            onChange={(e) => {
              const updated = [...transportRows];
              updated[i].text = e.target.value;
              setTransportRows(updated);
            }}
          />
        </td>
        <td>
          <input
            type="number"
            className="form-control form-control-sm"
            value={t.amount}
            onChange={(e) => {
              const updated = [...transportRows];
              updated[i].amount = +e.target.value;
              setTransportRows(updated);
            }}
          />
        </td>
        <td>
          <button className="btn btn-link text-danger p-0" onClick={() => removeTransportRow(i)}>
            ✖
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>

        <h6 className="section-title">🕌 Ziyarat</h6>
        <button className="btn btn-outline-primary btn-sm mb-2" onClick={addZiyaratRow}>➕ Add Ziyarat Row</button>
        <table className="table table-sm">
          <tbody>
            {ziyaratRows.map((z, i) => (
              <tr key={i}>
                <td><input type="text" className="form-control form-control-sm" value={z.text} onChange={(e) => { const updated = [...ziyaratRows]; updated[i].text = e.target.value; setZiyaratRows(updated); }} /></td>
                <td width="150"><input type="number" className="form-control form-control-sm" value={z.amount} onChange={(e) => { const updated = [...ziyaratRows]; updated[i].amount = +e.target.value; setZiyaratRows(updated); }} /></td>
                <td><button className="btn btn-link text-danger" onClick={() => removeZiyaratRow(i)}>✖</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* SUMMARY SECTION */}
        <h6 className="section-title">📊 Summary</h6>
        <table className="table table-sm">
          <thead><tr><th>Item</th><th>SAR</th><th>Rate</th><th>PKR</th></tr></thead>
          <tbody>
            <tr><td>Flight</td><td>{flightTotal.toLocaleString()}</td><td><input type="number" className="form-control form-control-sm" value={flightRate} onChange={(e) => setFlightRate(+e.target.value)} /></td><td className="fw-bold">{flightPKR.toLocaleString()}</td></tr>
            <tr><td>Hotels</td><td>{hotelsTotal.toLocaleString()}</td><td><input type="number" className="form-control form-control-sm" value={hotelsRate} onChange={(e) => setHotelsRate(+e.target.value)} /></td><td className="fw-bold">{hotelsPKR.toLocaleString()}</td></tr>
            <tr><td>Visa</td><td>{visaTotal.toLocaleString()}</td><td><input type="number" className="form-control form-control-sm" value={visaRatePKR} onChange={(e) => setVisaRatePKR(+e.target.value)} /></td><td className="fw-bold">{visaPKR.toLocaleString()}</td></tr>
            <tr><td>Transport</td><td>{transportTotal.toLocaleString()}</td><td><input type="number" className="form-control form-control-sm" value={transportRate} onChange={(e) => setTransportRate(+e.target.value)} /></td><td className="fw-bold">{transportPKR.toLocaleString()}</td></tr>
            <tr><td>Ziyarat</td><td>{ziyaratTotal.toLocaleString()}</td><td><input type="number" className="form-control form-control-sm" value={ziyaratRate} onChange={(e) => setZiyaratRate(+e.target.value)} /></td><td className="fw-bold">{ziyaratPKR.toLocaleString()}</td></tr>

            {showAgentComm && (
              <tr style={{ background: "#f3e8ff" }}>
                <td>Agent Commission</td>
                <td>-</td>
                <td>-</td>
                <td className="fw-bold text-purple">{agentCommTotal.toLocaleString()}</td>
              </tr>
            )}

            {showGifting && (
              <tr style={{ background: "#e6f4ea" }}>
                <td>Gifting</td>
                <td>-</td>
                <td>-</td>
                <td className="fw-bold text-success">{giftingTotal.toLocaleString()}</td>
              </tr>
            )}

            <tr className="table-info">
              <td className="fw-bold">Grand Total PKR</td>
              <td></td>
              <td></td>
              <td className="fw-bold">{grandPKR.toLocaleString()}</td>
            </tr>

            <tr style={{ background: "#d4edda" }}>
              <td className="fw-bold">Adult Per Person</td>
              <td>{adultCount}</td>
              <td></td>
              <td className="fw-bold">{adultPerPerson.toLocaleString()}</td>
            </tr>

            <tr style={{ background: "#fff3cd" }}>
              <td className="fw-bold">Child Per Person</td>
              <td>{childCount}</td>
              <td></td>
              <td className="fw-bold">{childPerPerson.toLocaleString()}</td>
            </tr>

            <tr style={{ background: "#f8d7da" }}>
              <td className="fw-bold">Infant Per Person</td>
              <td>{infantCount}</td>
              <td></td>
              <td className="fw-bold">{infantPerPerson.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-2 p-2 text-center small" style={{ background: "#12c1d8", color: "white" }}>
          THESE ARE TENTATIVE RATES AND CAN CHANGE WITHOUT NOTICE. PACKAGE CAN BE FINALIZED AFTER BOOKING PAYMENTS AND MAY VARY WITH ROE.
        </div>
      </div>
    </div>
  );
}