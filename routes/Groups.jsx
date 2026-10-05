import React, { useState, useRef, useEffect } from "react";
import usePdf from "../hooks/usePdf";
import Swal from "sweetalert2";
import Header from "../components/Header";

const showDate = (val) => {
  if (!val) return "";
  const d = new Date(val);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day}/${mon}/${year}`;
};

const styles = {
  container: {
    minHeight: "100vh",
    padding: "30px",
    background:
      "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #f0fdfa 100%)",
    fontFamily: "'Cairo', sans-serif",
  },
  group: {
    maxWidth: 1180,
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: "24px",
    padding: "35px",
    border: "1px solid #e2e8f0",
    boxShadow:
      "0 20px 40px rgba(148, 163, 184, 0.12)",
  },
  sectionHeader: {
    background:
      "linear-gradient(90deg, #818cf8, #a78bfa, #c084fc)",
    color: "#ffffff",
    padding: "12px 18px",
    borderRadius: "12px",
    marginTop: "28px",
    marginBottom: "16px",
    fontWeight: "700",
    fontSize: "15px",
    letterSpacing: "1px",
    textTransform: "uppercase",
    boxShadow:
      "0 8px 20px rgba(167, 139, 250, 0.25)",
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: "0",
    overflow: "hidden",
    borderRadius: "16px",
    background: "#ffffff",
    border: "1px solid #f1f5f9",
    boxShadow:
      "0 6px 20px rgba(0, 0, 0, 0.03)",
  },
  th: {
    background:
      "linear-gradient(90deg, #6366f1, #8b5cf6)",
    color: "#ffffff",
    padding: "13px",
    textAlign: "center",
    fontWeight: "700",
    fontSize: "14px",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #f8fafc",
    background: "#ffffff",
    color: "#334155",
    transition: ".3s",
  },

  input: {
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    padding: "10px 12px",
    background: "#f8fafc",
    color: "#334155",
  },
  summaryCard: {
    background:
      "linear-gradient(135deg, #a78bfa, #f472b6)",
    color: "#ffffff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow:
      "0 10px 25px rgba(244, 114, 182, 0.25)",
  },
};

export default function Groups({ onNavigate }) {
  const [searchRef, setSearchRef] = useState("");
  const [refNo, setRefNo] = useState("");

  // ⚡ CUSTOMER SEPARATION STATES
  const [customerName, setCustomerName] = useState("");
  const [subCustomerName, setSubCustomerName] = useState(""); // ⚡ SUB CUSTOMER NAME STATE
  const [customerCode, setCustomerCode] = useState("");
  const [savedCustomers, setSavedCustomers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split("T")[0]);
  
  // 🔹 STATES FOR DATES & DURATION
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [duration, setDuration] = useState(0);

  const [rows, setRows] = useState([]);
  const [pkrRate, setPkrRate] = useState(0);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const pdfRef = useRef(null);
  const dropdownRef = useRef(null);

  const { exportPDF, printPDF } = usePdf(pdfRef, {
    filePrefix: "Groups",
    customerName: customerName,
    bookingDate: bookingDate,
    orientation: "p",
  });

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

  // Dropdown close on outside click hook
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔹 AUTOMATIC DURATION CALCULATION EFFECT
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = end - start;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDuration(diffDays >= 0 ? diffDays : 0);
    } else {
      setDuration(0);
    }
  }, [startDate, endDate]);

  const addRow = () => setRows([...rows, { type: "", persons: 0, rate: 0, total: 0 }]);
  const removeRow = (i) => setRows(rows.filter((_, x) => x !== i));

  const updateRow = (i, field, value) => {
    const copy = [...rows];
    copy[i][field] = value;
    const persons = Number(copy[i].persons) || 0;
    const rate = Number(copy[i].rate) || 0;
    copy[i].total = persons * rate;
    setRows(copy);
  };

  // Filter dropdown entries
  const filteredCustomers = savedCustomers.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.customer_code && c.customer_code.toLowerCase().includes(q))
    );
  });

  const loadGroups = async () => {
    if (!searchRef) {
      return Swal.fire({ width: "300px", icon: "error", text: "Ref No likho" });
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/groups/get/${searchRef}`);
      const data = await res.json();

      if (!data.success) {
        return Swal.fire({ width: "300px", icon: "error", text: "Record not found" });
      }

      const purchaseRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/purchase/check/${data.row.ref_no}`);
      const purchaseData = await purchaseRes.json();

      if (purchaseData.total > 0) {
        return Swal.fire({
          width: "300px",
          icon: "error",
          text: "❌ Cannot edit. Purchase exists. Delete purchases first."
        });
      }

      const d = data.row;
      setRefNo(d.ref_no);
      setCustomerName(d.customer_name);
      setSubCustomerName(d.sub_customer_name || ""); // ⚡ LOAD SUB CUSTOMER NAME
      setCustomerCode(d.customer_code || "");

      // Sync customer selection helper state
      if (d.customer_code) {
        setSearchQuery(`${d.customer_name} (${d.customer_code})`);
      } else {
        setSearchQuery("");
      }

      setBookingDate(d.booking_date);
      
      // 🔹 LOAD DATES FROM DB
      setStartDate(d.start_date ? d.start_date.split("T")[0] : "");
      setEndDate(d.end_date ? d.end_date.split("T")[0] : "");
      
      setRows(d.rows || []);
      setPkrRate(d.pkr_rate || 0);
      setIsEdit(true);

      Swal.fire({ width: "300px", icon: "success", text: "Groups loaded for edit" });
    } catch (err) {
      Swal.fire({ width: "300px", icon: "error", text: "Load error occurred" });
    }
  };

  const saveData = async () => {
    if (saving) return;

    if (!customerName || !bookingDate) {
      return Swal.fire({ width: "300px", icon: "error", text: "Customer name & booking date required" });
    }

    const confirm = await Swal.fire({
      width: "300px",
      icon: "question",
      text: "Do you want to save this Groups?",
      showCancelButton: true,
      confirmButtonText: "Save",
      cancelButtonText: "Cancel"
    });

    if (!confirm.isConfirmed) return;

    setSaving(true);
    Swal.fire({ width: "260px", title: "Saving...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    // 🔹 PAYLOAD UPDATED WITH SUB CUSTOMER NAME
    const payload = {
      ref_no: refNo || null,
      customer_code: customerCode || null,
      customer_name: customerName,
      sub_customer_name: subCustomerName || null, // ⚡ ADDED TO PAYLOAD
      booking_date: bookingDate,
      start_date: startDate || null,
      end_date: endDate || null,
      duration: duration,
      rows,
      pkr_rate: pkrRate,
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/groups/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

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
        Swal.fire({ width: "300px", icon: "error", text: data.error });
      }
    } catch (err) {
      Swal.close();
      Swal.fire({ width: "300px", icon: "error", text: "Network Error" });
    }
    setSaving(false);
  };

  const totalSAR = rows.reduce((s, r) => s + Number(r.total || 0), 0);
  const totalPKR = totalSAR * (Number(pkrRate) || 0);

  return (
    <div style={styles.container}>
      <div className="d-flex justify-content-between mb-3">
        <button className="btn btn-dark btn-sm" style={styles.button} onClick={() => onNavigate("dashboard")}>← Back</button>
        <div className="d-flex gap-2">
          <button className={`btn btn-sm ${isEdit ? "btn-warning text-dark" : "btn-primary"}`} style={styles.button} onClick={saveData} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "✏ Update Save" : "💾 Save"}
          </button>
          <input className="form-control form-control-sm" style={{ width: 140, borderRadius: 50 }} placeholder="Search Ref" value={searchRef} onChange={(e) => setSearchRef(e.target.value)} />
          <button className="btn btn-warning btn-sm" style={styles.button} onClick={loadGroups}>🔄 Load / Edit</button>
          
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

      <div ref={pdfRef} style={styles.group}>
        <Header title="👨‍👩‍👧‍👦 GROUPS PACKAGE QUOTATION" />

        {/* ⚡ UPDATED CUSTOMER & PACKAGE INFO SECTION WITH AUTOCOMPLETE & SUB CUSTOMER NAME */}
        <div className="row g-3 mb-4 align-items-end">
          
          {/* Field 1: Ref No */}
          <div className="col-md-2">
            <label className="fw-bold mb-1">Ref No</label>
            <input className="form-control form-control-sm" value={refNo} readOnly />
          </div>

          {/* Field 2: Smart Search Input Dropdown */}
          <div className="col-md-3" ref={dropdownRef} style={{ position: "relative" }}>
            <label className="fw-bold mb-1 text-success">🔍 Select Registered Customer</label>
            <div className="input-group input-group-sm">
              <input
                className="form-control"
                placeholder="Search by code or name..."
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
                      <span className="badge bg-success text-white">{c.customer_code}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            <small className="text-muted d-block mt-1">Use ONLY for registered profiles</small>
          </div>

          {/* Field 3: Customer Name input (Editable/Auto-fill) */}
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
                ✓ Registered Linked ({customerCode})
              </small>
            ) : (
              customerName && (
                <small className="text-warning d-block mt-1 fw-bold">
                  ⚠ Manual Walk-In (No Code)
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

          {/* Field 5: Booking Date */}
          <div className="col-md-2">
            <label className="fw-bold mb-1">Booking Date</label>
            <input type="date" className="form-control form-control-sm" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
            <small className="text-muted d-block">{showDate(bookingDate)}</small>
          </div>
        </div>

        {/* 🔹 SECOND ROW OF INFO (DATES & DURATION) */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <label className="fw-bold text-success">Start Date</label>
            <input type="date" className="form-control form-control-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <small className="text-muted d-block">{showDate(startDate)}</small>
          </div>

          <div className="col-md-4">
            <label className="fw-bold text-danger">End Date (Last Date)</label>
            <input type="date" className="form-control form-control-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <small className="text-muted d-block">{showDate(endDate)}</small>
          </div>

          <div className="col-md-2">
            <label className="fw-bold text-dark mb-1 d-block" style={{ fontSize: "12px", opacity: 0.8 }}>
              📅 Duration
            </label>

            <div
              style={{
                minWidth: "160px",
                padding: "12px 10px",
                borderRadius: "12px",
                background: "#ffffff",
                borderTop: "4px solid #10b981",
                borderLeft: "1px solid #e5e7eb",
                borderRight: "1px solid #e5e7eb",
                borderBottom: "1px solid #e5e7eb",
                textAlign: "center",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
              }}
            >
              <div style={{ fontSize: "24px", fontWeight: "900", color: "#0f172a", lineHeight: "1" }}>
                {duration || 0}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "800",
                  color: "#10b981",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginTop: "4px",
                }}
              >
                Days
              </div>
            </div>
          </div>
        </div>

        <h5 style={styles.sectionHeader}>👨‍👩‍‍👧‍👦 GROUPS PACKAGE Details</h5>
        <button className="btn btn-outline-primary btn-sm mb-2" style={styles.button} onClick={addRow}>➕ Add Groups Row</button>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: "50%", textAlign: "left" }}>Type</th>
              <th style={{ ...styles.th, width: "12%" }}>Persons</th>
              <th style={{ ...styles.th, width: "15%" }}>Rate (SAR)</th>
              <th style={{ ...styles.th, width: "15%" }}>Total (SAR)</th>
              <th style={{ ...styles.th, width: "8%" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#f0e6ff" : "#fff" }}>
                <td style={styles.td}>
                  <input 
                    type="text"
                    className="form-control form-control-sm" 
                    placeholder="Package/Visa Type details..."
                    value={r.type} 
                    onChange={(e) => updateRow(i, "type", e.target.value)} 
                  />
                </td>
                <td style={styles.td}>
                  <input 
                    type="number" 
                    className="form-control form-control-sm text-center" 
                    value={r.persons} 
                    onChange={(e) => updateRow(i, "persons", e.target.value)} 
                  />
                </td>
                <td style={styles.td}>
                  <input 
                    type="number" 
                    className="form-control form-control-sm text-center" 
                    value={r.rate} 
                    onChange={(e) => updateRow(i, "rate", e.target.value)} 
                  />
                </td>
                <td style={{ ...styles.td, fontWeight: "bold", textAlign: "center" }}>
                  {r.total}
                </td>
                <td style={{ ...styles.td, textAlign: "center" }}>
                  <button className="btn btn-sm btn-danger px-2 py-0" onClick={() => removeRow(i)}>
                    ✖
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h5 style={styles.sectionHeader}>✨ Summary</h5>
        <table className="table table-sm">
          <tbody>
            <tr>
              <td>Total SAR</td>
              <td style={{ fontWeight: "bold" }}>{totalSAR}</td>
              <td>PKR Rate</td>
              <td><input className="form-control form-control-sm" type="number" value={pkrRate} onChange={(e) => setPkrRate(+e.target.value)} /></td>
              <td style={{ fontWeight: "bold" }}>{totalPKR.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}