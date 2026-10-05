import React, { useState, useRef, useEffect } from "react";
import usePdf from "../hooks/usePdf";
import Swal from "sweetalert2";
import Header from "../components/Header";

// =========================
// VIP Hotels Styles
// =========================
const styles = {
  container: {
    minHeight: "100vh",
    padding: "20px",
    background: "linear-gradient(to right, #e0f7fa, #f0f9ff)",
    fontFamily: "'Cairo', sans-serif",
  },
  card: {
    maxWidth: 1100,
    margin: "0 auto",
    background: "linear-gradient(to bottom, #ffffff, #f9fefd)",
    borderRadius: 20,
    padding: 25,
    boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
    border: "2px solid #20c997", // teal border
  },
  sectionHeader: {
    background: "linear-gradient(to right, #0d6efd, #20c997)",
    color: "#fff",
    padding: "5px 10px",
    borderRadius: "5px",
    marginTop: 20,
    marginBottom: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    borderRadius: "10px",
    overflow: "hidden",
  },
  th: {
    background: "#20c997", // teal
    color: "#fff",
    padding: "8px",
    textAlign: "left",
  },
  td: {
    padding: "6px",
    borderBottom: "1px solid #ddd",
  },
  button: {
    borderRadius: "50px",
    padding: "5px 15px",
    fontWeight: "bold",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
  },
  summaryInput: {
    fontWeight: "bold",
    fontSize: "1rem",
    background: "#fff8dc",
    border: "1px solid #20c997",
  },
};

