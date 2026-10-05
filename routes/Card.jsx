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
    padding: "25px",
    background: "linear-gradient(135deg, #f0f7ff, #fafcff)",
    fontFamily: "'Cairo', sans-serif",
  },
  card: {
    maxWidth: 1100,
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: 22,
    padding: 35,
    boxShadow: "0 10px 30px rgba(186, 210, 240, 0.25)",
    border: "1px solid #e2ebd8",
  },
  sectionHeader: {
    background: "linear-gradient(90deg, #60a5fa, #93c5fd)",
    color: "#ffffff",
    padding: "7px 14px",
    borderRadius: "8px",
    marginTop: 25,
    marginBottom: 12,
    fontWeight: "600",
    letterSpacing: 1,
    boxShadow: "0 4px 12px rgba(147, 197, 253, 0.35)",
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: "0",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
  },
  th: {
    background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
    color: "#ffffff",
    padding: "10px",
    textAlign: "left",
    fontWeight: "600",
  },
  td: {
    padding: "10px",
    borderBottom: "1px solid #f1f5f9",
    background: "#ffffff",
    color: "#475569",
  },
};

export default function Card({ onNavigate }) {
  // ⚡ Load / Edit Ref States
  const [searchRef, setSearchRef] = useState("");
  const [refNo, setRefNo] = useState("");
  
  // ⚡ Separated Customer States
  const [customerName, setCustomerName] = useState("");
  const [subCustomerName, setSubCustomerName] = useState(""); // ⚡ SUB CUSTOMER NAME STATE
  const [customerCode, setCustomerCode] = useState(""); 
  const [savedCustomers, setSavedCustomers] = useState([]); 
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); 
  
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split("T")[0]);
  const [rows, setRows] = useState([]);
  const [pkrRate, setPkrRate] = useState(0);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const pdfRef = useRef(null);
  const dropdownRef = useRef(null);

  const { exportPDF, printPDF } = usePdf(pdfRef, {
    filePrefix: "Card",
    customerName: customerName,
    bookingDate: bookingDate,
    orientation: "p",
  });

  // Fetch registered customers
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

  // Dropdown close click-outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // -------------------- Row Management --------------------
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

  // -------------------- Load Existing Card --------------------
  const loadCard = async () => {
    if (!searchRef) {
      return Swal.fire({
        width: "300px",
        icon: "error",
        text: "Ref No likho"
      });
    }

    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/card/get/${searchRef}`);
    const data = await res.json();

    if (!data.success) {
      return Swal.fire({
        width: "300px",
        icon: "error",
        text: "Record not found"
      });
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
    
    // UI input fields load management
    if (d.customer_code) {
      setSearchQuery(`${d.customer_name} (${d.customer_code})`);
    } else {
      setSearchQuery("");
    }

    setBookingDate(d.booking_date);
    setRows(d.rows || []);
    setPkrRate(d.pkr_rate || 0);
    setIsEdit(true);

    Swal.fire({
      width: "300px",
      icon: "success",
      text: "Card loaded for edit"
    });
  };

  // -------------------- Save / Update --------------------
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
      text: "Do you want to save this Card?",
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
      sub_customer_name: subCustomerName || null, // ⚡ ADDED TO PAYLOAD
      booking_date: bookingDate,
      rows,
      pkr_rate: pkrRate,
    };

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/card/save`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
        Swal.fire({ width: "300px", icon: "error", text: data.error });
      }
    } catch (err) {
      Swal.close();
      Swal.fire({
        width: "300px",
        icon: "error",
        text: "Network Error"
      });
    }

    setSaving(false);
  };

  // Calculated Totals
  const totalSAR = rows.reduce((s, r) => s + Number(r.total || 0), 0);
  const totalPKR = totalSAR * (Number(pkrRate) || 0);

  // Filter dropdown customers list
  const filteredCustomers = savedCustomers.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.customer_code && c.customer_code.toLowerCase().includes(q))
    );
  });

  return (
    <div style={styles.container}>
      {/* ⚡ TOP CONTROL BAR */}
      <div className="d-flex justify-content-between mb-3">
        <button className="btn btn-dark btn-sm" style={styles.button} onClick={() => onNavigate("dashboard")}>← Back</button>
        <div className="d-flex gap-2">
          <button
            className={`btn btn-sm ${isEdit ? "btn-warning text-dark" : "btn-primary"}`}
            style={styles.button}
            onClick={saveData}
            disabled={saving}
          >
            {saving ? "Saving..." : isEdit ? "✏ Update Save" : "💾 Save"}
          </button>
          
          {/* ⚡ REF NO INPUT */}
          <input 
            className="form-control form-control-sm" 
            style={{ width: 140, borderRadius: 50 }} 
            placeholder="Search Ref" 
            value={searchRef} 
            onChange={(e) => setSearchRef(e.target.value)}
          />
          <button className="btn btn-warning btn-sm" style={styles.button} onClick={loadCard}>🔄 Load / Edit</button>

          {/* 📄 Export PDF */}
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

          {/* 🖨️ Print */}
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

      <div ref={pdfRef} style={styles.card}>
        <Header title="💳 VACCINATION CARD QUOTATION" />

        {/* ⚡ CUSTOMER INFO ROW */}
        <div className="row g-3 mb-4 align-items-end">
          
          {/* FIELD 1: Ref No Display (ReadOnly) */}
          <div className="col-md-2">
            <label className="fw-bold mb-1 d-block">Ref No</label>
            <input
              className="form-control form-control-sm"
              value={refNo}
              readOnly
            />
          </div>

          {/* FIELD 2: SMART DROPDOWN (ONLY FOR REGISTERED CUSTOMERS) */}
          <div className="col-md-3" ref={dropdownRef} style={{ position: "relative" }}>
            <label className="fw-bold mb-1 text-primary">🔍 Select Registered Customer</label>
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

            {/* Selector Dropdown Menu */}
            {showDropdown && (
              <div 
                className="dropdown-menu show shadow w-100 p-2" 
                style={{ 
                  maxHeight: "220px", 
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
                      <span className="badge bg-primary text-white">{c.customer_code}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            <small className="text-muted d-block mt-1">Use ONLY for registered profiles</small>
          </div>

          {/* FIELD 3: CUSTOMER NAME INPUT */}
          <div className="col-md-2">
            <label className="fw-bold mb-1 text-dark">👤 Customer Name</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Or write manually..."
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

          {/* FIELD 5: BOOKING DATE */}
          <div className="col-md-2">
            <label className="fw-bold mb-1 d-block">Booking Date</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
            />
            <small className="text-muted d-block mt-1">
              {showDate(bookingDate)}
            </small>
          </div>
        </div>

        <h5 style={styles.sectionHeader}>💳 VACCINATION CARD Details</h5>
        <button className="btn btn-outline-primary btn-sm mb-2" style={styles.button} onClick={addRow}>➕ Add Card Row</button>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Persons</th>
              <th style={styles.th}>Rate (SAR)</th>
              <th style={styles.th}>Total (SAR)</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#f0e6ff" : "#fff" }}>
                <td style={styles.td}><input className="form-control form-control-sm" value={r.type} onChange={(e) => updateRow(i, "type", e.target.value)} /></td>
                <td style={styles.td}><input type="number" className="form-control form-control-sm" value={r.persons} onChange={(e) => updateRow(i, "persons", e.target.value)} /></td>
                <td style={styles.td}><input type="number" className="form-control form-control-sm" value={r.rate} onChange={(e) => updateRow(i, "rate", e.target.value)} /></td>
                <td style={{ ...styles.td, fontWeight: "bold" }}>{r.total}</td>
                <td style={{ ...styles.td, textAlign: "center" }}><button className="btn btn-sm btn-danger" onClick={() => removeRow(i)}>✖</button></td>
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