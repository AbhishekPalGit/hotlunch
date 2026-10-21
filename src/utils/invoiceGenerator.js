/**
 * Invoice Generator Utility
 * Produces pixel-perfect, light-scheme, standalone HTML invoice receipts
 * and handles direct download and isolated iframe printing.
 * Matches Mockup Page 14 parity.
 */

function parseLocalDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  const str = String(dateInput).trim();
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month, day);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function formatInvoiceDateBanner(dateInput) {
  if (!dateInput) return '';
  if (typeof dateInput === 'string' && dateInput.includes(',')) return dateInput;

  const d = parseLocalDate(dateInput);
  if (!d || isNaN(d.getTime())) return String(dateInput);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = days[d.getDay()];
  const dayNum = d.getDate();
  const monthName = months[d.getMonth()];
  const year2 = String(d.getFullYear()).slice(-2);
  return `${dayName}, ${dayNum} ${monthName}, ${year2}`;
}

export function formatOrderDate(dateInput) {
  if (!dateInput) return '--';
  const d = parseLocalDate(dateInput);
  if (!d || isNaN(d.getTime())) return String(dateInput);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNum = d.getDate();
  const monthName = months[d.getMonth()];
  const year2 = String(d.getFullYear()).slice(-2);
  return `${dayNum} ${monthName}, ${year2}`;
}

/**
 * Generate standalone, self-contained HTML invoice string
 */
