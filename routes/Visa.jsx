import React, { useState, useRef, useEffect } from "react";
import usePdf from "../hooks/usePdf";
import Swal from "sweetalert2";
import Header from "../components/Header";

const showDate = (val) => {
  if (!val) return "";
  const d = new Date(val);

  const day = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-US", {
    month: "short",
  });
  const year = d.getFullYear();

  return `${day}/${mon}/${year}`;
};

// VIP Visa Styles (Purple + Silver)
const styles = {
  container: {
    minHeight: "100vh",
    padding: "20px",
    background: "linear-gradient(to right, #f4f0ff, #f9f9ff)",
    fontFamily: "'Cairo', sans-serif",
  },
  card: {
    maxWidth: 1100,
    margin: "0 auto",
    background: "linear-gradient(to bottom, #ffffff, #f7f4ff)",
    borderRadius: 20,
    padding: 30,
    boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
    border: "2px solid #c0c0c0",
  },

  sectionHeader: {
    background: "linear-gradient(to right, #6a0dad, #8a2be2)",
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
    borderSpacing: "0",
    borderRadius: "10px",
    overflow: "hidden",
  },
  th: {
    background: "#8a2be2",
    color: "#fff",
    padding: "8px",
    textAlign: "left",
  },
  td: {
    padding: "8px",
    borderBottom: "1px solid #ddd",
    verticalAlign: "top",
  },
};

