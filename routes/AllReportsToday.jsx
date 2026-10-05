import React, { useEffect, useState, useMemo } from "react";
import Swal from "sweetalert2";

/* ================= CLICK COPY HANDLER ================= */
const handleCopyRef = (refNo) => {
  if (!refNo || refNo === "-") return;

  navigator.clipboard.writeText(refNo).then(() => {
    // SweetAlert2 Toast alert
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

export default function AllReportsToday({ onNavigate }) {
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [custTypeFilter, setCustTypeFilter] = useState("");
  const [currentAuthorityDays, setCurrentAuthorityDays] = useState("-");

  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  /* ================= LOAD DATA & SYSTEM ACCESS ================= */
  const loadData = async () => {
    try {
      setLoading(true);
      
      const setRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/reports/authority/get-days`);
      if (setRes.ok) {
        const setData = await setRes.json();
        if(setData.success) {
          setCurrentAuthorityDays(setData.days);
        }
      }

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/reports/today-restricted`);
      if (!res.ok) throw new Error("Data route missing");
      const data = await res.json();
      
      setRows(data || []);
      setFiltered(data || []);
    } catch (err) {
      console.error("Fetch error details:", err);
      Swal.fire("Server Error", "Could not synchronize secure data block", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* ================= DATE PRESETS ================= */
  const setToday = () => {
    const t = new Date().toISOString().slice(0, 10);
    setFromDate(t);
    setToDate(t);
  };

  const setWeek = () => {
    const now = new Date();
    const first = new Date(now.setDate(now.getDate() - now.getDay()));
    const last = new Date(first);
    last.setDate(first.getDate() + 6);
    setFromDate(first.toISOString().slice(0, 10));
    setToDate(last.toISOString().slice(0, 10));
  };

  const setMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setFromDate(first.toISOString().slice(0, 10));
    setToDate(last.toISOString().slice(0, 10));
  };

  const resetFilters = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setTypeFilter("");
    setCustTypeFilter("");
  };

  /* ================= PASSWORD PROMPT ================= */
  const askPassword = async (type, ref_no, customer_name, total_pkr) => {
    const { value: password } = await Swal.fire({
      width: "380px",
      padding: "1.25em",
      customClass: { popup: "rounded-4 border-0 shadow-lg" },
      html: `
        <div style="text-align:left; font-size:13px; line-height:1.6; color: #1e293b;">
          <div style="margin-bottom:12px; font-size:16px; font-weight:700; color:#e11d48; display:flex; align-items:center; gap:8px;">
            <span>🗑️</span> Confirm Deletion
          </div>
          <div style="background:#f8fafc; padding:12px; border-radius:12px; border:1px solid #e2e8f0; margin-bottom:12px;">
            <div><b>Type:</b> ${type}</div>
            <div><b>Ref:</b> <span style="color:#2563eb; font-weight:600;">${ref_no}</span></div>
            <div><b>Customer:</b> ${customer_name || "-"}</div>
            <div><b>Amount:</b> <span style="color:#059669; font-weight:700;">PKR ${total_pkr}</span></div>
          </div>
          <div style="position:relative;">
            <input id="swal-pass" type="password" class="swal2-input" 
              style="height:38px; font-size:13px; width:100%; box-sizing:border-box; padding-right:40px; margin:0; border-radius:8px;" 
              placeholder="Enter Admin Password"/>
            <span id="toggle-pass" style="
              position:absolute; right:12px; top:50%; transform:translateY(-50%);
              cursor:pointer; font-size:14px; user-select:none; color:#64748b;
            ">👁</span>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Delete Record",
      confirmButtonColor: "#e11d48",
      focusConfirm: false,
      preConfirm: () => {
        const val = document.getElementById("swal-pass").value;
        if (!val || val.trim() === "") {
          Swal.showValidationMessage("Password required");
          return false;
        }
        return val.trim();
      },
      didOpen: () => {
        const input = document.getElementById("swal-pass");
        const toggle = document.getElementById("toggle-pass");
        let show = false;
        toggle.addEventListener("click", () => {
          show = !show;
          input.type = show ? "text" : "password";
          toggle.textContent = show ? "🙈" : "👁";
        });
      }
    });
    return password;
  };

  /* ================= LOADER ================= */
  const showLoader = (text = "Processing...") => {
    Swal.fire({
      width: "280px",
      title: text,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
  };

  /* ================= DELETE ================= */
  const handleDelete = async (type, ref_no, customer_name, total_pkr) => {
    const password = await askPassword(type, ref_no, customer_name, total_pkr);
    if (!password) return;

    const map = {
      Packages: "bookings",
      Hotels: "hotels",
      Ticketing: "ticketing",
      Transport: "transport",
      Ziyarat: "ziyarat",
      Visa: "visa",
      Card: "card",
      Groups: "groups",
    };

    const endpoint = map[type];
    showLoader("Deleting...");

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/${endpoint}/delete/${ref_no}`,
        { 
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password })
        }
      );
      const data = await res.json();
      Swal.close();

      if (!data.success) {
        return Swal.fire("Error", data.message || data.error || "Delete failed", "error");
      }

      Swal.fire({
        icon: "success",
        title: "Deleted Successfully",
        text: `REF NO: ${ref_no}`,
        timer: 1500,
        showConfirmButton: false,
      });
      loadData();
    } catch (err) {
      Swal.close();
      Swal.fire("Error", "Server error on delete", "error");
    }
  };

  /* ================= NAVIGATION VIEWS ================= */
  const handleView = (type, ref_no) => {
    const map = {
      Packages: "packages_view",
      Hotels: "hotels_view",
      Ticketing: "ticket_view",
      Transport: "transport_view",
      Ziyarat: "ziyarat_view",
      Visa: "visa_view",
      Card: "card_view",
      Groups: "groups_view",
    };
    onNavigate(map[type], ref_no);
  };


  /* ================= FILTERS EFFECT ================= */
  useEffect(() => {
    let temp = [...rows];
    
    if (search) {
      const query = search.toLowerCase();
      temp = temp.filter(
        (r) =>
          (r.ref_no || "").toLowerCase().includes(query) ||
          (r.customer_name || "").toLowerCase().includes(query) ||
          (r.customer_code || "").toLowerCase().includes(query)
      );
    }
    
    if (fromDate)
      temp = temp.filter((r) => new Date(r.booking_date) >= new Date(fromDate));
    if (toDate)
      temp = temp.filter((r) => new Date(r.booking_date) <= new Date(toDate));
    if (typeFilter)
      temp = temp.filter((r) => r.type === typeFilter);

    if (custTypeFilter) {
      temp = temp.filter((r) => {
        if (custTypeFilter === "Registered") {
          return r.customer_code && r.customer_code.trim() !== "";
        }
        if (custTypeFilter === "Walk-in") {
          return !r.customer_code || r.customer_code.trim() === "";
        }
        return true;
      });
    }

    setFiltered(temp);
    setCurrentPage(1);
  }, [search, fromDate, toDate, typeFilter, custTypeFilter, rows]);

  /* ================= PAGINATION LOGIC ================= */
  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentRows = filtered.slice(indexOfFirst, indexOfLast);

  const getPagination = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }
    for (let i of range) {
      if (l) {
        if (i - l === 2) rangeWithDots.push(l + 1);
        else if (i - l > 2) rangeWithDots.push("…");
      }
      rangeWithDots.push(i);
      l = i;
    }
    return rangeWithDots;
  };

  /* ================= MATHS SUMMATION ================= */
  const totalPKR = useMemo(() => {
    return filtered.reduce((sum, r) => sum + Number(r.total_pkr || 0), 0);
  }, [filtered]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const fmtPKR = (v) => Number(v || 0).toLocaleString("en-PK");

  const typeIcon = (type) => {
    const map = { Packages: "📦", Hotels: "🏨", Ticketing: "✈️", Transport: "🚐", Ziyarat: "🕌", Visa: "🛂", Card: "💳", Groups: "👥" };
    return map[type] || "📄";
  };

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }} className="p-3 p-lg-4">
      
      {/* 🚀 BANNER HEADER */}
      <div 
        className="card border-0 shadow-sm mb-4" 
        style={{ 
          background: "linear-gradient(135deg, #e11d48 0%, #9f1239 100%)", 
          borderRadius: "16px",
          color: "#ffffff" 
        }}
      >
        <div className="card-body p-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <div className="d-flex align-items-center gap-2">
              <span className="p-2 rounded-3" style={{ background: "rgba(255, 255, 255, 0.2)" }}>🕒</span>
              <h3 className="fw-bold mb-0">All Reports Today</h3>
            </div>
            <p className="text-white-50 small mb-0 mt-1">
              Restricted View: Locked to Last <strong className="text-warning">{currentAuthorityDays} Days</strong> by Manager
            </p>
          </div>

          <button 
            className="btn btn-outline-light btn-sm rounded-pill px-3 py-2"
            onClick={() => onNavigate("dashboard")}
          >
            ← Back
          </button>
        </div>
      </div>

      {/* 💳 SUMMARY STATS CARDS */}
      <div className="row g-3 mb-4">
        <div className="col-md-6 col-lg-4">
          <div className="card border-0 shadow-sm p-3 rounded-4" style={{ background: "#ffffff" }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small fw-semibold">TOTAL REVENUE</div>
                <div className="h4 fw-bold text-success mb-0">PKR {fmtPKR(totalPKR)}</div>
              </div>
              <div className="bg-success-subtle p-3 rounded-circle text-success fw-bold fs-4">💰</div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-lg-4">
          <div className="card border-0 shadow-sm p-3 rounded-4" style={{ background: "#ffffff" }}>
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <div className="text-muted small fw-semibold">FILTERED RECORDS</div>
                <div className="h4 fw-bold text-primary mb-0">{filtered.length} Bookings</div>
              </div>
              <div className="bg-primary-subtle p-3 rounded-circle text-primary fw-bold fs-4">📋</div>
            </div>
          </div>
        </div>
      </div>

      {/* 🎛️ SEARCH & FILTERS CARD */}
      <div className="card border-0 shadow-sm mb-4 rounded-4 p-3" style={{ background: "#ffffff" }}>
        <div className="row g-2 mb-3">
          <div className="col-lg-3 col-md-6">
            <input
              type="text"
              className="form-control border-light-subtle bg-light shadow-none"
              style={{ fontSize: "13px", padding: "10px 14px", borderRadius: "10px" }}
              placeholder="🔍 Search Ref / Customer / Code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-lg-2 col-md-3">
            <input
              type="date"
              className="form-control border-light-subtle bg-light shadow-none"
              style={{ fontSize: "13px", padding: "10px 14px", borderRadius: "10px" }}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="col-lg-2 col-md-3">
            <input
              type="date"
              className="form-control border-light-subtle bg-light shadow-none"
              style={{ fontSize: "13px", padding: "10px 14px", borderRadius: "10px" }}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="col-lg-2 col-md-6">
            <select
              className="form-select border-light-subtle bg-light shadow-none"
              style={{ fontSize: "13px", padding: "10px 14px", borderRadius: "10px" }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Services</option>
              <option>Packages</option>
              <option>Hotels</option>
              <option>Ticketing</option>
              <option>Transport</option>
              <option>Ziyarat</option>
              <option>Visa</option>
              <option>Card</option>
              <option>Groups</option>
            </select>
          </div>
          <div className="col-lg-3 col-md-6">
            <select
              className="form-select border-light-subtle bg-light shadow-none"
              style={{ fontSize: "13px", padding: "10px 14px", borderRadius: "10px" }}
              value={custTypeFilter}
              onChange={(e) => setCustTypeFilter(e.target.value)}
            >
              <option value="">All Customer Types</option>
              <option value="Registered">👤 Registered Customers</option>
              <option value="Walk-in">🚶 Walk-in Customers</option>
            </select>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-light border fw-semibold rounded-pill px-3" style={{ fontSize: "12px" }} onClick={setToday}>📅 Today</button>
            <button className="btn btn-sm btn-light border fw-semibold rounded-pill px-3" style={{ fontSize: "12px" }} onClick={setWeek}>📆 This Week</button>
            <button className="btn btn-sm btn-light border fw-semibold rounded-pill px-3" style={{ fontSize: "12px" }} onClick={setMonth}>🗓️ This Month</button>
          </div>
          <button className="btn btn-sm btn-link text-danger text-decoration-none fw-semibold" style={{ fontSize: "12px" }} onClick={resetFilters}>
            ♻️ Reset Filters
          </button>
        </div>
      </div>

      {/* 📊 ELEGANT TABLE CONTAINER */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden" style={{ background: "#ffffff" }}>
        <div className="table-responsive">
          <table className="table align-middle mb-0" style={{ fontSize: "13px" }}>
            <thead className="table-light text-secondary">
              <tr>
                <th className="py-3 px-3 text-center" style={{ width: "50px" }}>SR#</th>
                <th className="py-3">Type</th>
                <th className="py-3">Ref No</th>
                <th className="py-3">Customer Name</th>
                <th className="py-3 text-center">Code / Status</th>
                <th className="py-3 text-center">Booking Date</th>
                <th className="py-3 text-end px-3">Total Amount</th>
                <th className="py-3 text-center" style={{ width: "220px" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm text-danger me-2" role="status"></div>
                    Loading secure channel...
                  </td>
                </tr>
              )}

              {!loading && currentRows.map((r, i) => {
                const isRegistered = r.customer_code && r.customer_code.trim() !== "";
                return (
                  <tr key={i} className="align-middle">
                    <td className="text-center text-muted fw-bold">{i + 1 + indexOfFirst}</td>
                    <td>
                      <span className="badge bg-light text-dark border px-2 py-1 rounded-3">
                        {typeIcon(r.type)} {r.type}
                      </span>
                    </td>
                    <td
  className="fw-bold text-primary"
  style={{ cursor: "pointer" }}
  title="Click to copy Ref No"
  onClick={() => handleCopyRef(r.ref_no)}
>
  {r.ref_no}
</td>
                    
                    {/* CUSTOMER NAME COLORS: Walk-in = BLUE (#2563eb), Registered = GREEN (#16a34a) */}
                    <td className="fw-bold">
                      <span style={{ color: isRegistered ? "#16a34a" : "#2563eb" }}>
                        {r.customer_name || "-"}
                      </span>
                    </td>

                    {/* CODE / STATUS COLUMN */}
                    <td className="text-center">
                      {isRegistered ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-pill">
                          👤 {r.customer_code}
                        </span>
                      ) : (
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 rounded-pill">
                          🚶 Walk-in
                        </span>
                      )}
                    </td>

                    <td className="text-center text-muted">{formatDate(r.booking_date)}</td>
                    <td className="text-end fw-bold text-success px-3">PKR {fmtPKR(r.total_pkr)}</td>

{/* STRICT COLUMN-BASED ALIGNMENT (GRID LAYOUT) */}
<td className="text-center">
  <div 
    style={{ 
      display: "grid", 
      gridTemplateColumns: "60px 65px", 
      gap: "4px", 
      justifyContent: "center", 
      alignItems: "center" 
    }}
  >
    {/* COLUMN 1: View Button */}
    <button
      className="btn btn-sm btn-outline-primary rounded-pill px-1 py-1 fw-semibold w-100"
      style={{ fontSize: "11px", whiteSpace: "nowrap" }}
      onClick={() => handleView(r.type, r.ref_no)}
    >
      👁️ View
    </button>

    {/* COLUMN 2: Delete Button */}
    <button
      className="btn btn-sm btn-outline-danger rounded-pill px-1 py-1 fw-semibold w-100"
      style={{ fontSize: "11px", whiteSpace: "nowrap" }}
      onClick={() => handleDelete(r.type, r.ref_no, r.customer_name, r.total_pkr)}
    >
      🗑️ Delete
    </button>
  </div>
</td>
                  </tr>
                );
              })}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted">
                    No Authorized Records Found For Current Cycle
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📑 FOOTER PAGINATION */}
      <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2 text-muted" style={{ fontSize: "13px" }}>
        <div className="d-flex align-items-center gap-2">
          <span>Displaying</span>
          <select
            className="form-select form-select-sm border-0 shadow-sm bg-white"
            style={{ width: "80px", borderRadius: "8px" }}
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={75}>75</option>
            <option value={100}>100</option>
            <option value={1000000}>All</option>
          </select>
          <span>rows</span>
        </div>

        <div className="d-flex align-items-center gap-1">
          <button
            className="btn btn-sm btn-white border shadow-sm rounded-pill px-3"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Prev
          </button>

          {getPagination().map((p, idx) => (
            <button
              key={idx}
              className={`btn btn-sm rounded-pill px-3 ${
                p === currentPage ? "btn-danger shadow-sm" : "btn-white border shadow-sm"
              }`}
              disabled={p === "…"}
              onClick={() => typeof p === "number" && setCurrentPage(p)}
            >
              {p}
            </button>
          ))}

          <button
            className="btn btn-sm btn-white border shadow-sm rounded-pill px-3"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}