export function generateInvoiceHtml(inputData) {
  if (!inputData) return '';

  // Handle both API response structure { order, campusInfo, ... }
  // and checkout mapped order structure { orderNumber, childName, dates, ... }
  const isApiFormat = !!inputData.order;

  const orderObj = isApiFormat ? inputData.order : inputData;
  const campusInfo = inputData.campusInfo || {};
  const accountInfo = inputData.accountInfo || {};
  const invoiceToInfo = inputData.invoiceToInfo || {};
  const createdFor = inputData.createdFor || {};
  const menuInfo = inputData.menuInfo || {};
  const financialBreakdown = inputData.financialBreakdown || {};

  const cleanId = String(orderObj.id || orderObj.orderId || orderObj.orderNumber || 'receipt').replace(/^#/, '');
  const orderNumber = orderObj.orderNumber ? String(orderObj.orderNumber).replace(/^#/, '') : cleanId;

  // Party info
  const parentName = invoiceToInfo.fullName ||
    (invoiceToInfo.firstName ? `${invoiceToInfo.firstName} ${invoiceToInfo.lastName || ''}`.trim() : null) ||
    localStorage.getItem('user_name') ||
    'Parent Account';

  const parentEmail = invoiceToInfo.email ||
    localStorage.getItem('user_email') ||
    'parent@hotlunch.com';

  const schoolName = campusInfo.name || orderObj.campusName || orderObj.campus || 'Valleyview Middle New';
  const schoolEmail = accountInfo.email || 'donotreply@hotlunch.com';

  // Metadata
  const studentName = createdFor.fullName ||
    (createdFor.firstName ? `${createdFor.firstName} ${createdFor.lastName || ''}`.trim() : null) ||
    orderObj.childName ||
    orderObj.studentName ||
    orderObj.student ||
    orderObj.typeName ||
    '--';

  const gradeVal = createdFor.gradeName || orderObj.gradeName || orderObj.grade || '--';
  const classroomVal = createdFor.classroomName || orderObj.classroomName || orderObj.classroom || '--';
  const createdByVal = invoiceToInfo.fullName || parentName;
  const menuTitle = menuInfo.title || orderObj.menuName || orderObj.menu || 'Monthly Menu';
  const orderDateFormatted = formatOrderDate(orderObj.createdDate || orderObj.orderOn || new Date());

  // Status
  const isPaid = orderObj.paid === 1 || orderObj.status === 'PAID';
  const isCancelled = orderObj.isCancelled === 1 || orderObj.status === 'CANCELLED';
  const statusStr = isCancelled ? 'CANCELLED' : (isPaid ? 'PAID' : (orderObj.status || 'PENDING')).toUpperCase();

  // Normalize scheduled meals dates
  let dateSections = [];
  if (Array.isArray(inputData.dates) && inputData.dates.length > 0) {
    dateSections = inputData.dates.map(ds => ({
      dateBanner: formatInvoiceDateBanner(ds.date || ds.displayDate),
      items: ds.items || []
    }));
  } else if (inputData.orderInfo && typeof inputData.orderInfo === 'object') {
    if (Array.isArray(inputData.orderInfo)) {
      const groups = {};
      inputData.orderInfo.forEach(it => {
        const dKey = it.orderDate || it.date || 'Scheduled Meals';
        if (!groups[dKey]) groups[dKey] = [];
        groups[dKey].push(it);
      });
      dateSections = Object.entries(groups).map(([dKey, items]) => ({
        dateBanner: formatInvoiceDateBanner(dKey),
        items
      }));
    } else {
      dateSections = Object.entries(inputData.orderInfo).map(([dKey, items]) => ({
        dateBanner: formatInvoiceDateBanner(dKey),
        items
      }));
    }
  }

  if (dateSections.length === 0) {
    dateSections = [
      {
        dateBanner: formatInvoiceDateBanner(new Date()),
        items: [
          {
            name: 'MEAL ORDER',
            unitPrice: parseFloat(orderObj.orderAmount || orderObj.amount || 0),
            quantity: 1,
            total: parseFloat(orderObj.orderAmount || orderObj.amount || 0)
          }
        ]
      }
    ];
  }

  // Financial amounts
  const subtotal = parseFloat(financialBreakdown.orderAmount ?? orderObj.orderAmount ?? orderObj.amount ?? 0);
  const tax = parseFloat(financialBreakdown.salesTax ?? orderObj.salesTax ?? 0);
  const schoolFees = parseFloat(financialBreakdown.schoolFees ?? orderObj.schoolFees ?? 0);
  const lateFees = parseFloat(financialBreakdown.lateFees ?? orderObj.lateFees ?? 0);
  const credits = parseFloat(financialBreakdown.creditsApplied ?? orderObj.creditsApplied ?? orderObj.creditUsed ?? 0);
  const grandTotal = parseFloat(financialBreakdown.grandTotal ?? orderObj.grandTotal ?? (subtotal + tax + schoolFees + lateFees - credits));

  // Build items rows HTML
  const itemsHtml = dateSections.map(ds => {
    const bannerRow = `
      <tr class="invoice-date-banner-row">
        <td colspan="4">${ds.dateBanner}</td>
      </tr>
    `;

    const itemsRows = (ds.items || []).map(it => {
      const uPrice = parseFloat(it.unitPrice ?? it.price ?? 0);
      const qty = parseInt(it.quantity, 10) || 1;
      const tot = parseFloat(it.total ?? (uPrice * qty));
      const iName = (it.name || it.itemName || it.title || 'Meal Item').toUpperCase();
      const hasAddons = Array.isArray(it.addons) && it.addons.length > 0;

      let addonHtml = '';
      if (hasAddons) {
        addonHtml = it.addons.map(ad => `
          <tr class="invoice-addon-subrow">
            <td colspan="4">+ ${(ad.name || ad.itemName || 'Addon').toUpperCase()} (+${parseFloat(ad.price || ad.unitPrice || 0).toFixed(2)})</td>
          </tr>
        `).join('');
      }

      return `
        <tr class="invoice-item-row">
          <td class="col-desc">${iName}</td>
          <td class="col-unit">$${uPrice.toFixed(2)}</td>
          <td class="col-qty">${qty}</td>
          <td class="col-total">$${tot.toFixed(2)}</td>
        </tr>
        ${addonHtml}
      `;
    }).join('');

    return bannerRow + itemsRows;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>Invoice - Order #${orderNumber}</title>
  <style>
    :root, html, body {
      color-scheme: light !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #1E293B !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    @page {
      size: A4 portrait;
      margin: 12mm 10mm;
    }
    body {
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #ffffff !important;
      color: #1E293B !important;
    }
    .invoice-card {
      background: #ffffff !important;
      background-color: #ffffff !important;
      border-radius: 16px;
      border: 1px solid #CBD5E1;
      padding: 32px 40px;
      max-width: 960px;
      margin: 0 auto;
      box-shadow: none;
    }
    .invoice-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 26px;
    }
    .invoice-order-title {
      color: #E29578 !important;
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }
    .invoice-center-title {
      color: #E29578 !important;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin: 0;
    }
    .invoice-parties-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #E2E8F0;
    }
    .invoice-party-col {
      display: flex;
      flex-direction: column;
    }
    .invoice-party-col.text-right {
      text-align: right;
      align-items: flex-end;
    }
    .invoice-party-label {
      font-size: 12.5px;
      font-weight: 500;
      color: #94A3B8;
      margin-bottom: 4px;
    }
    .invoice-party-name {
      font-size: 16px;
      font-weight: 700;
      color: #1E293B;
      margin-bottom: 2px;
    }
    .invoice-party-email {
      font-size: 13.5px;
      color: #64748B;
    }
    .invoice-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 44px;
      row-gap: 11px;
      margin-bottom: 28px;
    }
    .invoice-meta-row {
      display: flex;
      align-items: center;
      font-size: 13px;
    }
    .invoice-meta-label {
      color: #38A3A5 !important;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      width: 160px;
      flex-shrink: 0;
    }
    .invoice-meta-val {
      color: #1E293B;
      font-weight: 500;
      flex: 1;
    }
    .invoice-status-pill {
      display: inline-block;
      padding: 3px 14px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #ffffff !important;
    }
    .invoice-status-pill.status-pending,
    .invoice-status-pill.status-unpaid {
      background: #E9A844 !important;
      background-color: #E9A844 !important;
    }
    .invoice-status-pill.status-paid {
      background: #22A06B !important;
      background-color: #22A06B !important;
    }
    .invoice-status-pill.status-cancelled,
    .invoice-status-pill.status-deleted {
      background: #EF4444 !important;
      background-color: #EF4444 !important;
    }
    .invoice-meta-total {
      color: #22A06B !important;
      font-weight: 700;
      font-size: 15px;
    }
    .invoice-table-wrap {
      width: 100%;
      margin-bottom: 24px;
    }
    .invoice-items-table {
      width: 100%;
      border-collapse: collapse;
    }
    .invoice-items-table thead tr th {
      background: #83C5BE !important;
      background-color: #83C5BE !important;
      color: #ffffff !important;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      padding: 10px 16px;
      text-align: left;
      border: 1px solid #83C5BE;
    }
    .invoice-date-banner-row td {
      background: #E6F4F5 !important;
      background-color: #E6F4F5 !important;
      color: #006D77 !important;
      font-weight: 600;
      font-size: 12px;
      padding: 8px 16px;
      border: 1px solid #E2E8F0;
    }
    .invoice-item-row td {
      background: #ffffff !important;
      background-color: #ffffff !important;
      padding: 11px 16px;
      font-size: 12px;
      color: #334155;
      border-bottom: 1px solid #E2E8F0;
    }
    .invoice-item-row .col-desc {
      font-weight: 600;
      color: #1E293B;
    }
    .invoice-item-row .col-unit,
    .invoice-item-row .col-qty,
    .invoice-item-row .col-total {
      color: #334155;
    }
    .invoice-addon-subrow td {
      background: #ffffff !important;
      background-color: #ffffff !important;
      padding: 4px 16px 6px 28px;
      font-size: 11px;
      color: #64748B;
      border-bottom: 1px solid #E2E8F0;
    }
    .invoice-summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }
    .invoice-summary-box {
      width: 290px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .invoice-summary-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .invoice-summary-label {
      color: #006D77 !important;
      font-size: 12px;
      font-weight: 600;
      text-align: right;
      flex: 1;
      padding-right: 14px;
    }
    .invoice-summary-val {
      background: #F8FAFC !important;
      background-color: #F8FAFC !important;
      color: #334155;
      font-size: 12.5px;
      font-weight: 500;
      padding: 5px 14px;
      min-width: 90px;
      border-radius: 4px;
      border: 1px solid #E2E8F0;
      text-align: right;
    }
    .invoice-summary-row.grand-total .invoice-summary-label {
      font-size: 13.5px;
      font-weight: 700;
      color: #006D77 !important;
    }
    .invoice-summary-row.grand-total .invoice-summary-val {
      font-size: 15px;
      font-weight: 700;
      color: #1E293B !important;
    }
    @media print {
      body { padding: 0 !important; background: #ffffff !important; }
      .invoice-card { border: none !important; padding: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="invoice-card" id="printable-invoice-card">
    <div class="invoice-card-header">
      <h1 class="invoice-order-title">Order #${orderNumber}</h1>
      <div class="invoice-center-title">INVOICE</div>
      <div style="width: 80px;"></div>
    </div>

    <div class="invoice-parties-row">
      <div class="invoice-party-col">
        <span class="invoice-party-label">Billed To:</span>
        <span class="invoice-party-name">${parentName}</span>
        <span class="invoice-party-email">${parentEmail}</span>
      </div>
      <div class="invoice-party-col text-right">
        <span class="invoice-party-label">From:</span>
        <span class="invoice-party-name">${schoolName}</span>
        <span class="invoice-party-email">${schoolEmail}</span>
      </div>
    </div>

    <div class="invoice-meta-grid">
      <div style="display: flex; flex-direction: column; gap: 11px;">
        <div class="invoice-meta-row">
          <span class="invoice-meta-label">STUDENT</span>
          <span class="invoice-meta-val">${studentName}</span>
        </div>
        <div class="invoice-meta-row">
          <span class="invoice-meta-label">GRADE</span>
          <span class="invoice-meta-val">${gradeVal}</span>
        </div>
        <div class="invoice-meta-row">
          <span class="invoice-meta-label">CLASSROOM</span>
          <span class="invoice-meta-val">${classroomVal}</span>
        </div>
        <div class="invoice-meta-row">
          <span class="invoice-meta-label">ORDER CREATED BY</span>
          <span class="invoice-meta-val">${createdByVal}</span>
        </div>
        <div class="invoice-meta-row">
          <span class="invoice-meta-label">MENU</span>
          <span class="invoice-meta-val">${menuTitle}</span>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 11px;">
        <div class="invoice-meta-row">
          <span class="invoice-meta-label">ORDER #</span>
          <span class="invoice-meta-val">${orderNumber}</span>
        </div>
        <div class="invoice-meta-row">
          <span class="invoice-meta-label">ORDER DATE</span>
          <span class="invoice-meta-val">${orderDateFormatted}</span>
        </div>
        <div class="invoice-meta-row">
          <span class="invoice-meta-label">PAYMENT STATUS</span>
          <div class="invoice-meta-val">
            <span class="invoice-status-pill status-${statusStr.toLowerCase()}">
              ${statusStr}
            </span>
          </div>
        </div>
        <div class="invoice-meta-row">
          <span class="invoice-meta-label">ORDER TOTAL</span>
          <span class="invoice-meta-val invoice-meta-total">$${grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <div class="invoice-table-wrap">
      <table class="invoice-items-table">
        <thead>
          <tr>
            <th style="width: 55%;">ITEM DESCRIPTION</th>
            <th style="width: 15%;">UNIT PRICE</th>
            <th style="width: 15%;">QUANTITY</th>
            <th style="width: 15%;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <div class="invoice-summary-section">
      <div class="invoice-summary-box">
        <div class="invoice-summary-row">
          <span class="invoice-summary-label">Order Amount</span>
          <span class="invoice-summary-val">$${subtotal.toFixed(2)}</span>
        </div>
        <div class="invoice-summary-row">
          <span class="invoice-summary-label">Sales Tax</span>
          <span class="invoice-summary-val">$${tax.toFixed(2)}</span>
        </div>
        <div class="invoice-summary-row">
          <span class="invoice-summary-label">School Fees</span>
          <span class="invoice-summary-val">$${schoolFees.toFixed(2)}</span>
        </div>
        <div class="invoice-summary-row">
          <span class="invoice-summary-label">Late Fees</span>
          <span class="invoice-summary-val">$${lateFees.toFixed(2)}</span>
        </div>
        ${credits > 0 ? `
          <div class="invoice-summary-row">
            <span class="invoice-summary-label">Credits Applied</span>
            <span class="invoice-summary-val" style="color: #22A06B;">-$${credits.toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="invoice-summary-row grand-total">
          <span class="invoice-summary-label">Grand Total</span>
          <span class="invoice-summary-val">$${grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Downloads a standalone .html receipt file
 */
export function downloadInvoiceHtml(htmlContent, filename = 'Invoice.html') {
  if (!htmlContent) return;
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Executes isolated print / Save-as-PDF preview via an off-screen iframe
 */
export function printInvoiceHtml(htmlContent) {
  if (!htmlContent) {
    window.print();
    return;
  }

  try {
    const existing = document.getElementById('invoice-print-frame');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'invoice-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '1024px';
    iframe.style.height = '1200px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow.document;
    frameDoc.open();
    frameDoc.write(htmlContent);
    frameDoc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.warn('Iframe print error fallback to window.print():', err);
        window.print();
      } finally {
        setTimeout(() => {
          try {
            iframe.remove();
          } catch (e) {}
        }, 2500);
      }
    };

    if (iframe.contentWindow.document.readyState === 'complete') {
      setTimeout(triggerPrint, 250);
    } else {
      iframe.onload = () => setTimeout(triggerPrint, 250);
      setTimeout(triggerPrint, 600);
    }
  } catch (err) {
    console.warn('Print error fallback:', err);
    window.print();
  }
}

/**
 * Convenience method to export an invoice: downloads the HTML receipt & opens print/Save as PDF
 */
export function exportInvoice(data, { download = true, print = true } = {}) {
  const html = generateInvoiceHtml(data);
  const cleanId = String(data.order?.id || data.orderId || data.id || 'receipt').replace(/^#/, '');
  const filename = `Invoice_Order_${cleanId}.html`;

  if (download) {
    downloadInvoiceHtml(html, filename);
  }
  if (print) {
    printInvoiceHtml(html);
  }
  return html;
}
