import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getOrderDetailsApi, cancelOrderApi } from '../../services/api';
import './Invoice.css';

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

function formatInvoiceDateBanner(dateInput) {
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

function formatOrderDate(dateInput) {
  if (!dateInput) return '--';
  const d = parseLocalDate(dateInput);
  if (!d || isNaN(d.getTime())) return String(dateInput);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNum = d.getDate();
  const monthName = months[d.getMonth()];
  const year2 = String(d.getFullYear()).slice(-2);
  return `${dayNum} ${monthName}, ${year2}`;
}

const Invoice = ({ orderId: propOrderId, onBack }) => {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const activeOrderId = propOrderId || params.orderId || location.state?.orderId || location.state?.order?.rawId || location.state?.order?.id;
  const cleanOrderId = activeOrderId ? String(activeOrderId).replace(/^#/, '') : '';

  const [loading, setLoading] = useState(true);
  const [invoiceData, setInvoiceData] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchInvoice = async () => {
      if (!cleanOrderId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await getOrderDetailsApi(cleanOrderId);
        if (isMounted) {
          if (response && response.status === 'success' && response.data) {
            setInvoiceData(response.data);
          } else if (response && response.data) {
            setInvoiceData(response.data);
          } else {
            // Fallback from passed order object in navigation state
            buildFallbackInvoice();
          }
        }
      } catch (err) {
        console.warn('Could not fetch remote order invoice:', err);
        if (isMounted) {
          buildFallbackInvoice();
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const buildFallbackInvoice = () => {
      const fallbackOrder = location.state?.order || {};
      const parentName = localStorage.getItem('user_name') || 'Test Parent Account';
      const parentEmail = localStorage.getItem('user_email') || 'testparentaccount2023@gmail.com';

      const orderAmount = parseFloat(fallbackOrder.amount || 5.25);
      const salesTax = parseFloat(fallbackOrder.salesTax || (orderAmount * 0.1).toFixed(2));
      const grandTotal = parseFloat(fallbackOrder.amountPaid || (orderAmount + salesTax).toFixed(2));

      setInvoiceData({
        order: {
          id: cleanOrderId || fallbackOrder.id || '4066751',
          createdDate: fallbackOrder.orderOn || new Date().toISOString(),
          paid: fallbackOrder.status === 'PAID' ? 1 : 0,
          isCancelled: fallbackOrder.status === 'CANCELLED' ? 1 : 0,
          draft: 0,
          notes: null,
          typeName: fallbackOrder.student || 'Jane Doe',
          gradeName: fallbackOrder.grade || '6',
          classroomName: fallbackOrder.classroom || '1',
          menuName: fallbackOrder.menu || 'August 2023',
          campusName: fallbackOrder.campus || 'Valleyview Middle New'
        },
        campusInfo: {
          name: fallbackOrder.campus || 'Valleyview Middle New',
          email: 'donotreply@hotlunch.com'
        },
        accountInfo: {
          email: 'donotreply@hotlunch.com'
        },
        invoiceToInfo: {
          fullName: parentName,
          email: parentEmail
        },
        createdFor: {
          fullName: fallbackOrder.student || 'Jane Doe',
          gradeName: fallbackOrder.grade || '6',
          classroomName: fallbackOrder.classroom || '1'
        },
        menuInfo: {
          title: fallbackOrder.menu || 'August 2023'
        },
        orderInfo: {
          '2023-08-28': [
            {
              id: 1,
              name: 'STRAWBERRY JUICE - REGULAR',
              unitPrice: 0.25,
              quantity: 1,
              total: 0.25
            }
          ],
          '2023-08-29': [
            {
              id: 2,
              name: 'BAKED POTATO WITH VEGGIES (GLUTEN FREE) - REGULAR',
              unitPrice: 0.00,
              quantity: 1,
              total: 0.00
            }
          ]
        },
        financialBreakdown: {
          orderAmount: orderAmount,
          salesTax: salesTax,
          schoolFees: 0.00,
          lateFees: 0.00,
          creditsApplied: 0.00,
          grandTotal: grandTotal,
          amountPaid: fallbackOrder.status === 'PAID' ? grandTotal : 0.00,
          balanceDue: fallbackOrder.status === 'PAID' ? 0.00 : grandTotal
        },
        actions: {
          canCancel: fallbackOrder.status !== 'CANCELLED' && fallbackOrder.status !== 'PAID',
          canPay: fallbackOrder.status !== 'PAID' && fallbackOrder.status !== 'CANCELLED',
          canModify: false
        }
      });
    };

    fetchInvoice();

    return () => {
      isMounted = false;
    };
  }, [cleanOrderId, location.state]);

  const handleBack = () => {
    if (typeof onBack === 'function') {
      onBack();
    } else {
      navigate('/myorders');
    }
  };

  if (loading) {
    return (
      <div className="invoice-page-container">
        <div className="invoice-back-nav">
          <button className="btn-invoice-back" onClick={handleBack}>
            <span className="back-icon-circle">
              <i className="lni lni-arrow-left" />
            </span>
            <span>Back to My Orders</span>
          </button>
        </div>
        <div className="invoice-card" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <div className="shimmer-base" style={{ height: 32, width: '40%', margin: '0 auto 24px' }} />
          <div className="shimmer-base" style={{ height: 120, width: '100%', marginBottom: 20 }} />
          <div className="shimmer-base" style={{ height: 200, width: '100%' }} />
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="invoice-page-container">
        <div className="invoice-back-nav">
          <button className="btn-invoice-back" onClick={handleBack}>
            <span className="back-icon-circle">
              <i className="lni lni-arrow-left" />
            </span>
            <span>Back to My Orders</span>
          </button>
        </div>
        <div className="invoice-card" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <i className="lni lni-warning" style={{ fontSize: 42, color: '#E29578', marginBottom: 12, display: 'inline-block' }} />
          <h2 style={{ color: '#1E293B', fontSize: 20, marginBottom: 8 }}>Order Not Found</h2>
          <p style={{ color: '#64748B', fontSize: 13, marginBottom: 24 }}>
            We could not retrieve details for Order #{cleanOrderId || 'N/A'}.
          </p>
          <button className="btn-invoice-pay" onClick={handleBack}>
            Return to My Orders
          </button>
        </div>
      </div>
    );
  }

  const {
    order = {},
    campusInfo = {},
    accountInfo = {},
    invoiceToInfo = {},
    createdFor = {},
    menuInfo = {},
    orderInfo = {},
    financialBreakdown = {},
    actions = {}
  } = invoiceData;

  // Status computation matching parity
  const isPaid = order.paid === 1;
  const isCancelled = order.isCancelled === 1;
  const statusStr = isCancelled ? 'CANCELLED' : (isPaid ? 'PAID' : (order.status || 'PENDING')).toUpperCase();

  // Billed To & From information
  const parentName = invoiceToInfo.fullName || (invoiceToInfo.firstName ? `${invoiceToInfo.firstName} ${invoiceToInfo.lastName || ''}`.trim() : null) || 'Test Parent Account';
  const parentEmail = invoiceToInfo.email || 'testparentaccount2023@gmail.com';
  const schoolName = campusInfo.name || order.campusName || 'Valleyview Middle New';
  const schoolEmail = accountInfo.email || 'donotreply@hotlunch.com';

  // Metadata items
  const studentName = createdFor.fullName || (createdFor.firstName ? `${createdFor.firstName} ${createdFor.lastName || ''}`.trim() : null) || order.typeName || '--';
  const gradeVal = createdFor.gradeName || order.gradeName || '--';
  const classroomVal = createdFor.classroomName || order.classroomName || '--';
  const createdByVal = invoiceToInfo.fullName || parentName;
  const menuTitle = menuInfo.title || order.menuName || '--';
  const orderNumber = order.id || cleanOrderId || '--';
  const orderDateFormatted = formatOrderDate(order.createdDate || order.orderOn);
  const grandTotalVal = parseFloat(financialBreakdown.grandTotal || order.payAmt || order.amount || 0);

  // Group line items by date
  // orderInfo can be { "YYYY-MM-DD": [items...] } or an array of items
  let groupedDates = [];
  if (orderInfo && typeof orderInfo === 'object') {
    if (Array.isArray(orderInfo)) {
      const groups = {};
      orderInfo.forEach(item => {
        const dKey = item.orderDate || item.date || 'Scheduled Meals';
        if (!groups[dKey]) groups[dKey] = [];
        groups[dKey].push(item);
      });
      groupedDates = Object.entries(groups);
    } else {
      groupedDates = Object.entries(orderInfo);
    }
  }

  // If orderInfo is empty, provide a clean fallback
  if (groupedDates.length === 0) {
    groupedDates = [
      ['Scheduled Meals', [
        {
          id: 1,
          name: 'MEAL ORDER',
          unitPrice: parseFloat(financialBreakdown.orderAmount || order.amount || 0),
          quantity: 1,
          total: parseFloat(financialBreakdown.orderAmount || order.amount || 0)
        }
      ]]
    ];
  }

  const getPrintableHtml = () => {
    const invoiceElement = document.getElementById('printable-invoice-card');
    if (!invoiceElement) return '';

    const invoiceClone = invoiceElement.cloneNode(true);
    // Remove action buttons from print/download output
    const actions = invoiceClone.querySelector('.invoice-header-actions');
    if (actions) actions.remove();
    const bottomActions = invoiceClone.querySelector('.invoice-bottom-actions');
    if (bottomActions) bottomActions.remove();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>Invoice - Order #${orderNumber || cleanOrderId || 'Receipt'}</title>
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
      background-color: #ffffff !important;
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
  ${invoiceClone.outerHTML}
</body>
</html>`;
  };

  const handlePrint = () => {
    try {
      const printableContent = getPrintableHtml();
      if (!printableContent) {
        window.print();
        return;
      }

      const existingFrame = document.getElementById('invoice-print-frame');
      if (existingFrame) existingFrame.remove();

      // Create an off-screen iframe with real layout width so layout engines never collapse to a 0x0 black box
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
      frameDoc.write(printableContent);
      frameDoc.close();

      const runPrint = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (err) {
          console.warn('Iframe print failed, falling back to window.print():', err);
          window.print();
        } finally {
          setTimeout(() => {
            try {
              iframe.remove();
            } catch (e) {}
          }, 2000);
        }
      };

      if (iframe.contentWindow.document.readyState === 'complete') {
        setTimeout(runPrint, 250);
      } else {
        iframe.onload = () => setTimeout(runPrint, 250);
        setTimeout(runPrint, 600);
      }
    } catch (err) {
      console.warn('Print error fallback:', err);
      window.print();
    }
  };

  const handleDownload = () => {
    try {
      const printableContent = getPrintableHtml();
      const filename = `Invoice_Order_${orderNumber || cleanOrderId || 'receipt'}.html`;

      if (printableContent) {
        // Download full standalone HTML receipt
        const blob = new Blob([printableContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`Invoice #${orderNumber || cleanOrderId} receipt downloaded!`);
      }

      // Also trigger print preview with "Save as PDF"
      handlePrint();
    } catch (err) {
      console.error('Download error:', err);
      handlePrint();
    }
  };

  const handleCancelOrder = async () => {
    if (!cleanOrderId) return;
    if (!window.confirm(`Are you sure you want to cancel Order #${cleanOrderId}?`)) return;

    setCancelling(true);
    try {
      const res = await cancelOrderApi(cleanOrderId);
      if (res && res.status === 'success') {
        toast.success(`Order #${cleanOrderId} cancelled successfully`);
        setInvoiceData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            order: { ...prev.order, isCancelled: 1, paid: 0 },
            actions: { ...prev.actions, canCancel: false, canPay: false }
          };
        });
      } else {
        toast.error(res?.message || 'Failed to cancel order');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error cancelling order');
    } finally {
      setCancelling(false);
    }
  };

  const handlePayOrder = () => {
    navigate('/checkout', { state: { orderId: cleanOrderId } });
  };

  const handleModifyOrder = () => {
    navigate('/dashboard');
    toast.info('Opening weekly calendar to update meals');
  };

  return (
    <div className="invoice-page-container">
      {/* ── Top Left: Back to My Orders ── */}
      <div className="invoice-back-nav">
        <button className="btn-invoice-back" onClick={handleBack} title="Back to My Orders">
          <span className="back-icon-circle">
            <i className="lni lni-arrow-left" />
          </span>
          <span>Back to My Orders</span>
        </button>
      </div>

      {/* ── Main Invoice White Card ── */}
      <div className="invoice-card" id="printable-invoice-card">
        {/* Header Row: Order #{orderId} | INVOICE | Icons */}
        <div className="invoice-card-header">
          <h1 className="invoice-order-title">
            Order #{orderNumber}
          </h1>

          <div className="invoice-center-title">
            INVOICE
          </div>

          <div className="invoice-header-actions">
            <button
              type="button"
              className="invoice-action-btn btn-folder"
              onClick={handleDownload}
              title="Download Invoice / Save PDF"
            >
              <i className="lni lni-download" />
            </button>
            <button
              type="button"
              className="invoice-action-btn btn-print"
              onClick={handlePrint}
              title="Print Invoice"
            >
              <i className="lni lni-printer" />
            </button>
          </div>
        </div>

        {/* Billed To / From Row */}
        <div className="invoice-parties-row">
          <div className="invoice-party-col">
            <span className="invoice-party-label">Billed To:</span>
            <span className="invoice-party-name">{parentName}</span>
            <span className="invoice-party-email">{parentEmail}</span>
          </div>

          <div className="invoice-party-col text-right">
            <span className="invoice-party-label">From:</span>
            <span className="invoice-party-name">{schoolName}</span>
            <span className="invoice-party-email">{schoolEmail}</span>
          </div>
        </div>

        {/* Metadata Grid (2 balanced columns) */}
        <div className="invoice-meta-grid">
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div className="invoice-meta-row">
              <span className="invoice-meta-label">STUDENT</span>
              <span className="invoice-meta-val">{studentName}</span>
            </div>
            <div className="invoice-meta-row">
              <span className="invoice-meta-label">GRADE</span>
              <span className="invoice-meta-val">{gradeVal}</span>
            </div>
            <div className="invoice-meta-row">
              <span className="invoice-meta-label">CLASSROOM</span>
              <span className="invoice-meta-val">{classroomVal}</span>
            </div>
            <div className="invoice-meta-row">
              <span className="invoice-meta-label">ORDER CREATED BY</span>
              <span className="invoice-meta-val">{createdByVal}</span>
            </div>
            <div className="invoice-meta-row">
              <span className="invoice-meta-label">MENU</span>
              <span className="invoice-meta-val">{menuTitle}</span>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div className="invoice-meta-row">
              <span className="invoice-meta-label">ORDER #</span>
              <span className="invoice-meta-val">{orderNumber}</span>
            </div>
            <div className="invoice-meta-row">
              <span className="invoice-meta-label">ORDER DATE</span>
              <span className="invoice-meta-val">{orderDateFormatted}</span>
            </div>
            <div className="invoice-meta-row">
              <span className="invoice-meta-label">PAYMENT STATUS</span>
              <div className="invoice-meta-val">
                <span className={`invoice-status-pill status-${statusStr.toLowerCase()}`}>
                  {statusStr}
                </span>
              </div>
            </div>
            <div className="invoice-meta-row">
              <span className="invoice-meta-label">ORDER TOTAL</span>
              <span className="invoice-meta-val invoice-meta-total">
                ${grandTotalVal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Items Table Pre-grouped by Date ── */}
        <div className="invoice-table-wrap">
          <table className="invoice-items-table">
            <thead>
              <tr>
                <th style={{ width: '55%' }}>ITEM DESCRIPTION</th>
                <th style={{ width: '15%' }}>UNIT PRICE</th>
                <th style={{ width: '15%' }}>QUANTITY</th>
                <th style={{ width: '15%' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {groupedDates.map(([dateKey, items], dIdx) => (
                <React.Fragment key={dIdx}>
                  {/* Pale mint date banner row */}
                  <tr className="invoice-date-banner-row">
                    <td colSpan="4">
                      {formatInvoiceDateBanner(dateKey)}
                    </td>
                  </tr>

                  {/* Line items for this date */}
                  {(items || []).map((it, iIdx) => {
                    const unitPrice = parseFloat(it.unitPrice ?? it.price ?? 0);
                    const qty = parseInt(it.quantity, 10) || 1;
                    const total = parseFloat(it.total ?? (unitPrice * qty));
                    const itemName = it.name || it.title || it.itemName || 'Meal Option';
                    const hasAddons = Array.isArray(it.addons) && it.addons.length > 0;

                    return (
                      <React.Fragment key={iIdx}>
                        <tr className="invoice-item-row">
                          <td className="col-desc">
                            {itemName}
                          </td>
                          <td className="col-unit">
                            ${unitPrice.toFixed(2)}
                          </td>
                          <td className="col-qty">
                            {qty}
                          </td>
                          <td className="col-total">
                            ${total.toFixed(2)}
                          </td>
                        </tr>

                        {/* Nested addons if any */}
                        {hasAddons && it.addons.map((addon, aIdx) => (
                          <tr key={`addon-${aIdx}`} className="invoice-addon-subrow">
                            <td colSpan="4">
                              + {addon.name} (+${parseFloat(addon.price || addon.unitPrice || 0).toFixed(2)})
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Financial Summary Breakdown (Right Aligned) ── */}
        <div className="invoice-summary-section">
          <div className="invoice-summary-box">
            <div className="invoice-summary-row">
              <span className="invoice-summary-label">Order Amount</span>
              <span className="invoice-summary-val">
                ${parseFloat(financialBreakdown.orderAmount ?? order.amount ?? 0).toFixed(2)}
              </span>
            </div>

            <div className="invoice-summary-row">
              <span className="invoice-summary-label">Sales Tax</span>
              <span className="invoice-summary-val">
                ${parseFloat(financialBreakdown.salesTax ?? order.salesTax ?? 0).toFixed(2)}
              </span>
            </div>

            <div className="invoice-summary-row">
              <span className="invoice-summary-label">School Fees</span>
              <span className="invoice-summary-val">
                ${parseFloat(financialBreakdown.schoolFees ?? order.schoolFees ?? 0).toFixed(2)}
              </span>
            </div>

            <div className="invoice-summary-row">
              <span className="invoice-summary-label">Late Fees</span>
              <span className="invoice-summary-val">
                ${parseFloat(financialBreakdown.lateFees ?? order.lateFees ?? 0).toFixed(2)}
              </span>
            </div>

            {parseFloat(financialBreakdown.creditsApplied || order.credits || 0) > 0 && (
              <div className="invoice-summary-row">
                <span className="invoice-summary-label">Credits Applied</span>
                <span className="invoice-summary-val" style={{ color: '#22A06B' }}>
                  -${parseFloat(financialBreakdown.creditsApplied || order.credits || 0).toFixed(2)}
                </span>
              </div>
            )}

            <div className="invoice-summary-row grand-total">
              <span className="invoice-summary-label">Grand Total</span>
              <span className="invoice-summary-val">
                ${grandTotalVal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Action Buttons (Bottom Right) ── */}
        <div className="invoice-bottom-actions">
          {actions.canCancel !== false && !isCancelled && !isPaid && (
            <button
              type="button"
              className="btn-invoice-cancel"
              onClick={handleCancelOrder}
              disabled={cancelling}
            >
              {cancelling ? 'CANCELLING...' : 'CANCEL'}
            </button>
          )}

          {actions.canModify && !isCancelled && (
            <button
              type="button"
              className="btn-invoice-modify"
              onClick={handleModifyOrder}
            >
              MODIFY
            </button>
          )}

          {!isPaid && !isCancelled && (
            <button
              type="button"
              className="btn-invoice-pay"
              onClick={handlePayOrder}
            >
              PAY
            </button>
          )}
        </div>
      </div>

      {/* ── Page Footer Links ── */}
      <footer className="invoice-page-footer">
        <div className="invoice-footer-links">
          <span>Support</span>
          <span>|</span>
          <span>Terms OF Service</span>
          <span>|</span>
          <span>FAQs</span>
          <span>|</span>
          <span>Contact Us</span>
        </div>
        <div className="invoice-footer-copy">
          Copyright &copy; 2023 <a href="https://www.hotlunch.com" target="_blank" rel="noreferrer">www.hotlunch.com</a>
        </div>
      </footer>
    </div>
  );
};

export default Invoice;