export default function Hotels({ onNavigate }) {
  const [searchRef, setSearchRef] = useState("");
  const [refNo, setRefNo] = useState("");

  // ⚡ CUSTOMER SELECTOR STATES
  const [customerName, setCustomerName] = useState("");
  const [subCustomerName, setSubCustomerName] = useState(""); // ⚡ ADDED SUB CUSTOMER STATE
  const [customerCode, setCustomerCode] = useState("");
  const [savedCustomers, setSavedCustomers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [agentName, setAgentName] = useState("");
  const [bookingDate, setBookingDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [rows, setRows] = useState([]);
  const [sarRate, setSarRate] = useState(0);
  const pdfRef = useRef(null);
  const dropdownRef = useRef(null);

  const { exportPDF, printPDF } = usePdf(pdfRef, {
    filePrefix: "Hotel",
    customerName: customerName,
    bookingDate: bookingDate,
    orientation: "p",
  });

  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch registered customers list
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/customers/list`);
        const data = await res.json();
        if (data.success) {
          setSavedCustomers(data.rows || []);
        }
      } catch (err) {
        console.error("Failed to fetch customer list:", err);
      }
    };
    fetchCustomers();
  }, []);

  // Close dropdown on clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDate = (val) => {
    if (!val) return "";
    const d = new Date(val);
    const day = String(d.getDate()).padStart(2, "0");
    const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const year = d.getFullYear();
    return `${day}/${mon}/${year}`;
  };

  const calcNights = (inD, outD) => {
    if (!inD || !outD) return "";
    const diff = (new Date(outD) - new Date(inD)) / (1000 * 60 * 60 * 24);
    return diff > 0 ? diff : "";
  };

  const hotelsTotal = rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const hotelPKR = hotelsTotal * sarRate;

  const addRow = () =>
    setRows([...rows, { checkIn: "", checkOut: "", nights: "", location: "", hotel: "", rooms: "", type: "", rate: "", total: 0 }]);

  const removeRow = (i) => setRows(rows.filter((_, x) => x !== i));

  const updateRow = (i, field, value) => {
    const u = [...rows];
    u[i][field] = value;

    if (field === "checkIn" || field === "checkOut") {
      u[i].nights = calcNights(u[i].checkIn, u[i].checkOut);
    }

    const nights = Number(u[i].nights) || 0;
    const rooms = Number(u[i].rooms) || 0;
    const rate = Number(u[i].rate) || 0;

    u[i].total = nights * rooms * rate;
    setRows(u);
  };

  // Filter dropdown entries
  const filteredCustomers = savedCustomers.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.customer_code && c.customer_code.toLowerCase().includes(q))
    );
  });

  // ===== LOAD HOTEL WITH PURCHASE CHECK =====
  const loadHotel = async () => {
    if (!searchRef) {
      return Swal.fire({
        width: "280px",
        icon: "warning",
        text: "Search Ref No likho"
      });
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/hotels/get/${searchRef}`);
      const data = await res.json();

      if (!data.success) {
        return Swal.fire({
          width: "280px",
          icon: "error",
          text: "Record not found"
        });
      }

      const d = data.row;

      // 🔹 Purchase check
      const purchaseRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/purchase/check/${d.ref_no}`);
      const purchaseData = await purchaseRes.json();

      if (purchaseData.total > 0) {
        return Swal.fire({
          width: "300px",
          icon: "error",
          text: "❌ Cannot edit. Purchase entries exist.\nDelete purchases first."
        });
      }

      // 🔹 Load data
      setRefNo(d.ref_no);
      setCustomerName(d.customer_name);
      setSubCustomerName(d.sub_customer_name || ""); // ⚡ Load sub_customer_name
      setCustomerCode(d.customer_code || "");

      if (d.customer_code) {
        setSearchQuery(`${d.customer_name} (${d.customer_code})`);
      } else {
        setSearchQuery("");
      }

      setAgentName(d.agent_name || "");
      setBookingDate(d.booking_date);
      setRows(d.hotels || []);
      setSarRate(d.sar_rate || 0);
      setIsEdit(true);

      Swal.fire({
        width: "260px",
        icon: "success",
        text: "Hotel Edit Mode Loaded"
      });
    } catch (err) {
      Swal.fire({
        width: "300px",
        icon: "error",
        text: "Load failed"
      });
    }
  };

  const saveData = async () => {
    if (saving) return;

    if (!customerName || !bookingDate) {
      return Swal.fire({
        width: "300px",
        icon: "error",
        text: "Customer name & booking date required"
      });
    }

    const confirm = await Swal.fire({
      width: "300px",
      icon: "question",
      text: "Do you want to save this Hotel?",
      showCancelButton: true,
      confirmButtonText: "Save",
      cancelButtonText: "Cancel"
    });

    if (!confirm.isConfirmed) return;

    setSaving(true);

    Swal.fire({
      width: "260px",
      title: "Saving...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const payload = {
      ref_no: refNo || null,
      customer_code: customerCode || null,
      customer_name: customerName,
      sub_customer_name: subCustomerName || null, // ⚡ Payload sub_customer_name
      agent_name: agentName,
      booking_date: bookingDate,
      hotels: rows,
      hotels_total: hotelsTotal,
      sar_rate: sarRate,
      total_pkr: hotelPKR
    };

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/hotels/save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      const data = await res.json();
      Swal.close();

      if (data.success) {
        await Swal.fire({
          width: "320px",
          icon: "success",
          title: "Saved Successfully",
          html: `
            <div style="text-align:left">
              <b>Ref#:</b> ${data.ref_no}<br/>
              <b>Customer:</b> ${customerName} ${customerCode ? `(${customerCode})` : "(Walk-In)"}<br/>
              ${subCustomerName ? `<b>Sub Customer:</b> ${subCustomerName}` : ""}
            </div>
          `
        });
        onNavigate("dashboard");
      } else {
        Swal.fire({
          width: "300px",
          icon: "error",
          text: data.error || "Save failed"
        });
      }
    } catch (err) {
      Swal.close();
      Swal.fire({
        width: "300px",
        icon: "error",
        text: "Server Error"
      });
    }

    setSaving(false);
  };

  return (
    <div style={styles.container}>
      {/* Top Buttons */}
      <div className="d-flex justify-content-between mb-3">
        <button className="btn btn-dark btn-sm" onClick={() => onNavigate("dashboard")}>← Back</button>
        <div className="d-flex gap-2">
          <button
            className={`btn btn-sm ${isEdit ? "btn-warning text-dark" : "btn-primary"}`}
            style={styles.button}
            onClick={saveData}
            disabled={saving}
          >
            {saving ? "Saving..." : isEdit ? "✏ Update Save" : "💾 Save"}
          </button>

          <input className="form-control form-control-sm" style={{ width: "140px" }} placeholder="Search Ref" value={searchRef} onChange={(e) => setSearchRef(e.target.value)} />
          <button className="btn btn-warning btn-sm" onClick={loadHotel}>🔄 Load / Edit</button>

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

      {/* Main Card */}
      <div ref={pdfRef} style={styles.card}>

        <Header title="HOTEL QUOTATION" />

        {/* ⚡ SINGLE ROW FORM LAYOUT */}
        <div className="row g-2 mb-3">
          <div className="col-md-2">
            <label className="fw-bold mb-1">Ref No</label>
            <input className="form-control form-control-sm" value={refNo} readOnly />
          </div>

          {/* Autocomplete Input */}
          <div className="col-md-2" ref={dropdownRef} style={{ position: "relative" }}>
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

          {/* Customer Name Input (Manual/Fallback text + original badges) */}
          <div className="col-md-2">
            <label className="fw-bold mb-1">👤 Customer Name</label>
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
            <label className="fw-bold mb-1">Agent Name</label>
            <input 
              className="form-control form-control-sm" 
              value={agentName} 
              onChange={(e) => setAgentName(e.target.value)} 
              placeholder="Agent name" 
            />
          </div>

          <div className="col-md-2">
            <label className="fw-bold mb-1">Booking Date</label>
            <input 
              type="date" 
              className="form-control form-control-sm" 
              value={bookingDate} 
              onChange={(e) => setBookingDate(e.target.value)} 
            />
            <small className="text-muted">{showDate(bookingDate)}</small>
          </div>
        </div>

        {/* Hotels Table */}
        <h6 style={styles.sectionHeader}>Hotels</h6>
        <button className="btn btn-outline-primary btn-sm mb-2" onClick={addRow} style={styles.button}>➕ Add Row</button>

        <table className="table table-sm">
          <tbody>
            {rows.map((r, i) => (
              <React.Fragment key={i}>
                {/* HOTEL NAME HEADER */}
                <tr>
                  <td colSpan={9} style={{ fontWeight: "700", textAlign: "left", padding: "5px 10px", background: "#cce5ff" }}>
                    HOTEL NAME
                  </td>
                </tr>

                {/* HOTEL NAME INPUT */}
                <tr>
                  <td colSpan={9}>
                    <input
                      className="form-control form-control-sm"
                      placeholder="Enter Hotel Name"
                      value={r.hotel}
                      onChange={(e) => updateRow(i, "hotel", e.target.value)}
                    />
                  </td>
                </tr>

                {/* FIELD NAMES */}
                <tr style={{ background: "#20c997", color: "#fff", fontWeight: "600", textAlign: "center" }}>
                  <td>Check-in</td>
                  <td>Check-out</td>
                  <td>Nights</td>
                  <td>Location</td>
                  <td>Rooms</td>
                  <td>Type</td>
                  <td>Rate</td>
                  <td>Total</td>
                  <td></td>
                </tr>

                {/* FIELD INPUTS */}
                <tr>
                  <td>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={r.checkIn}
                      onChange={(e) => updateRow(i, "checkIn", e.target.value)}
                    />
                    <small className="text-muted">{showDate(r.checkIn)}</small>
                  </td>

                  <td>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={r.checkOut}
                      onChange={(e) => updateRow(i, "checkOut", e.target.value)}
                    />
                    <small className="text-muted">{showDate(r.checkOut)}</small>
                  </td>

                  <td style={{ width: "70px" }}>
                    <input
                      type="number"
                      className="form-control form-control-sm text-center"
                      value={r.nights}
                      readOnly
                    />
                  </td>

                  <td style={{ minWidth: "220px" }}>
                    <input
                      className="form-control form-control-sm"
                      value={r.location}
                      onChange={(e) => updateRow(i, "location", e.target.value)}
                      placeholder="City / Area"
                    />
                  </td>

                  <td style={{ width: "80px" }}>
                    <input
                      type="number"
                      className="form-control form-control-sm text-center"
                      value={r.rooms}
                      onChange={(e) => updateRow(i, "rooms", e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      className="form-control form-control-sm"
                      value={r.type}
                      onChange={(e) => updateRow(i, "type", e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={r.rate}
                      onChange={(e) => updateRow(i, "rate", e.target.value)}
                    />
                  </td>

                  <td className="fw-bold">{r.total}</td>

                  <td>
                    <button
                      className="btn btn-sm btn-link text-danger"
                      onClick={() => removeRow(i)}
                    >
                      ✖
                    </button>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <h6 style={styles.sectionHeader}>Summary</h6>
        <table className="table table-sm">
          <tbody>
            <tr>
              <td>Hotels SAR</td>
              <td className="fw-bold">{hotelsTotal}</td>
              <td>SAR Rate</td>
              <td><input type="number" className="form-control form-control-sm" value={sarRate} onChange={(e) => setSarRate(+e.target.value)} /></td>
              <td className="fw-bold">{hotelPKR.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}