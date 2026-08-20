const express = require("express");
const router = express.Router();
const db = require("../db");

/* =========================================
   BALANCE SHEET (WITH CASH & BANKS)
========================================= */
router.get("/", async (req, res) => {
  try {
    let snapshotId = null;
    let snapshotDate = null;

    const snapshot = await db.query(`
      SELECT id, date_to FROM archive_snapshots ORDER BY id DESC LIMIT 1
    `);

    if (snapshot.rows.length) {
      snapshotId = snapshot.rows[0].id;
      snapshotDate = snapshot.rows[0].date_to;
    }

    /* ========== 1. REGISTERED CUSTOMER CODES ========== */
    const regCustomerCodesRes = await db.query(`
      SELECT DISTINCT customer_code FROM bookings WHERE customer_code IS NOT NULL AND customer_code != '' AND is_deleted=false
      UNION SELECT customer_code FROM hotels WHERE customer_code IS NOT NULL AND customer_code != '' AND is_deleted=false
      UNION SELECT customer_code FROM visa WHERE customer_code IS NOT NULL AND customer_code != '' AND is_deleted=false
      UNION SELECT customer_code FROM card WHERE customer_code IS NOT NULL AND customer_code != '' AND is_deleted=false
      UNION SELECT customer_code FROM groups WHERE customer_code IS NOT NULL AND customer_code != '' AND is_deleted=false
      UNION SELECT customer_code FROM ticketing WHERE customer_code IS NOT NULL AND customer_code != '' AND is_deleted=false
      UNION SELECT customer_code FROM transport WHERE customer_code IS NOT NULL AND customer_code != '' AND is_deleted=false
      UNION SELECT customer_code FROM ziyarat WHERE customer_code IS NOT NULL AND customer_code != '' AND is_deleted=false
      UNION SELECT ref_no AS customer_code FROM customer_payments WHERE ref_no LIKE 'CUST-%' AND is_deleted=false
      UNION SELECT code AS customer_code FROM archive_balances WHERE snapshot_id = $1 AND UPPER(balance_type) = 'CUSTOMER' AND code LIKE 'CUST-%'
    `, [snapshotId]);

    const regCodes = regCustomerCodesRes.rows.map(row => row.customer_code).filter(Boolean);

    /* ========== 2. ARCHIVE SNAPSHOT BALANCES ========== */
    const customerSnapshotRes = await db.query(`
      SELECT code, name, balance FROM archive_balances WHERE snapshot_id = $1 AND UPPER(balance_type) = 'CUSTOMER'
    `, [snapshotId]);
    const customerSnapshot = customerSnapshotRes.rows;

    const supplierSnapshotRes = await db.query(`
      SELECT code, balance FROM archive_balances WHERE snapshot_id = $1 AND UPPER(balance_type) = 'SUPPLIER'
    `, [snapshotId]);
    const supplierSnapshot = supplierSnapshotRes.rows;

    /* ========== 3. STANDARD MODULE CUSTOMERS ========== */
    const customersData = await db.query(`
      SELECT * FROM (
        SELECT ref_no, customer_name, payment_status, total_pkr FROM bookings WHERE is_deleted = false AND ($1::date IS NULL OR created_at::date > $1) AND (customer_code IS NULL OR customer_code = '')
        UNION ALL SELECT ref_no, customer_name, payment_status, total_pkr FROM hotels WHERE is_deleted = false AND ($1::date IS NULL OR created_at::date > $1) AND (customer_code IS NULL OR customer_code = '')
        UNION ALL SELECT ref_no, customer_name, payment_status, total_pkr FROM visa WHERE is_deleted = false AND ($1::date IS NULL OR created_at::date > $1) AND (customer_code IS NULL OR customer_code = '')
        UNION ALL SELECT ref_no, customer_name, payment_status, total_pkr FROM card WHERE is_deleted = false AND ($1::date IS NULL OR created_at::date > $1) AND (customer_code IS NULL OR customer_code = '')
        UNION ALL SELECT ref_no, customer_name, payment_status, total_pkr FROM groups WHERE is_deleted = false AND ($1::date IS NULL OR created_at::date > $1) AND (customer_code IS NULL OR customer_code = '')
        UNION ALL SELECT ref_no, customer_name, payment_status, total_pkr FROM ticketing WHERE is_deleted = false AND ($1::date IS NULL OR created_at::date > $1) AND (customer_code IS NULL OR customer_code = '')
        UNION ALL SELECT ref_no, customer_name, payment_status, total_pkr FROM transport WHERE is_deleted = false AND ($1::date IS NULL OR created_at::date > $1) AND (customer_code IS NULL OR customer_code = '')
        UNION ALL SELECT ref_no, customer_name, payment_status, total_pkr FROM ziyarat WHERE is_deleted = false AND ($1::date IS NULL OR created_at::date > $1) AND (customer_code IS NULL OR customer_code = '')
      ) x
    `, [snapshotDate]);

    const payments = await db.query(`
      SELECT ref_no, COALESCE(SUM(amount),0) AS received
      FROM customer_payments
      WHERE ($1::date IS NULL OR payment_date::date > $1) AND LOWER(COALESCE(type, '')) NOT IN ('adjustment', 'opening_balance') AND is_deleted = false
      GROUP BY ref_no
    `, [snapshotDate]);

    const allStdRefNos = Array.from(new Set([
      ...customersData.rows.map(r => r.ref_no),
      ...customerSnapshot.filter(s => !s.code.startsWith("CUST-")).map(s => s.code)
    ]));

    let standardCustomerRows = allStdRefNos.map(refNo => {
      const salesRows = customersData.rows.filter(r => r.ref_no === refNo);
      const saleTotal = salesRows.reduce((acc, curr) => acc + Number(curr.total_pkr || 0), 0);
      const received = Number(payments.rows.find(p => p.ref_no === refNo)?.received || 0);

      const snapItem = customerSnapshot.find(x => x.code === refNo);
      const openingBalance = Number(snapItem?.balance || 0);
      const balance = openingBalance + saleTotal - received;

      const foundName = salesRows.find(r => r.customer_name && r.customer_name.trim() !== '')?.customer_name 
                      || snapItem?.name 
                      || "Walk-In Customer";

      let status = salesRows[0]?.payment_status || "PENDING";
      if (balance <= 0 && saleTotal + openingBalance > 0) status = balance === 0 ? "PAID" : "EXTRA PAID";

      return {
        ref_no: refNo,
        customer_name: foundName,
        sale_total: saleTotal + openingBalance,
        received,
        balance,
        status
      };
    }).filter(r => r.balance !== 0 || r.sale_total !== 0);

    /* ========== 4. REGISTERED CUSTOMERS BALANCES ========== */
    let registeredRows = [];
    if (regCodes.length > 0) {
      const regSalesAndPayments = await db.query(`
        WITH all_debits AS (
          SELECT customer_code, total_pkr AS amount FROM bookings WHERE customer_code = ANY($1) AND is_deleted=false AND ($2::date IS NULL OR created_at::date > $2)
          UNION ALL SELECT customer_code, total_pkr FROM hotels WHERE customer_code = ANY($1) AND is_deleted=false AND ($2::date IS NULL OR created_at::date > $2)
          UNION ALL SELECT customer_code, total_pkr FROM visa WHERE customer_code = ANY($1) AND is_deleted=false AND ($2::date IS NULL OR created_at::date > $2)
          UNION ALL SELECT customer_code, total_pkr FROM card WHERE customer_code = ANY($1) AND is_deleted=false AND ($2::date IS NULL OR created_at::date > $2)
          UNION ALL SELECT customer_code, total_pkr FROM groups WHERE customer_code = ANY($1) AND is_deleted=false AND ($2::date IS NULL OR created_at::date > $2)
          UNION ALL SELECT customer_code, total_pkr FROM ticketing WHERE customer_code = ANY($1) AND is_deleted=false AND ($2::date IS NULL OR created_at::date > $2)
          UNION ALL SELECT customer_code, total_pkr FROM transport WHERE customer_code = ANY($1) AND is_deleted=false AND ($2::date IS NULL OR created_at::date > $2)
          UNION ALL SELECT customer_code, total_pkr FROM ziyarat WHERE customer_code = ANY($1) AND is_deleted=false AND ($2::date IS NULL OR created_at::date > $2)
          UNION ALL SELECT ref_no AS customer_code, amount FROM customer_payments WHERE ref_no = ANY($1) AND LOWER(COALESCE(type, '')) = 'opening_balance' AND is_deleted=false AND ($2::date IS NULL OR payment_date::date > $2)
        ),
        all_credits AS (
          SELECT ref_no AS customer_code, amount FROM customer_payments WHERE ref_no = ANY($1) AND LOWER(COALESCE(type, '')) NOT IN ('adjustment', 'opening_balance') AND is_deleted=false AND ($2::date IS NULL OR payment_date::date > $2)
        ),
        customer_names AS (
          SELECT DISTINCT ON (customer_code) customer_code, customer_name
          FROM (
            SELECT customer_code, customer_name FROM bookings WHERE customer_code = ANY($1) AND customer_name IS NOT NULL AND customer_name != '' AND is_deleted=false
            UNION ALL SELECT customer_code, customer_name FROM hotels WHERE customer_code = ANY($1) AND customer_name IS NOT NULL AND customer_name != '' AND is_deleted=false
            UNION ALL SELECT customer_code, customer_name FROM visa WHERE customer_code = ANY($1) AND customer_name IS NOT NULL AND customer_name != '' AND is_deleted=false
            UNION ALL SELECT customer_code, customer_name FROM card WHERE customer_code = ANY($1) AND customer_name IS NOT NULL AND customer_name != '' AND is_deleted=false
            UNION ALL SELECT customer_code, customer_name FROM groups WHERE customer_code = ANY($1) AND customer_name IS NOT NULL AND customer_name != '' AND is_deleted=false
            UNION ALL SELECT customer_code, customer_name FROM ticketing WHERE customer_code = ANY($1) AND customer_name IS NOT NULL AND customer_name != '' AND is_deleted=false
            UNION ALL SELECT customer_code, customer_name FROM transport WHERE customer_code = ANY($1) AND customer_name IS NOT NULL AND customer_name != '' AND is_deleted=false
            UNION ALL SELECT customer_code, customer_name FROM ziyarat WHERE customer_code = ANY($1) AND customer_name IS NOT NULL AND customer_name != '' AND is_deleted=false
            UNION ALL SELECT customer_code, name AS customer_name FROM customers WHERE customer_code = ANY($1) AND name IS NOT NULL AND name != ''
            UNION ALL SELECT code AS customer_code, name AS customer_name FROM archive_balances WHERE code = ANY($1) AND name IS NOT NULL AND name != ''
          ) n
        )
        SELECT 
          a.customer_code,
          COALESCE(n.customer_name, 'Registered Client') AS name,
          COALESCE(d.total_debit, 0) AS sales,
          COALESCE(p.total_credit, 0) AS paid
        FROM (
          SELECT unnest($1::text[]) AS customer_code
        ) a
        LEFT JOIN (SELECT customer_code, SUM(amount) AS total_debit FROM all_debits GROUP BY customer_code) d ON a.customer_code = d.customer_code
        LEFT JOIN (SELECT customer_code, SUM(amount) AS total_credit FROM all_credits GROUP BY customer_code) p ON a.customer_code = p.customer_code
        LEFT JOIN customer_names n ON a.customer_code = n.customer_code
      `, [regCodes, snapshotDate]);

      registeredRows = regSalesAndPayments.rows.map(r => {
        const snapshotOB = Number(customerSnapshot.find(x => x.code === r.customer_code)?.balance || 0);
        const totalSales = Number(r.sales) + snapshotOB;
        const paid = Number(r.paid);
        const bal = totalSales - paid;

        let status = "PARTIAL";
        if (bal > 0) status = paid === 0 ? "PENDING" : "PARTIAL";
        else if (bal === 0) status = "PAID";
        else status = "EXTRA PAID";

        return {
          customer_code: r.customer_code,
          customer_name: r.name,
          sale_total: totalSales,
          received: paid,
          balance: bal,
          status: status
        };
      }).filter(r => r.balance !== 0 || r.sale_total !== 0);
    }

    /* ========== 5. SUPPLIERS SECTION ========== */
    const purchaseTotals = await db.query(`
      SELECT supplier_code, SUM(purchase_pkr) AS purchase_total FROM purchase_entries WHERE is_deleted = false AND ($1::date IS NULL OR created_at::date > $1) GROUP BY supplier_code
    `, [snapshotDate]);

    const paymentTotals = await db.query(`
      SELECT 
        s.supplier_code, 
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(sp.type, '')) = 'opening_balance' THEN sp.amount ELSE 0 END), 0) AS live_opening_balance,
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(sp.type, '')) NOT IN ('opening_balance', 'adjustment') THEN sp.amount ELSE 0 END), 0) AS paid 
      FROM suppliers s 
      LEFT JOIN supplier_payments sp ON sp.supplier_id = s.id AND ($1::date IS NULL OR sp.payment_date::date > $1) 
      WHERE s.is_deleted = false 
      GROUP BY s.supplier_code
    `, [snapshotDate]);

    const suppliersData = await db.query(`SELECT supplier_code, supplier_name FROM suppliers WHERE is_deleted = false`);

    const suppliers = suppliersData.rows.map(s => {
      const pData = paymentTotals.rows.find(p => p.supplier_code === s.supplier_code);
      const purchase = Number(purchaseTotals.rows.find(p => p.supplier_code === s.supplier_code)?.purchase_total || 0);
      const paid = Number(pData?.paid || 0);
      const liveOB = Number(pData?.live_opening_balance || 0);
      const snapshotOB = Number(supplierSnapshot.find(x => x.code === s.supplier_code)?.balance || 0);

      const totalPurchase = purchase + liveOB + snapshotOB;
      const balance = totalPurchase - paid;

      let status = "PENDING";
      if (balance < 0) status = "EXTRA PAID";
      else if (balance === 0) status = "PAID";
      else if (paid > 0) status = "PARTIAL";

      return { 
        supplier_code: s.supplier_code, 
        supplier_name: s.supplier_name, 
        purchase_total: totalPurchase, 
        paid, 
        balance, 
        status 
      };
    }).filter(s => s.balance !== 0 || s.purchase_total !== 0).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    /* ========== 6. CASH IN HAND CALCULATION ========== */
    const cashSnapRes = await db.query(`SELECT opening_cash FROM archive_snapshots WHERE id=$1`, [snapshotId]);
    let cashBalance = Number(cashSnapRes.rows[0]?.opening_cash || 0);

    const cashTxns = await db.query(`
      SELECT COALESCE(SUM(credit - debit), 0) AS net_cash
      FROM (
        /* Customer Cash Payments */
        SELECT amount AS credit, 0 AS debit 
        FROM customer_payments 
        WHERE LOWER(COALESCE(payment_method, '')) = 'cash' 
          AND LOWER(COALESCE(type, '')) NOT IN ('adjustment', 'opening_balance') 
          AND is_deleted = false 
          AND ($1::date IS NULL OR payment_date::date > $1)

        UNION ALL

        /* Supplier Cash Payments */
        SELECT 0 AS credit, amount AS debit 
        FROM supplier_payments 
        WHERE LOWER(COALESCE(payment_method, '')) = 'cash' 
          AND LOWER(COALESCE(type, '')) NOT IN ('adjustment', 'opening_balance') 
          AND ($1::date IS NULL OR payment_date::date > $1)

        UNION ALL

        /* Expense Cash Payments */
        SELECT 0 AS credit, amount AS debit 
        FROM expense_ledger 
        WHERE LOWER(COALESCE(payment_method, '')) = 'cash' 
          AND ($1::date IS NULL OR expense_date::date > $1)

        UNION ALL

        /* Manual Cash Entries */
        SELECT 
          CASE WHEN LOWER(type) = 'deposit' THEN amount ELSE 0 END AS credit,
          CASE WHEN LOWER(type) = 'withdraw' THEN amount ELSE 0 END AS debit
        FROM cash_transactions
        WHERE ($1::date IS NULL OR txn_date::date > $1)
          AND LOWER(COALESCE(type, '')) NOT IN ('adjustment', 'opening_balance')
      ) x
    `, [snapshotDate]);

    cashBalance += Number(cashTxns.rows[0]?.net_cash || 0);

    /* ========== 7. BANK PROFILES BALANCES ========== */
    const bankProfilesRes = await db.query(`SELECT id, bank_name, account_title, account_number FROM banks WHERE LOWER(status) = 'active' ORDER BY id ASC`);

    let banksList = [];
    let totalBankBalance = 0;

    for (let b of bankProfilesRes.rows) {
      const bSnapRes = await db.query(`
        SELECT balance FROM archive_balances WHERE snapshot_id = $1 AND UPPER(balance_type) = 'BANK' AND code = $2
      `, [snapshotId, String(b.id)]);
      let bBalance = Number(bSnapRes.rows[0]?.balance || 0);

      const bTxns = await db.query(`
        SELECT COALESCE(SUM(CASE WHEN method='in' THEN amount ELSE -amount END), 0) AS net_bank
        FROM (
          /* Customer Bank Payments */
          SELECT amount, 'in' AS method 
          FROM customer_payments 
          WHERE LOWER(COALESCE(payment_method, '')) = 'bank' 
            AND bank_profile_id = $1 
            AND is_deleted = false 
            AND ($2::date IS NULL OR payment_date::date > $2) 
            AND LOWER(COALESCE(type, '')) NOT IN ('adjustment', 'opening_balance')

          UNION ALL

          /* Supplier Bank Payments */
          SELECT amount, 'out' AS method 
          FROM supplier_payments 
          WHERE LOWER(COALESCE(payment_method, '')) = 'bank' 
            AND bank_profile_id = $1 
            AND ($2::date IS NULL OR payment_date::date > $2) 
            AND LOWER(COALESCE(type, '')) NOT IN ('adjustment', 'opening_balance')

          UNION ALL

          /* Expense Bank Payments */
          SELECT amount, 'out' AS method 
          FROM expense_ledger 
          WHERE LOWER(COALESCE(payment_method, '')) = 'bank' 
            AND bank_profile_id = $1 
            AND ($2::date IS NULL OR expense_date::date > $2)

          UNION ALL

          /* Bank Manual Transactions */
          SELECT amount, CASE WHEN LOWER(type) = 'deposit' THEN 'in' ELSE 'out' END AS method 
          FROM bank_transactions 
          WHERE bank_profile_id = $1 
            AND ($2::date IS NULL OR txn_date::date > $2)
            AND LOWER(COALESCE(type, '')) NOT IN ('adjustment', 'opening_balance')
        ) x
      `, [b.id, snapshotDate]);

      bBalance += Number(bTxns.rows[0]?.net_bank || 0);
      totalBankBalance += bBalance;

      banksList.push({
        id: b.id,
        bank_name: b.bank_name,
        account_title: b.account_title,
        account_number: b.account_number,
        balance: bBalance
      });
    }

    /* ========== 8. SUMMARY CALCULATION WITH FINAL POSITION ========== */
    const totalRegReceivable = registeredRows.filter(r => r.balance > 0).reduce((a, r) => a + r.balance, 0);
    const totalStdReceivable = standardCustomerRows.filter(r => r.balance > 0).reduce((a, r) => a + r.balance, 0);
    const totalReceivable = totalStdReceivable + totalRegReceivable;

    const totalPayable = suppliers.filter(r => r.balance > 0).reduce((a, r) => a + r.balance, 0);

    const totalStdExtra = standardCustomerRows.filter(r => r.balance < 0).reduce((a, r) => a + Math.abs(r.balance), 0);
    const totalRegExtra = registeredRows.filter(r => r.balance < 0).reduce((a, r) => a + Math.abs(r.balance), 0);
    const totalExtraReceived = totalStdExtra + totalRegExtra;

    const totalExtraPaid = suppliers.filter(r => r.balance < 0).reduce((a, r) => a + Math.abs(r.balance), 0);

    // Final Net Position Calculation
    const totalAssets = totalReceivable + cashBalance + totalBankBalance + totalExtraPaid;
    const totalLiabilities = totalPayable + totalExtraReceived;
    const finalNetPosition = totalAssets - totalLiabilities;

    const summary = {
      total_receivable: totalReceivable,
      total_payable: totalPayable,
      total_extra_received: totalExtraReceived,
      total_extra_paid: totalExtraPaid,
      cash_in_hand: cashBalance,
      total_bank_balance: totalBankBalance,
      final_net_position: finalNetPosition
    };

    return res.json({
      success: true,
      snapshot: { snapshotId, snapshotDate },
      customers: standardCustomerRows.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)),
      registeredCustomers: registeredRows.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)),
      suppliers,
      banks: banksList,
      summary
    });

  } catch (err) {
    console.error("BALANCE SHEET ERROR:", err);
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
