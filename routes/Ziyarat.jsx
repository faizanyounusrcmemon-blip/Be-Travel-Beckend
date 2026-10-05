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

// VIP Ziyarat CSS Inline Styles (Green Theme)
const styles = {
  container: {
    minHeight: "100vh",
    padding: "20px",
    background: "linear-gradient(to right, #e0f7fa, #fff9f0)",
    fontFamily: "'Cairo', sans-serif",
  },
  card: {
    maxWidth: 1000,
    margin: "0 auto",
    background: "linear-gradient(to bottom, #ffffff, #fffef5)",
    borderRadius: 20,
    padding: 30,
    boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
    border: "2px solid #ffd700",
  },
  sectionHeader: {
    background: "linear-gradient(to right, #006400, #32cd32)",
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
    background: "#32cd32",
    color: "#fff",
    padding: "8px",
    textAlign: "left",
  },
  td: {
    padding: "8px",
    borderBottom: "1px solid #ddd",
  },

  summaryInput: {
    fontWeight: "bold",
    fontSize: "1.1rem",
    background: "#fff8dc",
    border: "1px solid #ffd700",
  },
};

export default function Ziyarat({ onNavigate }) {
  // ⚡ Load / Edit Ref States
  const [searchRef, setSearchRef] = useState("");
  const [refNo, setRefNo] = useState("");

  // ⚡ Customer & Sub Customer States
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

  const quoteRef = useRef(null);
  const dropdownRef = useRef(null);

  const { exportPDF, printPDF } = usePdf(quoteRef, {
    filePrefix: "Ziyarat",
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

  // Click-outside dropdown close hook
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addRow = () => setRows([...rows, { description: "", sar: 0 }]);
  const updateRow = (i, field, value) => {
    const copy = [...rows];
    copy[i][field] = field === "description" ? value : Number(value) || 0;
    setRows(copy);
  };
  const removeRow = (i) => setRows(rows.filter((_, x) => x !== i));

  const totalSar = rows.reduce((s, r) => s + (Number(r.sar) || 0), 0);
  const totalPkr = totalSar * pkrRate;

  // Filter dropdown data
  const filteredCustomers = savedCustomers.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.customer_code && c.customer_code.toLowerCase().includes(q))
    );
  });

  const loadZiyarat = async () => {
    if (!searchRef) {
      return Swal.fire({
        width: "280px",
        icon: "warning",
        text: "Ref No likho"
      });
    }

    try {
      // 1️⃣ Fetch Ziyarat
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/ziyarat/get/${searchRef}`);
      const data = await res.json();

      if (!data.success) {
        return Swal.fire({
          width: "280px",
          icon: "error",
          text: "Record not found"
        });
      }

      const d = data.row;

      // 2️⃣ Purchase Check
      const purchaseRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/purchase/check/${d.ref_no}`);
      const purchaseData = await purchaseRes.json();

      if (purchaseData.total > 0) {
        return Swal.fire({
          width: "300px",
          icon: "error",
          text: "❌ Cannot edit. Purchase entries exist.\nDelete purchases first."
        });
      }

      // 3️⃣ Load Data
      setRefNo(d.ref_no);
      setCustomerName(d.customer_name || "");
      setSubCustomerName(d.sub_customer_name || "");
      setCustomerCode(d.customer_code || "");

      // Sync customer select UI on edit load
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
        text: "Ziyarat Edit Mode Loaded"
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
      text: "Do you want to save this Ziyarat?",
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
      total_sar: totalSar,
      pkr_rate: pkrRate,
      total_pkr: totalPkr,
    };

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/ziyarat/save`,
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
              ${subCustomerName ? `<b>Passenger/Sub:</b> ${subCustomerName}` : ""}
            </div>
          `
        });
        onNavigate("dashboard");
      } else {
        if (data.error?.includes("Purchase entries exist")) {
          Swal.fire({
            width: "300px",
            icon: "error",
            text: "❌ Edit blocked! Purchase entries already exist."
          });
        } else {
          Swal.fire({
            width: "300px",
            icon: "error",
            text: data.error || "Save failed"
          });
        }
      }

    } catch (err) {
      Swal.close();
      Swal.fire({
        width: "300px",
        icon: "error",
        text: "❌ Something went wrong while saving."
      });
    }

    setSaving(false);
  };

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
          <button className="btn btn-warning btn-sm" style={styles.button} onClick={loadZiyarat}>🔄 Load / Edit</button>
          
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

      {/* Ziyarat Card */}
      <div ref={quoteRef} style={styles.card}>
        <Header title="ZIYARAT QUOTATION" />

        {/* ⚡ CUSTOMER INFO WITH SMART SEPARATION & SUB-CUSTOMER INPUT */}
        <div className="row g-3 mb-4">
          
          {/* FIELD 1: Ref No Display */}
          <div className="col-md-2">
            <label className="fw-bold mb-1 d-block text-success">Ref No</label>
            <input
              className="form-control form-control-sm"
              value={refNo}
              readOnly
            />
          </div>

          {/* FIELD 2: SMART DROPDOWN FOR REGISTERED CLIENTS */}
          <div className="col-md-3" ref={dropdownRef} style={{ position: "relative" }}>
            <label className="fw-bold mb-1 text-primary">🔍 Select Registered Customer</label>
            <div className="input-group input-group-sm">
              <input
                className="form-control"
                placeholder="Type code or name to search..."
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

            {/* Selector Dropdown List */}
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
                      <span className="badge bg-success text-white">{c.customer_code}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* FIELD 3: CUSTOMER NAME INPUT */}
          <div className="col-md-3">
            <label className="fw-bold mb-1 text-dark">👤 Customer Name</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Enter customer name..."
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (customerCode) {
                  setCustomerCode("");
                  setSearchQuery("");
                }
              }}
            />
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

          {/* FIELD 5: BOOKING DATE */}
          <div className="col-md-2">
            <label className="fw-bold mb-1 d-block text-success">Booking Date</label>
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

        {/* Ziyarat Table */}
        <div className="mb-3">
          <h5 style={styles.sectionHeader}>🕌 Ziyarat</h5>
          <button className="btn btn-outline-success btn-sm mb-2" style={styles.button} onClick={addRow}>➕ Add Row</button>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: "70%" }}>Description</th>
                <th style={{ ...styles.th, width: "20%", textAlign: "center" }}>SAR</th>
                <th style={{ ...styles.th, width: "10%", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#f0fff0" : "#fff" }}>
                  <td style={styles.td}>
                    <input 
                      type="text" 
                      className="form-control form-control-sm" 
                      placeholder="Ziyarat description..." 
                      value={r.description} 
                      onChange={(e) => updateRow(i, "description", e.target.value)} 
                    />
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <input 
                      type="number" 
                      className="form-control form-control-sm text-center fw-bold" 
                      style={{ maxWidth: "120px", margin: "0 auto" }} 
                      value={r.sar} 
                      onChange={(e) => updateRow(i, "sar", e.target.value)} 
                    />
                  </td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <button className="btn btn-sm btn-danger px-2 py-0" onClick={() => removeRow(i)}>✖</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mb-3">
          <h5 style={styles.sectionHeader}>✨ Summary</h5>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold">Total SAR</label>
              <input className="form-control" value={totalSar} readOnly style={styles.summaryInput} />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">PKR Rate</label>
              <input type="number" className="form-control" value={pkrRate} onChange={(e) => setPkrRate(Number(e.target.value) || 0)} style={styles.summaryInput} />
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold">Total PKR</label>
              <input className="form-control text-success" value={totalPkr.toLocaleString()} readOnly style={{ ...styles.summaryInput, fontWeight: "bold", fontSize: "1.2rem" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}