export default function Visa({ onNavigate }) {
  // ⚡ Load / Edit Ref States
  const [searchRef, setSearchRef] = useState("");
  const [refNo, setRefNo] = useState("");

  // ⚡ Separated Customer States
  const [customerName, setCustomerName] = useState("");
  const [subCustomerName, setSubCustomerName] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [savedCustomers, setSavedCustomers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [bookingDate, setBookingDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [rows, setRows] = useState([]);
  const [pkrRate, setPkrRate] = useState(0);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const pdfRef = useRef(null);
  const dropdownRef = useRef(null);

  const { exportPDF, printPDF } = usePdf(pdfRef, {
    filePrefix: "Visa",
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

  // Click-outside listener for dropdown closing
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-resize textarea height dynamically
  const handleAutoResize = (e) => {
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // -------------------- Row Management --------------------
  const addRow = () => setRows([...rows, { type: "", persons: 0, rate: 0, total: 0 }]);
  const removeRow = (i) => setRows(rows.filter((_, x) => x !== i));

  const updateRow = (i, field, value) => {
    const copy = [...rows];
    copy[i][field] = value;
    const persons = Number(copy[i].persons) || 0;
    const rate = Number(copy[i].rate) || 0;
    copy[i].total = persons * rate; // total SAR
    setRows(copy);
  };

  // -------------------- Load Existing Visa --------------------
  const loadVisa = async () => {
    if (!searchRef) {
      return Swal.fire({
        width: "280px",
        icon: "warning",
        text: "Ref No likho"
      });
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/visa/get/${searchRef}`);
      const data = await res.json();

      if (!data.success) {
        return Swal.fire({
          width: "280px",
          icon: "error",
          text: "Record not found"
        });
      }

      // 🔹 Purchase check
      const purchaseRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/purchase/check/${data.row.ref_no}`);
      const purchaseData = await purchaseRes.json();

      if (purchaseData.total > 0) {
        return Swal.fire({
          width: "300px",
          icon: "error",
          text: "❌ Cannot edit. Purchase entries exist. Delete purchases first."
        });
      }

      const d = data.row;

      // 🔹 Load data
      setRefNo(d.ref_no);
      setCustomerName(d.customer_name || "");
      setSubCustomerName(d.sub_customer_name || "");
      setCustomerCode(d.customer_code || "");

      // Sync UI search query with customer code
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
        width: "260px",
        icon: "success",
        text: "Visa Edit Mode Loaded"
      });

    } catch (err) {
      Swal.fire({
        width: "300px",
        icon: "error",
        text: "Load failed"
      });
    }
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
      text: "Do you want to save this Visa?",
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
      sub_customer_name: subCustomerName || null,
      booking_date: bookingDate,
      rows,
      pkr_rate: pkrRate,
    };

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/visa/save`,
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
              ${subCustomerName ? `<b>Sub Customer:</b> ${subCustomerName}` : ''}
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

  // -------------------- Calculated Totals --------------------
  const totalSAR = rows.reduce((s, r) => s + Number(r.total || 0), 0);
  const totalPKR = totalSAR * (Number(pkrRate) || 0);

  // Filter dropdown options based on search query
  const filteredCustomers = savedCustomers.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.customer_code && c.customer_code.toLowerCase().includes(q))
    );
  });

  return (
    <div style={styles.container}>
      {/* ⚡ PRINT / PDF STYLING CONTROL */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          input, textarea {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* ⚡ TOP CONTROL BAR */}
      <div className="d-flex justify-content-between mb-3 no-print">
        <button className="btn btn-dark btn-sm" onClick={() => onNavigate("dashboard")}>← Back</button>
        <div className="d-flex gap-2">
          <button
            className={`btn btn-sm ${isEdit ? "btn-warning text-dark" : "btn-primary"}`}
            onClick={saveData}
            disabled={saving}
          >
            {saving ? "Saving..." : isEdit ? "✏ Update Save" : "💾 Save"}
          </button>
          
          <input 
            className="form-control form-control-sm" 
            style={{ width: 140, borderRadius: 50 }} 
            placeholder="Search Ref" 
            value={searchRef} 
            onChange={(e) => setSearchRef(e.target.value)} 
          />
          <button className="btn btn-warning btn-sm" onClick={loadVisa}>🔄 Load / Edit</button>
          
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
        <Header title="🛂 VISA QUOTATION" />

        {/* ⚡ CUSTOMER INFO ROW WITH SMART SEPARATION */}
        <div className="row g-3 mb-4">
          <div className="col-md-2">
            <label className="fw-bold mb-1 d-block">Ref No</label>
            <input
              className="form-control form-control-sm"
              value={refNo}
              readOnly
            />
          </div>

          <div className="col-md-3" ref={dropdownRef} style={{ position: "relative" }}>
            <label className="fw-bold mb-1 text-primary">🔍 Select Registered Customer</label>
            <div className="input-group input-group-sm no-print">
              <input
                className="form-control"
                placeholder="Type code or name..."
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
                    setSubCustomerName("");
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="print-only fw-bold p-1">
              {searchQuery || "N/A"}
            </div>

            {showDropdown && (
              <div 
                className="dropdown-menu show shadow w-100 p-2 no-print" 
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
            <small className="text-muted d-block mt-1 no-print">Use ONLY for registered profiles</small>
          </div>

          <div className="col-md-2.5" style={{ flex: "1" }}>
            <label className="fw-bold mb-1 text-dark">👤 Customer Name</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Customer name..."
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
              <small className="text-success d-block mt-1 fw-bold no-print">
                ✓ Registered Linked ({customerCode})
              </small>
            ) : (
              customerName && (
                <small className="text-warning d-block mt-1 fw-bold no-print">
                  ⚠ Manual Walk-In (No Code)
                </small>
              )
            )}
          </div>

  {/* FIELD 4: SUB / END CUSTOMER NAME (2 cols) */}
  <div className="col-md-2">
    <label className="fw-bold mb-1 text-dark">👥 Sub Customer</label>
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
            <label className="fw-bold mb-1 d-block">Booking Date</label>
            <input
              type="date"
              className="form-control form-control-sm no-print"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
            />
            <div className="fw-bold mt-1">
              {showDate(bookingDate)}
            </div>
          </div>
        </div>

        <h5 style={styles.sectionHeader}>🛂 Visa Details</h5>
        <button className="btn btn-outline-primary btn-sm mb-2 no-print" onClick={addRow}>➕ Add Visa Row</button>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Type</th>
              <th style={{ ...styles.th, width: "110px" }}>Persons</th>
              <th style={{ ...styles.th, width: "130px" }}>Rate (SAR)</th>
              <th style={{ ...styles.th, width: "130px" }}>Total (SAR)</th>
              <th style={{ ...styles.th, width: "80px", textAlign: "center" }} className="no-print">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#f0e6ff" : "#fff" }}>
                <td style={styles.td}>
                  <textarea
                    className="form-control form-control-sm no-print"
                    rows={1}
                    value={r.type}
                    placeholder="Enter details..."
                    style={{
                      resize: "none",
                      overflow: "hidden",
                      minHeight: "35px",
                      width: "100%",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all"
                    }}
                    onFocus={handleAutoResize}
                    onInput={handleAutoResize}
                    onChange={(e) => updateRow(i, "type", e.target.value)}
                  />
                  
                  <div 
                    className="print-only" 
                    style={{ 
                      whiteSpace: "pre-wrap", 
                      wordBreak: "break-all",
                      padding: "4px 0",
                      fontSize: "13px",
                      lineHeight: "1.4"
                    }}
                  >
                    {r.type}
                  </div>
                </td>

                <td style={styles.td}>
                  <input
                    type="number"
                    className="form-control form-control-sm no-print"
                    style={{ width: "90px" }}
                    value={r.persons}
                    onChange={(e) => updateRow(i, "persons", e.target.value)}
                  />
                  <div className="print-only fw-bold">{r.persons}</div>
                </td>

                <td style={styles.td}>
                  <input
                    type="number"
                    className="form-control form-control-sm no-print"
                    style={{ width: "110px" }}
                    value={r.rate}
                    onChange={(e) => updateRow(i, "rate", e.target.value)}
                  />
                  <div className="print-only fw-bold">{r.rate}</div>
                </td>

                <td style={{ ...styles.td, fontWeight: "bold" }}>{r.total}</td>
                <td style={{ ...styles.td, textAlign: "center" }} className="no-print">
                  <button className="btn btn-sm btn-danger" onClick={() => removeRow(i)}>✖</button>
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
              <td>
                <input 
                  className="form-control form-control-sm no-print" 
                  type="number" 
                  value={pkrRate} 
                  onChange={(e) => setPkrRate(+e.target.value)} 
                />
                <span className="print-only fw-bold">{pkrRate}</span>
              </td>
              <td style={{ fontWeight: "bold" }}>{totalPKR.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}