import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  getCartApi,
  calculateTotalApi,
  validateOrdersApi,
  checkoutApi,
  getChildrenApi,
  topupCreditApi,
  deleteCartItemApi,
  getPaymentGatewaysApi,
  getCreditBalanceApi,
  getSavedCardsApi,
} from '../../services/api';
import { ShimmerCart } from '../../components/Shimmer';
import { exportInvoice } from '../../utils/invoiceGenerator';

const Checkout = ({ availableFunds = 0, setAvailableFunds, setAmountOwed, refreshCart, refreshUserData }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [childrenList, setChildrenList] = useState([]);
  const [orders, setOrders] = useState([]);
  const [expandedOrderIds, setExpandedOrderIds] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  // Available Gateways and Credits state
  const [gateways, setGateways] = useState([]);
  const [loadingGateways, setLoadingGateways] = useState(true);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [localCredits, setLocalCredits] = useState(null);

  // Saved cards & card credits toggle
  const [savedCards, setSavedCards] = useState([]);
  const [selectedSavedCardId, setSelectedSavedCardId] = useState('new');
  const [useCreditsForCard, setUseCreditsForCard] = useState(false);

  // Direct card details state (for card gateways)
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expMonth: '',
    expYear: '',
    cvv: '',
    nameOnCard: '',
    billingZip: '',
  });
  const [saveCard, setSaveCard] = useState(false);

  // Helper formatting for card number
  const formatCardNumber = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 19);
    return digits.replace(/(\d{4})/g, '$1 ').trim();
  };

  // Helper detection for card brand
  const getCardBrand = (num) => {
    const clean = String(num || '').replace(/\D/g, '');
    if (/^4/.test(clean)) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard';
    if (/^3[47]/.test(clean)) return 'Amex';
    if (/^6(?:011|5)/.test(clean)) return 'Discover';
    return '';
  };

  // Success receipt modal
  const [showSuccess, setShowSuccess] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // Quick Top-up Modal
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, order: null });
  const [deleting, setDeleting] = useState(false);

  // Pre-checkout validation state
  const [invalidOrderIds, setInvalidOrderIds] = useState([]);
  const [validationModal, setValidationModal] = useState({ isOpen: false, message: '', invalidOrders: [] });
  const [removingInvalid, setRemovingInvalid] = useState(false);

  // Validate active orders against deadlines, past dates & limits
  const runPreCheckoutValidation = async (activeOrderIds) => {
    try {
      const res = await validateOrdersApi({ orderIds: activeOrderIds });
      if (res && (res.valid === false || res.status === 'failure' || (Array.isArray(res.invalidOrders) && res.invalidOrders.length > 0))) {
        const invIds = (res.invalidOrders || []).map(o => o.orderId).filter(Boolean);
        setInvalidOrderIds([...new Set(invIds)]);
        return {
          valid: false,
          message: res.message || 'One or more items or orders could not be validated for checkout.',
          invalidOrders: res.invalidOrders || [],
        };
      }
      setInvalidOrderIds([]);
      return { valid: true };
    } catch (err) {
      const errData = err.response?.data;
      if (errData && (errData.valid === false || errData.status === 'failure' || errData.invalidOrders)) {
        const invIds = (errData.invalidOrders || []).map(o => o.orderId).filter(Boolean);
        setInvalidOrderIds([...new Set(invIds)]);
        return {
          valid: false,
          message: errData.message || 'One or more items or orders could not be validated for checkout.',
          invalidOrders: errData.invalidOrders || [],
        };
      }
      return { valid: true };
    }
  };

  const handleRemoveInvalidOrders = async () => {
    const idsToRemove = validationModal.invalidOrders && validationModal.invalidOrders.length > 0
      ? [...new Set(validationModal.invalidOrders.map(o => o.orderId).filter(Boolean))]
      : invalidOrderIds;

    if (idsToRemove.length === 0) {
      setValidationModal({ isOpen: false, message: '', invalidOrders: [] });
      return;
    }

    setRemovingInvalid(true);
    try {
      await Promise.allSettled(idsToRemove.map(id => deleteCartItemApi(id)));
      toast.success(`${idsToRemove.length === 1 ? 'Expired order' : 'Expired orders'} removed from cart.`);
      setValidationModal({ isOpen: false, message: '', invalidOrders: [] });
      setInvalidOrderIds([]);
      if (refreshCart) refreshCart();
      await loadCartOrders();
    } catch (err) {
      console.error('Error removing invalid orders:', err);
      toast.error('Failed to remove expired orders.');
    } finally {
      setRemovingInvalid(false);
    }
  };

  // Fetch available payment gateways, saved cards, and credit balance
  const fetchGatewaysAndCredits = async (targetCampusId) => {
    setLoadingGateways(true);
    try {
      const [gatewaysRes, creditRes, savedCardsRes] = await Promise.allSettled([
        getPaymentGatewaysApi(targetCampusId),
        getCreditBalanceApi(),
        getSavedCardsApi(),
      ]);

      let foundCredits = null;

      // Check credit balance response
      if (creditRes.status === 'fulfilled' && creditRes.value) {
        const cb = creditRes.value;
        const bal = cb.availableFunds ?? cb.balance ?? cb.userCredit ?? cb.data?.availableFunds ?? cb.data?.balance ?? cb.data?.userCredit;
        if (bal !== undefined && bal !== null) {
          const parsed = parseFloat(String(bal).replace(/[^0-9.-]+/g, ''));
          if (!isNaN(parsed)) foundCredits = parsed;
        }
      }

      // Check gateways response
      let rawGateways = [];
      if (gatewaysRes.status === 'fulfilled' && gatewaysRes.value) {
        const gwData = gatewaysRes.value;
        const gwCredit = gwData.userCredit ?? gwData.availableCredits ?? gwData.data?.userCredit ?? gwData.data?.availableCredits;
        if (gwCredit !== undefined && gwCredit !== null && foundCredits === null) {
          const parsed = parseFloat(String(gwCredit).replace(/[^0-9.-]+/g, ''));
          if (!isNaN(parsed)) foundCredits = parsed;
        }

        if (Array.isArray(gwData)) {
          rawGateways = gwData;
        } else if (Array.isArray(gwData.data)) {
          rawGateways = gwData.data;
        } else if (Array.isArray(gwData.gateways)) {
          rawGateways = gwData.gateways;
        } else if (gwData.data && Array.isArray(gwData.data.gateways)) {
          rawGateways = gwData.data.gateways;
        } else if (gwData.data && Array.isArray(gwData.data.items)) {
          rawGateways = gwData.data.items;
        }
      }

      // Check saved cards response
      if (savedCardsRes.status === 'fulfilled' && savedCardsRes.value) {
        const scData = savedCardsRes.value;
        let scList = [];
        if (Array.isArray(scData)) {
          scList = scData;
        } else if (Array.isArray(scData.data)) {
          scList = scData.data;
        } else if (Array.isArray(scData.cards)) {
          scList = scData.cards;
        } else if (scData.data && Array.isArray(scData.data.cards)) {
          scList = scData.data.cards;
        }
        setSavedCards(scList);
        if (scList.length > 0 && (scList[0].id || scList[0].savedCardId)) {
          setSelectedSavedCardId(scList[0].id || scList[0].savedCardId);
        }
      }

      if (foundCredits !== null) {
        setLocalCredits(foundCredits);
        if (setAvailableFunds) setAvailableFunds(foundCredits);
      }

      // Normalize gateways list
      const normalized = rawGateways.map((gw, idx) => {
        const id = gw.id ?? gw.pgId ?? gw.gatewayId ?? (idx + 1);
        const rawName = String(gw.name || gw.title || gw.pgTitle || gw.gatewayName || '').trim();
        const lowerName = rawName.toLowerCase();
        const isWallet = id === 7 || lowerName.includes('wallet') || lowerName.includes('credit');
        const isPayPal = id === 8 || lowerName.includes('paypal');
        const isCard = id === 4 || id === 14 || id === 11 || lowerName.includes('auth') || lowerName.includes('card') || lowerName.includes('clover');

        let friendlyName = rawName;
        let icon = 'lni lni-credit-cards';
        let methodType = 'card';

        if (isWallet) {
          friendlyName = 'Use Available Credit';
          icon = 'lni lni-wallet';
          methodType = 'credits';
        } else if (isPayPal) {
          friendlyName = rawName || 'PayPal Express';
          icon = 'lni lni-paypal';
          methodType = 'paypal';
        } else if (id === 4 || lowerName.includes('auth')) {
          friendlyName = rawName || 'Authorize.Net (Credit Card)';
          icon = 'lni lni-credit-cards';
          methodType = 'card';
        } else if (id === 14 || lowerName.includes('cardconnect')) {
          friendlyName = rawName || 'CardConnect (Credit Card)';
          icon = 'lni lni-credit-cards';
          methodType = 'card';
        } else if (id === 11 || lowerName.includes('clover')) {
          friendlyName = rawName || 'Clover (Credit Card)';
          icon = 'lni lni-credit-cards';
          methodType = 'card';
        } else if (!friendlyName) {
          friendlyName = `Gateway #${id}`;
        }

        const coFeeEnabled = Boolean(gw.coFeeEnabled || gw.feeEnabled);
        const coFeeType = gw.coFeeType !== undefined ? parseInt(gw.coFeeType, 10) : 1;
        const coFee = parseFloat(gw.coFee || gw.fee || 0);

        return {
          id,
          name: friendlyName,
          rawName,
          isWallet,
          isPayPal,
          isCard,
          methodType,
          icon,
          coFeeEnabled,
          coFeeType,
          coFee,
          supportsSavedCards: Boolean(gw.supportsSavedCards),
          raw: gw,
        };
      });

      // Ensure 'Use Available Credit' is always included in the list
      const hasWallet = normalized.some(g => g.isWallet);
      const fullList = hasWallet ? normalized : [
        {
          id: 7,
          name: 'Use Available Credit',
          rawName: 'Wallet Credits',
          isWallet: true,
          isPayPal: false,
          isCard: false,
          methodType: 'credits',
          icon: 'lni lni-wallet',
          coFeeEnabled: false,
          coFeeType: 0,
          coFee: 0,
          supportsSavedCards: false,
          raw: {},
        },
        ...normalized,
      ];

      setGateways(fullList);

      setSelectedGateway(prev => {
        if (prev && fullList.some(g => g.id === prev.id)) return prev;
        const walletGw = fullList.find(g => g.isWallet);
        return walletGw || fullList[0] || null;
      });
    } catch (err) {
      console.error('Error fetching gateways and credit balance:', err);
      const fallback = [
        {
          id: 7,
          name: 'Use Available Credit',
          rawName: 'Wallet Credits',
          isWallet: true,
          isPayPal: false,
          isCard: false,
          methodType: 'credits',
          icon: 'lni lni-wallet',
          coFeeEnabled: false,
          coFeeType: 0,
          coFee: 0,
          supportsSavedCards: false,
          raw: {},
        },
      ];
      setGateways(fallback);
      setSelectedGateway(fallback[0]);
    } finally {
      setLoadingGateways(false);
    }
  };

  // Initial gateway discovery
  useEffect(() => {
    fetchGatewaysAndCredits();
  }, []);

  // Load children for real student name resolution
  useEffect(() => {
    getChildrenApi()
      .then(res => {
        if (res && Array.isArray(res.data)) {
          setChildrenList(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const resolveChildName = (childId, fallbackName) => {
    const found = (childrenList || []).find(c => c && String(c.id) === String(childId));
    if (found) {
      return found.fullName || `${found.firstName || ''} ${found.lastName || ''}`.trim() || found.name || 'Student';
    }
    if (fallbackName && !String(fallbackName).startsWith('Child #')) {
      return fallbackName;
    }
    return fallbackName || 'Student';
  };

  /* ── Load Cart Orders ── */
  const loadCartOrders = async () => {
    setLoading(true);
    try {
      const cartRes = await getCartApi();
      if (cartRes && cartRes.status === 'success' && Array.isArray(cartRes.data) && cartRes.data.length > 0) {
        const rawGroups = cartRes.data;
        const stateOrderIds = location.state?.orderIds && Array.isArray(location.state.orderIds) && location.state.orderIds.length > 0
          ? location.state.orderIds.map(id => parseInt(id, 10))
          : null;

        const filteredGroups = stateOrderIds
          ? rawGroups.filter(g => g.orderId && stateOrderIds.includes(parseInt(g.orderId, 10)))
          : rawGroups;

        if (filteredGroups.length === 0) {
          setOrders([]);
          setSummary(null);
          return;
        }

        const mappedOrders = filteredGroups.map((g, idx) => {
          const oId = g.orderId || g.id || (idx + 1);
          const cName = resolveChildName(g.childId || g.typeId, g.childName || g.studentName);

          let dateStr = '';
          if (g.createdDate) {
            try {
              const d = new Date(g.createdDate);
              dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            } catch {
              dateStr = String(g.createdDate);
            }
          } else {
            dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          }

          let dateSections = [];
          if (Array.isArray(g.dates) && g.dates.length > 0) {
            dateSections = g.dates.map(ds => ({
              date: ds.displayDate || ds.date || 'Meal Date',
              items: (ds.items || []).flatMap(it => {
                const mainItem = {
                  name: (it.name || it.itemName || 'Meal Item').toUpperCase(),
                  unitPrice: parseFloat(it.price || it.unitPrice || 0),
                  quantity: parseInt(it.quantity, 10) || 1,
                  total: parseFloat(it.total ?? (parseFloat(it.price || 0) * (parseInt(it.quantity, 10) || 1)))
                };
                const addonItems = Array.isArray(it.addons) ? it.addons.map(ad => ({
                  name: `+ ${ad.name || ad.itemName || 'Addon'}`.toUpperCase(),
                  unitPrice: parseFloat(ad.price || ad.unitPrice || 0),
                  quantity: parseInt(ad.quantity, 10) || 1,
                  total: parseFloat(ad.total ?? (parseFloat(ad.price || 0) * (parseInt(ad.quantity, 10) || 1)))
                })) : [];
                return [mainItem, ...addonItems];
              })
            }));
          } else if (Array.isArray(g.items) && g.items.length > 0) {
            const groupedByDate = {};
            g.items.forEach(it => {
              const dKey = it.orderDate || it.date || 'Meal Date';
              if (!groupedByDate[dKey]) groupedByDate[dKey] = [];
              const mainQty = parseInt(it.quantity, 10) || 1;
              const mainPrice = parseFloat(it.price || 0);
              groupedByDate[dKey].push({
                name: (it.name || it.itemName || 'Meal Item').toUpperCase(),
                unitPrice: mainPrice,
                quantity: mainQty,
                total: parseFloat(it.total ?? (mainPrice * mainQty))
              });
              if (Array.isArray(it.addons)) {
                it.addons.forEach(ad => {
                  const adQty = parseInt(ad.quantity, 10) || 1;
                  const adPrice = parseFloat(ad.price || 0);
                  groupedByDate[dKey].push({
                    name: `+ ${ad.name || ad.itemName || 'Addon'}`.toUpperCase(),
                    unitPrice: adPrice,
                    quantity: adQty,
                    total: parseFloat(ad.total ?? (adPrice * adQty))
                  });
                });
              }
            });
            dateSections = Object.entries(groupedByDate).map(([dt, its]) => ({
              date: dt,
              items: its
            }));
          }

          const computedItemsTotal = dateSections.reduce((sum, ds) => 
            sum + ds.items.reduce((iSum, it) => iSum + (it.total || 0), 0), 0
          );
          const oSubtotal = parseFloat(g.amount) > 0 ? parseFloat(g.amount) : computedItemsTotal;
          const oTax = parseFloat(g.salesTax ?? g.tax ?? 0);
          const oSchoolFee = parseFloat(g.schoolFees ?? g.schoolFee ?? 0);
          const oLateFee = parseFloat(g.lateFees ?? g.lateFee ?? 0);
          const oGrandTotal = parseFloat((oSubtotal + oTax + oSchoolFee + oLateFee).toFixed(2));

          return {
            orderId: oId,
            orderNumber: `#${oId}`,
            createdDate: dateStr,
            childName: cName,
            amount: oGrandTotal,
            dates: dateSections,
            orderAmount: oSubtotal,
            salesTax: oTax,
            schoolFees: oSchoolFee,
            lateFees: oLateFee,
            grandTotal: oGrandTotal
          };
        });

        setOrders(mappedOrders);
        if (mappedOrders.length > 0) {
          setExpandedOrderIds([mappedOrders[0].orderId]);
        }

        const validIds = mappedOrders.map(o => o.orderId).filter(id => typeof id === 'number' || (typeof id === 'string' && !id.startsWith('local_')));
        if (validIds.length > 0) {
          try {
            const useCred = selectedGateway ? (selectedGateway.isWallet ? true : useCreditsForCard) : true;
            const calcRes = await calculateTotalApi({
              orderIds: validIds,
              useCredits: useCred,
              gateway: selectedGateway?.isWallet ? undefined : selectedGateway?.id,
            });
            if (calcRes && calcRes.status === 'success') {
              setSummary(calcRes);
            }
          } catch (calcErr) {
            console.error('Error calculating total:', calcErr);
          }
          // Validate orders proactively to highlight expired dates/items immediately
          runPreCheckoutValidation(validIds);
        }
      } else {
        setOrders([]);
        setSummary(null);
      }
    } catch (err) {
      console.error('Cart fetch notice for checkout:', err);
      setOrders([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCartOrders();
  }, [location.state]);

  const toggleExpandOrder = (id) => {
    setExpandedOrderIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectGateway = async (gw) => {
    setSelectedGateway(gw);
    const validIds = orders
      .map(o => o.orderId)
      .filter(id => typeof id === 'number' || (typeof id === 'string' && !id.startsWith('local_')));
    if (validIds.length > 0) {
      try {
        const useCred = gw.isWallet ? true : useCreditsForCard;
        const calcRes = await calculateTotalApi({
          orderIds: validIds,
          useCredits: useCred,
          gateway: gw.isWallet ? undefined : gw.id,
        });
        if (calcRes && calcRes.status === 'success') {
          setSummary(calcRes);
        }
      } catch (calcErr) {
        console.error('Error recalculating total for gateway:', calcErr);
      }
    }
  };

  const handleToggleUseCreditsForCard = async (shouldUseCredits) => {
    setUseCreditsForCard(shouldUseCredits);
    const validIds = orders
      .map(o => o.orderId)
      .filter(id => typeof id === 'number' || (typeof id === 'string' && !id.startsWith('local_')));
    if (validIds.length > 0 && selectedGateway) {
      try {
        const calcRes = await calculateTotalApi({
          orderIds: validIds,
          useCredits: shouldUseCredits,
          gateway: selectedGateway.isWallet ? undefined : selectedGateway.id,
        });
        if (calcRes && calcRes.status === 'success') {
          setSummary(calcRes);
        }
      } catch (calcErr) {
        console.error('Error recalculating total for credits toggle:', calcErr);
      }
    }
  };

  const promptDeleteOrder = (order) => {
    setDeleteModal({
      isOpen: true,
      order,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.order) return;
    const orderId = deleteModal.order.orderId;
    setDeleting(true);
    try {
      await deleteCartItemApi(orderId);
      toast.success('Order removed from cart.');
      const remainingOrders = orders.filter(o => o.orderId !== orderId);
      setOrders(remainingOrders);
      if (refreshCart) refreshCart();
      const validIds = remainingOrders.map(o => o.orderId).filter(id => typeof id === 'number' || (typeof id === 'string' && !id.startsWith('local_')));
      if (validIds.length > 0) {
        try {
          const useCred = selectedGateway ? (selectedGateway.isWallet ? true : useCreditsForCard) : true;
          const calcRes = await calculateTotalApi({
            orderIds: validIds,
            useCredits: useCred,
            gateway: selectedGateway?.isWallet ? undefined : selectedGateway?.id,
          });
          if (calcRes && calcRes.status === 'success') {
            setSummary(calcRes);
          }
        } catch (calcErr) {
          console.error('Error recalculating total after delete:', calcErr);
        }
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.error('Delete order error:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail?.message || 'Could not remove order from cart.';
      toast.error(errMsg);
      const remainingOrders = orders.filter(o => o.orderId !== orderId);
      setOrders(remainingOrders);
      if (refreshCart) refreshCart();
    } finally {
      setDeleting(false);
      setDeleteModal({ isOpen: false, order: null });
    }
  };

  const handleDownloadInvoice = async (order) => {
    try {
      const cleanId = String(order.orderNumber || order.orderId || order.id || 'receipt').replace(/^#/, '');
      await exportInvoice(order, { download: true, print: false });
      toast.success(`Invoice #${cleanId} downloaded as PDF!`);
    } catch (err) {
      console.error('Error generating invoice from checkout:', err);
      const targetId = order.orderNumber || order.orderId || order.id || order.rawId;
      if (targetId) {
        navigate(`/myorders/${targetId}`, { state: { orderId: targetId, order } });
      } else {
        window.print();
      }
    }
  };

  /* ── Calculations ── */
  const dueAmount = summary 
    ? parseFloat(summary.subtotal ?? 0)
    : orders.reduce((acc, o) => acc + (parseFloat(o.orderAmount) || 0), 0);

  const salesTax = summary
    ? parseFloat(summary.salesTax ?? 0)
    : orders.reduce((acc, o) => acc + (parseFloat(o.salesTax) || 0), 0);

  const schoolFees = summary
    ? parseFloat(summary.schoolFees ?? 0)
    : orders.reduce((acc, o) => acc + (parseFloat(o.schoolFees) || 0), 0);

  const convenienceFee = summary
    ? parseFloat(summary.convenienceFee ?? 0)
    : 0.00;

  const totalAmount = summary
    ? parseFloat(summary.total ?? (dueAmount + salesTax + schoolFees + convenienceFee))
    : (dueAmount + salesTax + schoolFees + convenienceFee);

  const avlCredits = summary?.availableCredits !== undefined
    ? parseFloat(summary.availableCredits)
    : (localCredits !== null ? localCredits : parseFloat(availableFunds || 0));

  const appliedCredits = summary?.creditsApplied !== undefined
    ? parseFloat(summary.creditsApplied)
    : Math.min(totalAmount, avlCredits);

  const amountToPay = summary?.amountToPay !== undefined
    ? parseFloat(summary.amountToPay)
    : Math.max(0, totalAmount - appliedCredits);

  const deficit = Math.max(0, totalAmount - avlCredits);

  /* ── Proceed with Checkout ── */
  const handleProceed = async () => {
    const activeOrderIds = orders.map(o => o.orderId).filter(Boolean);
    if (activeOrderIds.length === 0) {
      toast.warn('No orders selected for checkout.');
      return;
    }

    setPaying(true);
    try {
      const valResult = await runPreCheckoutValidation(activeOrderIds);
      if (!valResult.valid) {
        setValidationModal({
          isOpen: true,
          message: valResult.message,
          invalidOrders: valResult.invalidOrders,
        });
        toast.error(valResult.message || 'Validation error: some meal cutoffs have passed.');
        setPaying(false);
        return;
      }

      const isWalletChoice = selectedGateway?.isWallet || selectedGateway?.id === 7;
      const isCardChoice = selectedGateway?.isCard || selectedGateway?.id === 4 || selectedGateway?.id === 14 || selectedGateway?.id === 11;
      const isPayPalChoice = selectedGateway?.isPayPal || selectedGateway?.id === 8;

      // Case 1: Wallet credits chosen
      if (isWalletChoice) {
        if (amountToPay > 0 || avlCredits < totalAmount) {
          toast.warn(`Insufficient wallet credits. Please add funds to cover $${amountToPay.toFixed(2)}.`);
          setShowTopupModal(true);
          setTopupAmount(amountToPay.toFixed(2));
          setPaying(false);
          return;
        }

        const checkRes = await checkoutApi({
          orderIds: activeOrderIds,
          paymentMethod: 'credits',
          useCredits: true,
          notes: 'Paid using available wallet credits',
        });

        const isSuccess = checkRes &&
          checkRes.status !== 'failure' &&
          checkRes.status !== 'error' &&
          (checkRes.status === 'success' || checkRes.paid === true || checkRes.paid === 1);

        if (isSuccess) {
          setReceipt(checkRes);
          setShowSuccess(true);
          if (refreshCart) refreshCart();
          if (refreshUserData) refreshUserData();
          if (setAmountOwed) setAmountOwed(0);
          if (setAvailableFunds && checkRes.remainingCredits !== undefined) {
            setAvailableFunds(parseFloat(checkRes.remainingCredits));
            setLocalCredits(parseFloat(checkRes.remainingCredits));
          }
          toast.success('Orders placed and paid successfully with wallet credits!');
        } else {
          toast.error(checkRes?.message || checkRes?.detail?.message || 'Checkout failed. Please try again.');
        }
        return;
      }

      // Case 2: Card gateway chosen (Authorize.Net, CardConnect, Clover, etc.)
      if (isCardChoice) {
        // If credits cover 100% and user checked apply credits
        if (useCreditsForCard && amountToPay <= 0) {
          toast.info('Your order is 100% covered by credits. Please select "Use Available Credit" to checkout with credits, or uncheck "Apply Available Wallet Credits" to pay with card.');
          setPaying(false);
          return;
        }

        let cardPayload = null;

        // Check if saved card is selected
        if (selectedSavedCardId && selectedSavedCardId !== 'new') {
          cardPayload = {
            orderIds: activeOrderIds,
            paymentMethod: 'saved_card',
            gateway: selectedGateway.id,
            savedCardId: selectedSavedCardId,
            useCredits: Boolean(useCreditsForCard),
          };
        } else {
          // Validate new card input fields
          const cleanName = (cardDetails.nameOnCard || '').trim();
          if (!cleanName) {
            toast.warn('Please enter the cardholder name.');
            setPaying(false);
            return;
          }

          const cleanCard = (cardDetails.cardNumber || '').replace(/\D/g, '');
          if (!cleanCard || cleanCard.length < 13 || cleanCard.length > 19) {
            toast.warn('Please enter a valid card number (13-19 digits).');
            setPaying(false);
            return;
          }

          const cleanMonth = (cardDetails.expMonth || '').trim();
          if (!cleanMonth || isNaN(parseInt(cleanMonth, 10)) || parseInt(cleanMonth, 10) < 1 || parseInt(cleanMonth, 10) > 12) {
            toast.warn('Please select a valid expiration month (01-12).');
            setPaying(false);
            return;
          }

          const cleanYear = (cardDetails.expYear || '').trim();
          if (!cleanYear || cleanYear.length < 2) {
            toast.warn('Please select a valid expiration year.');
            setPaying(false);
            return;
          }

          const cleanCvv = (cardDetails.cvv || '').trim();
          if (!cleanCvv || cleanCvv.length < 3 || cleanCvv.length > 4) {
            toast.warn('Please enter a valid CVV (3 or 4 digits).');
            setPaying(false);
            return;
          }

          const cleanZip = (cardDetails.billingZip || '').trim();
          if (!cleanZip) {
            toast.warn('Please enter your billing ZIP code.');
            setPaying(false);
            return;
          }

          const formattedYear = cleanYear.length === 2 ? `20${cleanYear}` : cleanYear;

          cardPayload = {
            orderIds: activeOrderIds,
            paymentMethod: 'card',
            gateway: selectedGateway.id,
            useCredits: Boolean(useCreditsForCard),
            card: {
              cardNumber: cleanCard,
              expMonth: cleanMonth.padStart(2, '0'),
              expYear: formattedYear,
              cvv: cleanCvv,
              nameOnCard: cleanName,
              billingZip: cleanZip,
            },
            saveCard: Boolean(saveCard),
          };
        }

        const checkRes = await checkoutApi(cardPayload);

        const isSuccess = checkRes &&
          checkRes.status !== 'failure' &&
          checkRes.status !== 'error' &&
          (checkRes.status === 'success' || checkRes.paid === true || checkRes.paid === 1 || Boolean(checkRes.transactionId));

        if (isSuccess) {
          setReceipt(checkRes);
          setShowSuccess(true);
          if (refreshCart) refreshCart();
          if (refreshUserData) refreshUserData();
          toast.success('Orders placed and card charged successfully!');
        } else {
          toast.error(checkRes?.message || checkRes?.detail?.message || 'Payment processing failed. Please verify your card details.');
        }
        return;
      }

      // Case 3: PayPal chosen
      if (isPayPalChoice) {
        const checkRes = await checkoutApi({
          orderIds: activeOrderIds,
          paymentMethod: 'paypal',
          gateway: selectedGateway.id,
          useCredits: Boolean(useCreditsForCard),
        });

        if (checkRes?.redirectUrl) {
          window.location.href = checkRes.redirectUrl;
          return;
        }

        const isSuccess = checkRes &&
          checkRes.status !== 'failure' &&
          checkRes.status !== 'error' &&
          (checkRes.status === 'success' || checkRes.paid === true || checkRes.paid === 1);

        if (isSuccess) {
          setReceipt(checkRes);
          setShowSuccess(true);
          if (refreshCart) refreshCart();
          if (refreshUserData) refreshUserData();
          toast.success('Orders placed successfully!');
        } else {
          toast.error(checkRes?.message || checkRes?.detail?.message || 'PayPal checkout failed.');
        }
        return;
      }

      // Default fallback
      const checkRes = await checkoutApi({
        orderIds: activeOrderIds,
        paymentMethod: selectedGateway?.methodType || 'credits',
        gateway: selectedGateway?.id,
        useCredits: true,
      });

      const isSuccess = checkRes &&
        checkRes.status !== 'failure' &&
        checkRes.status !== 'error' &&
        (checkRes.status === 'success' || checkRes.paid === true || checkRes.paid === 1);

      if (isSuccess) {
        setReceipt(checkRes);
        setShowSuccess(true);
        if (refreshCart) refreshCart();
        if (refreshUserData) refreshUserData();
        toast.success('Orders placed successfully!');
      } else {
        toast.error(checkRes?.message || checkRes?.detail?.message || 'Payment processing failed.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail?.message || 'Payment processing failed. Please try again.';
      toast.error(errMsg);
    } finally {
      setPaying(false);
    }
  };

  /* ── Quick Top-up Handler ── */
  const handleTopupSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(topupAmount);
    if (isNaN(amt) || amt <= 0) return toast.warn('Enter a valid amount.');

    setTopupLoading(true);
    try {
      const res = await topupCreditApi({ amount: amt, isDraft: 0 });
      if (res && (res.status === 'success' || res.newBalance !== undefined)) {
        toast.success(`Successfully added $${amt.toFixed(2)} to your wallet!`);
        setShowTopupModal(false);
        setTopupAmount('');
        if (refreshUserData) refreshUserData();
        if (setAvailableFunds && res.newBalance !== undefined) {
          setAvailableFunds(parseFloat(res.newBalance));
        }
        setLocalCredits(parseFloat(res.newBalance || (avlCredits + amt)));
        await loadCartOrders();
        await fetchGatewaysAndCredits();
      } else {
        toast.error(res?.message || 'Could not complete top up.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to top up wallet.');
    } finally {
      setTopupLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ marginTop: 24 }}>
        <ShimmerCart />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="checkout-empty-wrap" style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', margin: '24px 0', border: '1px solid #E2E8F0' }}>
        <i className="lni lni-cart" style={{ fontSize: 56, color: '#006D77', display: 'block', marginBottom: 16 }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Your Checkout Cart is Empty</h2>
        <p style={{ color: '#64748B', fontSize: 15, maxWidth: 460, margin: '0 auto 24px' }}>
          There are no pending meal orders selected for checkout. Please browse our daily menus to select meals for your children.
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigate('/dashboard')}
          style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600, borderRadius: 8, cursor: 'pointer' }}
        >
          Browse Menus
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-page-container">
      {/* ── Left Column: Orders List Stack ── */}
      <div className="checkout-orders-stack">
        {orders.map((order, idx) => {
          const isExpanded = expandedOrderIds.includes(order.orderId);
          const isInvalid = invalidOrderIds.includes(order.orderId);

          return (
            <div className={`checkout-order-card ${isInvalid ? 'is-invalid' : ''}`} key={order.orderId || idx}>
              {/* Order Header Bar */}
              <div
                className="checkout-order-header"
                onClick={() => toggleExpandOrder(order.orderId)}
              >
                <div className="checkout-order-meta-group">
                  <div className="checkout-order-badge-icon" style={isInvalid ? { background: '#FEE2E2', color: '#DC2626' } : {}}>
                    <i className={isInvalid ? 'lni lni-warning' : 'lni lni-calendar'} />
                  </div>

                  <span className="checkout-order-title" style={isInvalid ? { color: '#DC2626' } : {}}>
                    ORDER {order.orderNumber}
                  </span>

                  {isInvalid && (
                    <span className="checkout-badge-invalid">
                      <i className="lni lni-warning" /> Meal Date Passed
                    </span>
                  )}

                  <span className="checkout-order-pipe">|</span>

                  <div className="checkout-order-meta-item">
                    <i className="lni lni-calendar" />
                    <span>{order.createdDate}</span>
                  </div>

                  <span className="checkout-order-pipe">|</span>

                  <div className="checkout-order-meta-item">
                    <i className="lni lni-user" />
                    <span>{order.childName}</span>
                  </div>

                  <span className="checkout-order-pipe">|</span>

                  <div className="checkout-order-meta-item">
                    <i className="lni lni-dollar" />
                    <span>${order.amount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Top-Right Action Circles */}
                <div
                  className="checkout-order-actions"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="checkout-circle-btn teal"
                    onClick={() => handleDownloadInvoice(order)}
                    title="Download Invoice"
                  >
                    <i className="lni lni-download" />
                  </button>

                  <button
                    type="button"
                    className="checkout-circle-btn pink"
                    onClick={() => promptDeleteOrder(order)}
                    title="Delete Order from Cart"
                  >
                    <i className="lni lni-minus" />
                  </button>

                  <button
                    type="button"
                    className="checkout-circle-btn cyan"
                    onClick={() => toggleExpandOrder(order.orderId)}
                    title={isExpanded ? 'Collapse Details' : 'Expand Details'}
                  >
                    <i className="lni lni-eye" />
                  </button>
                </div>
              </div>

              {/* Expired Meal Date Alert Banner */}
              {isInvalid && (
                <div className="checkout-order-invalid-alert">
                  <span>
                    ⚠️ <strong>Validation Error:</strong> This order contains meal items for dates that have already passed. Please remove it from your cart to proceed.
                  </span>
                  <button
                    type="button"
                    className="btn-remove-invalid-order"
                    onClick={() => promptDeleteOrder(order)}
                  >
                    Remove Order #{order.orderId}
                  </button>
                </div>
              )}

              {/* Expanded Order Table Details */}
              {isExpanded && (
                <div className="checkout-order-expanded">
                  <table className="checkout-table">
                    <thead>
                      <tr className="checkout-table-header">
                        <th>ITEM DESCRIPTION</th>
                        <th className="text-right">UNIT PRICE</th>
                        <th className="text-center">QUANTITY</th>
                        <th className="text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.dates && order.dates.length > 0 ? (
                        order.dates.map((dSection, dIdx) => (
                          <React.Fragment key={dIdx}>
                            <tr className="checkout-date-row">
                              <td colSpan={4}>{dSection.date}</td>
                            </tr>
                            {dSection.items.map((it, itIdx) => (
                              <tr className="checkout-item-row" key={itIdx}>
                                <td>
                                  <span className="checkout-item-name">{it.name}</span>
                                </td>
                                <td className="text-right">${it.unitPrice.toFixed(2)}</td>
                                <td className="text-center">{it.quantity}</td>
                                <td className="text-right">${it.total.toFixed(2)}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      ) : (
                        <tr className="checkout-item-row">
                          <td colSpan={4} style={{ textAlign: 'center', color: '#94A3B8', padding: '16px' }}>
                            Standard School Lunch Meal Plan Included
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Subtotal & Breakdown Lines */}
                  <div className="checkout-order-summary-footer">
                    <div className="checkout-sub-row">
                      <span>Order Amount</span>
                      <span>${order.orderAmount.toFixed(2)}</span>
                    </div>
                    <div className="checkout-sub-row">
                      <span>Sales Tax</span>
                      <span>${order.salesTax.toFixed(2)}</span>
                    </div>
                    {order.schoolFees > 0 && (
                      <div className="checkout-sub-row">
                        <span>School Fees</span>
                        <span>${order.schoolFees.toFixed(2)}</span>
                      </div>
                    )}
                    {order.lateFees > 0 && (
                      <div className="checkout-sub-row">
                        <span>Late Fees</span>
                        <span>${order.lateFees.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="checkout-sub-row grand-total">
                      <span>Grand Total</span>
                      <span>${order.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Right Column: Payment & Transaction Details Card ── */}
      <div className="checkout-payment-card">
        {/* Teal Header Banner */}
        <div className="checkout-payment-header">
          PAYMENT
        </div>

        <div className="checkout-payment-body">
          {/* Available Wallet Credits Overview */}
          <div className="checkout-credits-summary-box">
            <div className="checkout-credits-icon-group">
              <div className="checkout-credits-icon-circle">
                <i className="lni lni-wallet" />
              </div>
              <div>
                <div className="checkout-credits-label">Available Wallet Credits</div>
                <div className="checkout-credits-amount">
                  ${avlCredits.toFixed(2)}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="checkout-credits-add-btn"
              onClick={() => {
                setShowTopupModal(true);
                setTopupAmount(deficit > 0 ? deficit.toFixed(2) : '20.00');
              }}
              title="Add funds to wallet"
            >
              <i className="lni lni-plus" /> Add Funds
            </button>
          </div>

          {/* Section 1: Choose a Payment Method */}
          <div className="checkout-section-title">
            <i className="lni lni-credit-cards" />
            <span>Choose a Payment Method</span>
          </div>

          {loadingGateways ? (
            <div style={{ padding: '16px 8px', textAlign: 'center', color: '#64748B', fontSize: 13, marginBottom: 16 }}>
              <span className="spinner-border spinner-border-sm" role="status" style={{ marginRight: 8, display: 'inline-block', width: 14, height: 14, border: '2px solid #006D77', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Loading available payment gateways...
            </div>
          ) : (
            <div className="checkout-gateways-container">
              {gateways.map((gw) => {
                const isSelected = selectedGateway?.id === gw.id;
                return (
                  <div
                    key={gw.id}
                    className={`checkout-gateway-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectGateway(gw)}
                  >
                    <div className="checkout-gateway-radio-col">
                      <input
                        type="radio"
                        name="paymentGateway"
                        id={`gw_${gw.id}`}
                        checked={isSelected}
                        onChange={() => handleSelectGateway(gw)}
                      />
                    </div>
                    <div className="checkout-gateway-content">
                      <div className="checkout-gateway-top-line">
                        <span className="checkout-gateway-title">
                          {gw.name}
                        </span>
                        {gw.isWallet ? (
                          <span className={`checkout-tag-credit ${avlCredits > 0 ? 'positive' : 'empty'}`}>
                            ${avlCredits.toFixed(2)} Available
                          </span>
                        ) : (
                          gw.coFeeEnabled && gw.coFee > 0 && (
                            <span className="checkout-tag-fee">
                              {gw.coFeeType === 1 ? `+${gw.coFee}% fee` : `+$${gw.coFee.toFixed(2)} fee`}
                            </span>
                          )
                        )}
                      </div>
                      <div className="checkout-gateway-subtitle">
                        {gw.isWallet ? (
                          avlCredits >= totalAmount ? (
                            <span style={{ color: '#059669', fontWeight: 500 }}>
                              ✓ 100% covered by credits • Instant checkout
                            </span>
                          ) : avlCredits > 0 ? (
                            <span style={{ color: '#D97706' }}>
                              Credits cover ${avlCredits.toFixed(2)} • Shortage: ${deficit.toFixed(2)}
                            </span>
                          ) : (
                            <span style={{ color: '#DC2626' }}>
                              $0.00 Available • Top-up needed or select card gateway
                            </span>
                          )
                        ) : gw.isPayPal ? (
                          'Fast & secure checkout via your PayPal account'
                        ) : (
                          'Pay securely using Credit / Debit Card'
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Insufficient credits warning when wallet credit is chosen */}
          {selectedGateway?.isWallet && deficit > 0 && (
            <div className="checkout-deficit-warning">
              <div>
                <strong>Credit Deficit: ${deficit.toFixed(2)}</strong>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#92400E' }}>
                  Available balance (${avlCredits.toFixed(2)}) is less than total due (${totalAmount.toFixed(2)}).
                </p>
              </div>
              <button
                type="button"
                className="checkout-quick-topup-btn"
                onClick={() => {
                  setShowTopupModal(true);
                  setTopupAmount(deficit.toFixed(2));
                }}
              >
                Top Up ${deficit.toFixed(2)}
              </button>
            </div>
          )}

          {/* Credits toggle for card payments */}
          {selectedGateway?.isCard && avlCredits > 0 && (
            <div className="checkout-credits-toggle-wrap">
              <label className="checkout-credits-toggle-label">
                <input
                  type="checkbox"
                  checked={useCreditsForCard}
                  onChange={e => handleToggleUseCreditsForCard(e.target.checked)}
                />
                <div>
                  <span className="checkout-toggle-title">Apply Available Wallet Credits</span>
                  <span className="checkout-toggle-desc">
                    Apply ${Math.min(avlCredits, totalAmount).toFixed(2)} from your wallet balance towards this card payment.
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* 100% credits notice if useCreditsForCard is checked and amountToPay is 0 */}
          {selectedGateway?.isCard && useCreditsForCard && amountToPay <= 0 && (
            <div className="checkout-card-notice-info">
              <i className="lni lni-information" />
              <div>
                <strong>Order 100% Covered by Credits</strong>
                <p>
                  Your available wallet credits cover this entire purchase. To pay with card, uncheck &quot;Apply Available Wallet Credits&quot;, or select <strong>&quot;Use Available Credit&quot;</strong> above to checkout directly with credits.
                </p>
              </div>
            </div>
          )}

          {/* Direct Card details input: ALWAYS shown when a card gateway is selected */}
          {selectedGateway?.isCard && (
            <div className="checkout-card-input-box">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                  Card Details ({selectedGateway.name})
                </div>
                {getCardBrand(cardDetails.cardNumber) && (
                  <span className="checkout-card-brand-badge">
                    <i className="lni lni-credit-cards" /> {getCardBrand(cardDetails.cardNumber)}
                  </span>
                )}
              </div>

              {/* Saved Cards Selection if user has saved cards */}
              {savedCards && savedCards.length > 0 && (
                <div className="checkout-saved-cards-wrap">
                  <label className="checkout-card-label">Payment Card</label>
                  {savedCards.map(sc => {
                    const scId = sc.id || sc.savedCardId;
                    const isScSelected = String(selectedSavedCardId) === String(scId);
                    const last4 = sc.last4 || sc.lastFour || sc.cardNumber?.slice(-4) || '••••';
                    const brand = sc.brand || sc.cardType || 'Card';
                    return (
                      <label
                        key={scId}
                        className={`checkout-saved-card-radio ${isScSelected ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="savedCardChoice"
                          checked={isScSelected}
                          onChange={() => setSelectedSavedCardId(scId)}
                        />
                        <span>
                          <strong>{brand}</strong> ending in <strong>{last4}</strong>
                          {sc.expMonth && sc.expYear ? ` (Exp: ${sc.expMonth}/${sc.expYear})` : ''}
                        </span>
                      </label>
                    );
                  })}
                  <label className={`checkout-saved-card-radio ${selectedSavedCardId === 'new' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="savedCardChoice"
                      checked={selectedSavedCardId === 'new'}
                      onChange={() => setSelectedSavedCardId('new')}
                    />
                    <span>Use a new credit or debit card</span>
                  </label>
                </div>
              )}

              {/* New Card Input Fields (shown if 'new' card selected or no saved cards) */}
              {(!savedCards || savedCards.length === 0 || selectedSavedCardId === 'new') && (
                <>
                  <div className="checkout-card-row">
                    <label className="checkout-card-label">Cardholder Name</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={cardDetails.nameOnCard}
                      onChange={e => setCardDetails(prev => ({ ...prev, nameOnCard: e.target.value }))}
                      className="checkout-card-input"
                    />
                  </div>

                  <div className="checkout-card-row">
                    <label className="checkout-card-label">Card Number</label>
                    <input
                      type="text"
                      maxLength="23"
                      placeholder="4032 0333 6023 1349"
                      value={cardDetails.cardNumber}
                      onChange={e => setCardDetails(prev => ({ ...prev, cardNumber: formatCardNumber(e.target.value) }))}
                      className="checkout-card-input"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: 8, marginBottom: 10 }}>
                    <div>
                      <label className="checkout-card-label">Month</label>
                      <select
                        value={cardDetails.expMonth}
                        onChange={e => setCardDetails(prev => ({ ...prev, expMonth: e.target.value }))}
                        className="checkout-card-input"
                        style={{ padding: '7px 8px' }}
                      >
                        <option value="">MM</option>
                        {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="checkout-card-label">Year</label>
                      <select
                        value={cardDetails.expYear}
                        onChange={e => setCardDetails(prev => ({ ...prev, expYear: e.target.value }))}
                        className="checkout-card-input"
                        style={{ padding: '7px 8px' }}
                      >
                        <option value="">YYYY</option>
                        {Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() + i)).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="checkout-card-label">CVV</label>
                      <input
                        type="password"
                        maxLength="4"
                        placeholder="123"
                        value={cardDetails.cvv}
                        onChange={e => setCardDetails(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                        className="checkout-card-input"
                      />
                    </div>

                    <div>
                      <label className="checkout-card-label">Billing ZIP</label>
                      <input
                        type="text"
                        maxLength="10"
                        placeholder="90210"
                        value={cardDetails.billingZip}
                        onChange={e => setCardDetails(prev => ({ ...prev, billingZip: e.target.value.replace(/[^\w\s-]/g, '').slice(0, 10) }))}
                        className="checkout-card-input"
                      />
                    </div>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#475569', marginTop: 8, cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={saveCard}
                      onChange={e => setSaveCard(e.target.checked)}
                      style={{ accentColor: '#006D77' }}
                    />
                    <span>Save card for future faster checkout</span>
                  </label>
                </>
              )}
            </div>
          )}

          {/* Section 2: Transaction Details */}
          <div className="checkout-section-title">
            <i className="lni lni-receipt" />
            <span>Transaction Details</span>
          </div>

          <div className="checkout-transaction-table">
            <div className="checkout-transaction-row plain">
              <span>Due Amount</span>
              <span>${dueAmount.toFixed(2)}</span>
            </div>

            <div className="checkout-transaction-row shaded">
              <span>Sales Tax</span>
              <span>${salesTax.toFixed(2)}</span>
            </div>

            {schoolFees > 0 && (
              <div className="checkout-transaction-row plain">
                <span>School Fees</span>
                <span>${schoolFees.toFixed(2)}</span>
              </div>
            )}

            <div className="checkout-transaction-row plain">
              <span>Avl. Credits</span>
              <span>${avlCredits.toFixed(2)}</span>
            </div>

            {appliedCredits > 0 && (
              <div className="checkout-transaction-row shaded">
                <span>Credits Applied</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>-${appliedCredits.toFixed(2)}</span>
              </div>
            )}

            <div className="checkout-transaction-row plain">
              <span>Total</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>

            <div className="checkout-transaction-row shaded">
              <span>Convenience: +</span>
              <span>${convenienceFee.toFixed(2)}</span>
            </div>

            <div className="checkout-transaction-row amount-to-pay">
              <span>Amount to Pay</span>
              <span className="pay-val">${amountToPay.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Button: PROCEED */}
          <div className="checkout-proceed-btn-wrapper">
            <button
              type="button"
              className="btn-checkout-proceed"
              onClick={handleProceed}
              disabled={paying}
            >
              {paying
                ? 'PROCESSING...'
                : (amountToPay > 0
                    ? `PAY $${amountToPay.toFixed(2)}`
                    : (selectedGateway?.isCard ? 'COMPLETE ORDER WITH CARD' : 'PAY WITH CREDITS'))}
            </button>
          </div>

          {/* Bottom Footnote Notice */}
          <p className="checkout-convenience-note">
            *NOTE: If you are paying more than one order, convenience fees if applicable, will be allocated across all orders being paid. This may cause a very minor variance in the actual charge.
          </p>
        </div>
      </div>

      {/* ── Quick Top Up Modal ── */}
      {showTopupModal && (
        <div className="modal-overlay" onClick={() => setShowTopupModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#006D77', marginBottom: 6 }}>
              Top Up Wallet Credits
            </h2>
            <p style={{ color: '#636363', fontSize: 13, marginBottom: 20 }}>
              Add funds directly to your parent account to complete your meal purchases instantly.
            </p>

            <form onSubmit={handleTopupSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  className="form-control"
                  placeholder="0.00"
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', fontSize: 16 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {deficit > 0 && (
                  <button
                    type="button"
                    className="btn-cancel"
                    style={{ fontSize: 12, padding: '4px 10px', borderColor: '#006D77', color: '#006D77', fontWeight: 600 }}
                    onClick={() => setTopupAmount(deficit.toFixed(2))}
                  >
                    Exact Needed (${deficit.toFixed(2)})
                  </button>
                )}
                {[25, 50, 100].map(v => (
                  <button
                    key={v}
                    type="button"
                    className="btn-cancel"
                    style={{ fontSize: 12, padding: '4px 12px' }}
                    onClick={() => setTopupAmount(v.toFixed(2))}
                  >
                    +${v}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowTopupModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={topupLoading}
                >
                  {topupLoading ? 'Adding...' : 'Add Funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Success Receipt Modal ── */}
      {showSuccess && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 460, textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#DEF7EC', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 32 }}>
              ✓
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1F2937', marginBottom: 8 }}>
              Payment Successful!
            </h2>
            <p style={{ color: '#636363', fontSize: 14, marginBottom: receipt?.transactionId ? 8 : 20 }}>
              Your order has been paid and confirmed.
            </p>
            {receipt?.transactionId && (
              <p style={{ fontSize: 12.5, color: '#64748B', marginBottom: 20 }}>
                Transaction ID: <strong>{receipt.transactionId}</strong>
              </p>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="btn-cancel"
                onClick={() => navigate('/myorders')}
              >
                View My Orders
              </button>
              <button
                className="btn-primary"
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Delete Confirmation Modal ── */}
      {deleteModal.isOpen && deleteModal.order && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteModal({ isOpen: false, order: null })}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                <i className="lni lni-trash-can" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1E293B' }}>
                  Remove Order #{deleteModal.order.orderId}?
                </h3>
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  Student: {deleteModal.order.childName}
                </span>
              </div>
            </div>

            <p style={{ color: '#64748B', fontSize: 13.5, lineHeight: 1.5, margin: '14px 0 20px' }}>
              Are you sure you want to remove this meal order of <strong>${deleteModal.order.grandTotal.toFixed(2)}</strong> from your checkout cart?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn-cancel"
                disabled={deleting}
                onClick={() => setDeleteModal({ isOpen: false, order: null })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={deleting}
                onClick={handleConfirmDelete}
                style={{ background: '#E54A4A', borderColor: '#E54A4A', color: '#fff' }}
              >
                {deleting ? 'Removing...' : 'Remove Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Validation Error Modal ── */}
      {validationModal.isOpen && (
        <div className="modal-overlay" onClick={() => !removingInvalid && setValidationModal({ isOpen: false, message: '', invalidOrders: [] })}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                <i className="lni lni-warning" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1E293B' }}>
                  Cart Validation Error
                </h3>
                <span style={{ fontSize: 13, color: '#64748B' }}>
                  Some items cannot be checked out
                </span>
              </div>
            </div>

            <p style={{ color: '#64748B', fontSize: 13.5, lineHeight: 1.5, margin: '14px 0 10px' }}>
              {validationModal.message || 'One or more items in your cart have passed their meal date or missed cutoff deadlines.'}
            </p>

            {validationModal.invalidOrders && validationModal.invalidOrders.length > 0 && (
              <div className="validation-modal-list">
                {validationModal.invalidOrders.map((inv, idx) => (
                  <div className="validation-item-row" key={idx}>
                    <div className="validation-item-header">
                      <i className="lni lni-calendar" />
                      <span>Order #{inv.orderId} • Date: {inv.orderDate || '--'}</span>
                    </div>
                    <div className="validation-item-reason">
                      {inv.reason || 'Meal date has already passed. Please remove this item from your cart.'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 20 }}>
              To proceed with checkout, please remove the expired order(s) from your cart. You can remove them automatically below:
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn-cancel"
                disabled={removingInvalid}
                onClick={() => setValidationModal({ isOpen: false, message: '', invalidOrders: [] })}
              >
                Review Cart
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={removingInvalid}
                onClick={handleRemoveInvalidOrders}
                style={{ background: '#DC2626', borderColor: '#DC2626', color: '#FFFFFF' }}
              >
                {removingInvalid ? 'Removing Expired...' : 'Remove Expired Orders'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
