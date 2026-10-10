import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  getDashboardSummaryApi, 
  getMenusApi, 
  getMenusForChildApi, 
  getMenuDetailApi,
  createOrderApi,
  getCartApi,
  getOrdersApi,
  getOrderDetailsApi,
  getOrderedDatesApi
} from '../../services/api';
import { ShimmerStats, ShimmerCards } from '../../components/Shimmer';
import AddonModal, { DEFAULT_ADDONS } from '../../components/AddonModal';

const AVATARS = ['#006D77', '#E29578', '#4A90D9', '#9B59B6', '#F4A261', '#2A9D8F'];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Helper to calculate week days dynamically starting from current date onwards
function getWeekDates(offset = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentDayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  let distToMonday;
  if (currentDayOfWeek === 6) {
    distToMonday = 2; // Saturday -> next Monday
  } else if (currentDayOfWeek === 0) {
    distToMonday = 1; // Sunday -> tomorrow Monday
  } else {
    distToMonday = 1 - currentDayOfWeek;
  }

  const monday = new Date(today);
  monday.setDate(today.getDate() + distToMonday + (offset * 7));

  const weekDays = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  days.forEach((dayName, idx) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + idx);
    dayDate.setHours(0, 0, 0, 0);

    const isPast = dayDate < today;
    const isToday = dayDate.getTime() === today.getTime();

    const monthStr = dayDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const dayNum = String(dayDate.getDate()).padStart(2, '0');
    const formattedDate = `${dayNum} ${monthStr}`;

    weekDays.push({
      dayName,
      dateObj: dayDate,
      formattedDate,
      isPast,
      isToday,
      fullDateStr: dayDate.toISOString().split('T')[0]
    });
  });

  return { weekDays, today, monday };
}

export function getWeekOffsetForDate(targetDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentDayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  let distToMonday;
  if (currentDayOfWeek === 6) {
    distToMonday = 2; // Saturday -> next Monday
  } else if (currentDayOfWeek === 0) {
    distToMonday = 1; // Sunday -> tomorrow Monday
  } else {
    distToMonday = 1 - currentDayOfWeek;
  }

  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() + distToMonday);
  currentMonday.setHours(0, 0, 0, 0);

  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const targetDayOfWeek = target.getDay();
  let targetDistToMonday;
  if (targetDayOfWeek === 6) {
    targetDistToMonday = 2;
  } else if (targetDayOfWeek === 0) {
    targetDistToMonday = 1;
  } else {
    targetDistToMonday = 1 - targetDayOfWeek;
  }

  const targetMonday = new Date(target);
  targetMonday.setDate(target.getDate() + targetDistToMonday);
  targetMonday.setHours(0, 0, 0, 0);

  const diffMs = targetMonday.getTime() - currentMonday.getTime();
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  return diffWeeks;
}

export function getMonthGridDays(baseDateOrString) {
  let date = new Date();
  if (baseDateOrString) {
    if (baseDateOrString instanceof Date && !isNaN(baseDateOrString)) {
      date = baseDateOrString;
    } else if (typeof baseDateOrString === 'string') {
      const trimmed = baseDateOrString.trim();
      const parsed = new Date(trimmed.includes('-') ? trimmed : `1 ${trimmed}`);
      if (!isNaN(parsed.getTime())) {
        date = parsed;
      }
    }
  }

  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const firstDow = firstDay.getDay(); // 0 = Sun, 1 = Mon ...
  let distToMon;
  if (firstDow === 1) distToMon = 0;
  else if (firstDow === 0) distToMon = 1;
  else if (firstDow === 6) distToMon = 2;
  else distToMon = 1 - firstDow;

  const startMonday = new Date(year, month, 1 + distToMon);
  startMonday.setHours(0, 0, 0, 0);

  const grid = [];
  const current = new Date(startMonday);
  const daysOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  while (current <= lastDay || grid.length % 5 !== 0 || grid.length < 20) {
    const dow = current.getDay();
    if (dow >= 1 && dow <= 5) {
      const isCurrentMonth = current.getMonth() === month;
      const fullDateStr = current.toISOString().split('T')[0];
      const dateObj = new Date(current);
      grid.push({
        day: current.getDate(),
        dateObj,
        fullDateStr,
        dayName: daysOfWeekNames[dow],
        isCurrentMonth
      });
    }

    current.setDate(current.getDate() + 1);
    if (grid.length >= 35) break;
  }

  return grid;
}

function parseApiMenuData(rawData, visibleDays = []) {
  const result = {};

  if (!visibleDays || visibleDays.length === 0) {
    DAYS_OF_WEEK.forEach(d => {
      result[d] = { date: '', isToday: false, items: [] };
    });
  } else {
    visibleDays.forEach(d => {
      result[d.dayName] = {
        date: d.formattedDate,
        isToday: d.isToday,
        fullDateStr: d.fullDateStr,
        items: []
      };
    });
  }

  let itemList = [];
  if (rawData) {
    if (Array.isArray(rawData)) {
      itemList = rawData;
    } else if (rawData.config && Array.isArray(rawData.config)) {
      rawData.config.forEach(block => {
        const blockItems = Array.isArray(block.itemsArray) ? block.itemsArray : (Array.isArray(block.items) ? block.items : []);
        blockItems.forEach(it => {
          itemList.push({
            ...it,
            startDate: block.startDate,
            endDate: block.endDate,
            mcid: block.id || it.mcid
          });
        });
      });
    } else if (rawData.items && Array.isArray(rawData.items)) {
      itemList = rawData.items;
    } else if (rawData.menus && Array.isArray(rawData.menus)) {
      itemList = rawData.menus;
    }
  }

  if (itemList.length > 0) {
    itemList.forEach((item, index) => {
      let dayName = DAYS_OF_WEEK[index % 5];
      const itemDateStr = item.date || item.startDate || item.orderDate;
      if (item.day) {
        const match = DAYS_OF_WEEK.find(d => d.toLowerCase() === String(item.day).toLowerCase());
        if (match) dayName = match;
      } else if (itemDateStr) {
        const dateObj = new Date(itemDateStr);
        if (!isNaN(dateObj.getTime())) {
          const dIdx = dateObj.getDay();
          if (dIdx >= 1 && dIdx <= 5) {
            dayName = DAYS_OF_WEEK[dIdx - 1];
          }
        }
      }

      const formattedItem = {
        id: item.id || item.itemId || (51 + index),
        mcid: item.mcid,
        name: item.name || item.title || item.itemName || 'Meal Option',
        size: item.size || item.portion || 'REGULAR',
        price: parseFloat(item.price || item.amount || 0),
        image: item.image || item.photoUrl || item.imageUrl || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=80`,
        isVegetarian: !!(item.veg || item.isVegetarian || item.is_vegetarian),
        isVegan: !!(item.vegan || item.isVegan || item.is_vegan),
        isGlutenFree: !!(item.glutenFree || item.isGlutenFree || item.is_gluten_free),
        isAllergen: !!(item.allergens?.length || item.is_allergen || item.isAllerege || item.isAllergen),
        addonsCount: Array.isArray(item.addon) ? item.addon.length : (item.addonsCount !== undefined ? item.addonsCount : 0),
        addons: Array.isArray(item.addon) ? item.addon : (Array.isArray(item.addons) ? item.addons : undefined)
      };

      if (result[dayName]) {
        result[dayName].items.push(formattedItem);
      }
    });
  }

  return result;
}

const Dashboard = ({ cartItems = [], setAvailableFunds, setAmountOwed, addToCart, refreshCart }) => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Accordion state
  const [expandedChildId, setExpandedChildId] = useState(null);
  const [menuViewType, setMenuViewType] = useState('Week'); // 'Week' | 'Month'
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, 1 = next week
  const [selectedMonth, setSelectedMonth] = useState('August 2026');
  const [selectedMenuIdMap, setSelectedMenuIdMap] = useState({});
  const [copyFromStudentMap, setCopyFromStudentMap] = useState({});
  const [apiMenus, setApiMenus] = useState({});
  const [childMenusMap, setChildMenusMap] = useState({});
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [addingToCartChildId, setAddingToCartChildId] = useState(null);
  const [childNotes, setChildNotes] = useState({});

  // Placed Orders & Ordered Dates History state
  const [placedOrdersMap, setPlacedOrdersMap] = useState({});
  const [orderedDatesHistoryMap, setOrderedDatesHistoryMap] = useState({});

  // Fetch placed orders history from backend API
  const fetchPlacedOrders = async () => {
    try {
      const res = await getOrdersApi();
      if (res && res.status === 'success' && Array.isArray(res.data)) {
        const ordersData = res.data;
        const detailsPromises = ordersData.slice(0, 10).map(async (o) => {
          const rawId = o.id || o.orderId;
          if (!rawId) return null;
          try {
            const detailRes = await getOrderDetailsApi(rawId);
            return {
              order: o,
              detail: detailRes?.data || detailRes
            };
          } catch (e) {
            return { order: o, detail: null };
          }
        });

        const settled = await Promise.allSettled(detailsPromises);
        const mapByChild = {};

        settled.forEach(item => {
          if (item.status === 'fulfilled' && item.value) {
            const { order, detail } = item.value;
            const childKey = String(order.childId || order.typeId || order.student || order.studentName || 'all').toLowerCase();
            if (!mapByChild[childKey]) mapByChild[childKey] = {};

            const orderInfo = detail?.orderInfo || order.orderInfo || order.itemsByDate || {};
            if (orderInfo && typeof orderInfo === 'object') {
              Object.keys(orderInfo).forEach(dateKey => {
                const dateItems = Array.isArray(orderInfo[dateKey]) ? orderInfo[dateKey] : [];
                if (dateItems.length > 0) {
                  const items = dateItems.map(it => ({
                    name: it.name || it.itemName || 'Meal',
                    quantity: parseInt(it.quantity, 10) || 1,
                    price: parseFloat(it.unitPrice || it.price || 0)
                  }));
                  const totalProducts = items.reduce((sum, it) => sum + it.quantity, 0);
                  const totalPrice = items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
                  mapByChild[childKey][dateKey] = {
                    totalProducts,
                    totalPrice: totalPrice || parseFloat(order.amount || 0),
                    items,
                    orderId: order.orderId || order.id,
                    status: order.status || 'PAID'
                  };
                }
              });
            }
          }
        });

        setPlacedOrdersMap(mapByChild);
      }
    } catch (err) {
      console.log('Placed orders fetch notice in Dashboard:', err);
    }
  };

  const fetchOrderedDatesHistory = async (childId, menuId) => {
    if (!childId || !menuId) return;
    try {
      const res = await getOrderedDatesApi(childId, menuId);
      if (res && (res.orderedDates || res.data?.orderedDates)) {
        const dates = res.orderedDates || res.data?.orderedDates || [];
        setOrderedDatesHistoryMap(prev => ({
          ...prev,
          [childId]: dates
        }));
      }
    } catch (err) {
      console.log('Ordered dates history notice in Dashboard:', err);
    }
  };

  // Handle switching menu from dropdown
  const handleMenuChange = async (childId, newMenuId) => {
    const numId = parseInt(newMenuId, 10);
    if (!numId) return;

    setSelectedMenuIdMap(prev => ({ ...prev, [childId]: numId }));

    const childMenus = childMenusMap[childId] || [];
    const targetMenu = childMenus.find(m => parseInt(m.id, 10) === numId);
    if (targetMenu) {
      const label = targetMenu.title || targetMenu.name || targetMenu.month || `Menu ${numId}`;
      setSelectedMonth(label);
    }

    setLoadingMenu(true);
    try {
      fetchOrderedDatesHistory(childId, numId);
      const detailRes = await getMenuDetailApi(numId, childId);
      if (detailRes && (detailRes.data || detailRes.config)) {
        const menuData = detailRes.data || detailRes;
        setApiMenus(prev => ({ ...prev, [childId]: menuData }));
        setMenuQuantities(prev => ({
          ...prev,
          [childId]: {}
        }));
        toast.info(`Switched to: ${targetMenu?.title || targetMenu?.name || 'Selected Menu'}`);
      }
    } catch (err) {
      console.error('Failed to load menu detail on menu switch:', err);
      toast.error('Could not load menu items for the selected menu.');
    } finally {
      setLoadingMenu(false);
    }
  };

  // Fetch API menus for active child (cached so it only fetches once per child)
  const fetchMenuForChild = async (childId, force = false) => {
    if (childId === null || childId === undefined) return;
    if (!force && childMenusMap[childId] && apiMenus[childId]) {
      return;
    }
    setLoadingMenu(true);
    try {
      const res = await getMenusForChildApi(childId, force);
      if (res && res.status === 'success' && res.data) {
        const rawList = Array.isArray(res.data) ? res.data : (res.data.menus || []);
        setChildMenusMap(prev => ({ ...prev, [childId]: rawList }));
        if (rawList.length > 0 && rawList[0].id) {
          const firstMenuId = parseInt(rawList[0].id, 10);
          setSelectedMenuIdMap(prev => ({
            ...prev,
            [childId]: prev[childId] || firstMenuId
          }));
          const targetMenuId = selectedMenuIdMap[childId] || firstMenuId;
          const activeMenuObj = rawList.find(m => parseInt(m.id, 10) === targetMenuId) || rawList[0];
          setSelectedMonth(activeMenuObj.title || activeMenuObj.name || activeMenuObj.month || `Menu ${targetMenuId}`);

          fetchOrderedDatesHistory(childId, targetMenuId);

          try {
            const detailRes = await getMenuDetailApi(targetMenuId, childId, force);
            if (detailRes && (detailRes.data || detailRes.config)) {
              setApiMenus(prev => ({ ...prev, [childId]: detailRes.data || detailRes }));
            }
          } catch (dErr) {
            setApiMenus(prev => ({ ...prev, [childId]: rawList }));
          }
        } else {
          setApiMenus(prev => ({ ...prev, [childId]: rawList }));
        }
      }
    } catch (err) {
      console.log('Menu API notice:', err);
    } finally {
      setLoadingMenu(false);
    }
  };

  useEffect(() => {
    if (expandedChildId !== null && (!childMenusMap[expandedChildId] || !apiMenus[expandedChildId])) {
      fetchMenuForChild(expandedChildId);
    }
  }, [expandedChildId, childMenusMap, apiMenus]);

  // Quantities state: childId -> day -> itemId -> qty
  const [menuQuantities, setMenuQuantities] = useState({});

  // Addon Modal State
  const [addonModal, setAddonModal] = useState({
    isOpen: false,
    childId: null,
    day: null,
    item: null,
    qty: 1
  });

  // Selected Addons Map: `${childId}_${day}_${itemId}` -> { [instanceIdx]: [addonId, ...] }
  const [selectedAddonsMap, setSelectedAddonsMap] = useState({});

  const handleOpenAddons = (childId, day, item, currentQty) => {
    const qty = currentQty > 0 ? currentQty : 1;
    if (currentQty === 0) {
      updateQty(childId, day, item.id, 1);
    }
    setAddonModal({
      isOpen: true,
      childId,
      day,
      item,
      qty
    });
  };

  const handleSaveAddons = (selections) => {
    if (!addonModal.item) return;
    const key = `${addonModal.childId}_${addonModal.day}_${addonModal.item.id}`;
    setSelectedAddonsMap(prev => ({
      ...prev,
      [key]: selections
    }));
    const totalCount = Object.values(selections).reduce((sum, list) => sum + (list?.length || 0), 0);
    toast.success(`${totalCount} add-on${totalCount === 1 ? '' : 's'} saved for ${addonModal.item.name}!`);
  };

  const fetchDashboard = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await getDashboardSummaryApi();
      if (res && res.status === 'success' && res.data) {
        setSummary(res.data);
        if (res.data.summary) {
          const funds = parseFloat(res.data.summary.availableFunds) || 0;
          const owed = parseFloat(res.data.summary.amountOwed) || 0;
          if (setAvailableFunds) setAvailableFunds(funds);
          if (setAmountOwed) setAmountOwed(owed);
        }
        // Expand first child by default if available
        if (Array.isArray(res.data.children) && res.data.children.length > 0) {
          setExpandedChildId(res.data.children[0].id || 0);
        }
      } else {
        setErrorMsg('Could not load dashboard data.');
      }
    } catch (err) {
      console.error('Dashboard API error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchPlacedOrders();
  }, []);

  const parent = summary?.parent || {};
  const sumData = summary?.summary || {};
  const children = Array.isArray(summary?.children) ? summary.children : [];
  const firstName = parent.firstName || parent.first_name || '';

  // Helpers for quantity changes
  const updateQty = (childId, day, itemId, delta) => {
    const cid = childId ?? 'default';
    setMenuQuantities(prev => {
      const childData = prev[cid] ? { ...prev[cid] } : {};
      const dayData = childData[day] ? { ...childData[day] } : {};
      const currentQty = dayData[itemId] || 0;
      const nextQty = Math.max(0, currentQty + delta);
      return {
        ...prev,
        [cid]: {
          ...childData,
          [day]: {
            ...dayData,
            [itemId]: nextQty
          }
        }
      };
    });
  };

  const handleOpenWeekForDay = (targetDate) => {
    if (!targetDate) return;
    const targetOffset = getWeekOffsetForDate(targetDate);
    setWeekOffset(targetOffset);
    setMenuViewType('Week');
  };

  const handleEditDayOrder = (dateObj, dayName, fullDateStr) => {
    if (!dateObj) return;
    const targetOffset = getWeekOffsetForDate(dateObj);
    setWeekOffset(targetOffset);
    setMenuViewType('Week');
    toast.info(`Editing meals for ${dayName || 'selected day'}, ${fullDateStr || ''}`);
  };

  const getOrderForCell = (child, childId, cell) => {
    const studentName = (child?.name || `${child?.firstName || ''} ${child?.lastName || ''}`.trim() || child?.fullName || '').toLowerCase();
    const cellDateStr = cell.fullDateStr;
    const cellDay = cell.day;
    const cellMonth = cell.dateObj.getMonth();
    const cellYear = cell.dateObj.getFullYear();

    const dateMatchesCell = (d) => {
      if (!d) return false;
      if (d === cellDateStr) return true;
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) {
        if (parsed.getFullYear() === cellYear && parsed.getMonth() === cellMonth && parsed.getDate() === cellDay) {
          return true;
        }
      }
      const formattedCheck = `${String(cellDay).padStart(2, '0')} ${cell.dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}`;
      if (String(d).toUpperCase().includes(formattedCheck)) return true;
      return false;
    };

    // 1. Placed orders from backend API
    const childOrders = placedOrdersMap[String(childId).toLowerCase()] || placedOrdersMap[studentName] || {};
    for (const [dateKey, orderData] of Object.entries(childOrders)) {
      if (dateMatchesCell(dateKey)) return orderData;
    }

    for (const [cKey, oMap] of Object.entries(placedOrdersMap)) {
      if (!studentName || cKey.includes(studentName) || studentName.includes(cKey)) {
        for (const [dKey, oData] of Object.entries(oMap)) {
          if (dateMatchesCell(dKey)) return oData;
        }
      }
    }

    // 2. Active cartItems (from App / getCartApi)
    if (Array.isArray(cartItems) && cartItems.length > 0) {
      const matchingCartItems = cartItems.filter(it => {
        const itStudent = (it.student || it.studentName || it.childName || '').toLowerCase();
        const matchesStudent = !studentName || !itStudent || itStudent.includes(studentName) || studentName.includes(itStudent);
        if (!matchesStudent) return false;
        const itDate = it.date || it.orderDate || '';
        return dateMatchesCell(itDate);
      });

      if (matchingCartItems.length > 0) {
        const consolidated = {};
        matchingCartItems.forEach(it => {
          const name = it.item || it.name || it.itemName || 'Meal';
          const qty = parseInt(it.quantity, 10) || 1;
          const price = parseFloat(it.price || 0);
          if (!consolidated[name]) {
            consolidated[name] = { name, quantity: 0, price };
          }
          consolidated[name].quantity += qty;
        });
        const items = Object.values(consolidated);
        const totalProducts = items.reduce((sum, it) => sum + it.quantity, 0);
        const totalPrice = items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
        return {
          totalProducts,
          totalPrice,
          items,
          isCart: true
        };
      }
    }

    // 3. Current session's menuQuantities
    const cid = childId ?? 'default';
    const childSelections = menuQuantities[cid] || menuQuantities['default'] || {};
    const cellWeekOffset = getWeekOffsetForDate(cell.dateObj);
    if (cellWeekOffset === weekOffset && childSelections[cell.dayName]) {
      const daySelections = childSelections[cell.dayName];
      const { weekDays } = getWeekDates(weekOffset);
      const activeMenu = parseApiMenuData(apiMenus[childId], weekDays);
      const dayMenu = activeMenu[cell.dayName];
      const selectedItems = [];

      Object.keys(daySelections).forEach(itemId => {
        const qty = daySelections[itemId] || 0;
        if (qty > 0) {
          const found = dayMenu?.items?.find(i => String(i.id) === String(itemId));
          selectedItems.push({
            name: found?.name || `Meal Option`,
            quantity: qty,
            price: found?.price || 0
          });
        }
      });

      if (selectedItems.length > 0) {
        const totalProducts = selectedItems.reduce((sum, it) => sum + it.quantity, 0);
        const totalPrice = selectedItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);
        return {
          totalProducts,
          totalPrice,
          items: selectedItems,
          isSession: true
        };
      }
    }

    // 4. Ordered dates history from API
    const historyList = orderedDatesHistoryMap[childId] || [];
    if (historyList.some(d => dateMatchesCell(d))) {
      return {
        totalProducts: 1,
        totalPrice: 0,
        items: [{ name: 'Meal Order', quantity: 1, price: 0 }],
        isHistory: true
      };
    }

    return null;
  };

  const handleFirstItemAllDays = (childId) => {
    const cid = childId ?? 'default';
    const { weekDays } = getWeekDates(weekOffset);
    const activeMenu = parseApiMenuData(apiMenus[childId], weekDays);
    setMenuQuantities(prev => {
      const childData = prev[cid] ? { ...prev[cid] } : {};
      Object.keys(activeMenu).forEach(day => {
        const firstItem = activeMenu[day]?.items[0];
        if (firstItem) {
          childData[day] = {
            ...(childData[day] || {}),
            [firstItem.id]: 1
          };
        }
      });
      return { ...prev, [cid]: childData };
    });
    toast.info('Selected first menu item for all days!');
  };

  const handleCopyOrder = (targetChildId, sourceStudentName) => {
    if (!sourceStudentName) return;
    const targetCid = targetChildId ?? 'default';

    // Find source child by name
    const sourceChild = children.find((c, idx) => {
      const sName = c.name || `${c.firstName || c.first_name || ''} ${c.lastName || c.last_name || ''}`.trim() || `Student ${idx + 1}`;
      return sName.toLowerCase() === sourceStudentName.toLowerCase() || String(c.id) === String(sourceStudentName);
    });

    if (sourceChild) {
      const sourceCid = sourceChild.id ?? 'default';
      const sourceQty = menuQuantities[sourceCid];
      if (sourceQty && Object.keys(sourceQty).length > 0) {
        setMenuQuantities(prev => ({
          ...prev,
          [targetCid]: JSON.parse(JSON.stringify(sourceQty))
        }));
        // Also copy addons if any
        setSelectedAddonsMap(prev => {
          const updated = { ...prev };
          Object.keys(prev).forEach(key => {
            if (key.startsWith(`${sourceCid}_`)) {
              const suffix = key.replace(`${sourceCid}_`, '');
              updated[`${targetCid}_${suffix}`] = JSON.parse(JSON.stringify(prev[key]));
            }
          });
          return updated;
        });
      }
    }
    toast.success(`Copied menu selections from ${sourceStudentName}`);
  };

  const handleOpenNotes = (child) => {
    const cid = child?.id ?? 'default';
    const currentNote = childNotes[cid] || '';
    const note = window.prompt(`Special instructions or dietary notes for ${child?.name || 'this student'} (e.g. "No onions please"):`, currentNote);
    if (note !== null) {
      setChildNotes(prev => ({ ...prev, [cid]: note.trim() }));
      if (note.trim()) {
        toast.info(`Note saved for ${child?.name || 'student'}`);
      }
    }
  };

  const handleFinishOrder = async (child) => {
    const cid = child?.id ?? 'default';
    const childSelections = menuQuantities[cid] || menuQuantities['default'] || {};
    let totalItems = 0;

    Object.keys(childSelections).forEach(day => {
      Object.keys(childSelections[day] || {}).forEach(itemId => {
        totalItems += (childSelections[day][itemId] || 0);
      });
    });

    const studentDisplayName = child?.fullName || `${child?.firstName || ''} ${child?.lastName || ''}`.trim() || child?.name || child?.first_name || 'Student';

    if (totalItems === 0) {
      toast.warn(`Please select at least one meal item for ${studentDisplayName} before adding to cart.`);
      return;
    }

    const { weekDays } = getWeekDates(weekOffset);
    const activeMenu = parseApiMenuData(apiMenus[child?.id], weekDays);

    // Classroom ID key for config
    const classroomKey = String(child?.classroomId || child?.classroom || child?.classInfo?.id || child?.campusId || '101');
    const config = { [classroomKey]: {} };
    const itemsToSync = [];

    Object.keys(childSelections).forEach(day => {
      const dayData = activeMenu[day];
      let dateStr = dayData?.fullDateStr;
      if (!dateStr) {
        const matchedWeekDay = weekDays.find(w => w.dayName.toLowerCase() === day.toLowerCase());
        dateStr = matchedWeekDay?.fullDateStr || new Date().toISOString().split('T')[0];
      }

      const dayItems = [];

      Object.keys(childSelections[day] || {}).forEach(itemId => {
        const qty = parseInt(childSelections[day][itemId], 10) || 0;
        if (qty > 0) {
          const addonKey = `${cid}_${day}_${itemId}`;
          const addonSelections = selectedAddonsMap[addonKey] || {};
          const flatAddonIds = Object.values(addonSelections).flat();
          const addonList = flatAddonIds.map(aid => ({
            id: parseInt(aid, 10) || 88,
            quantity: 1
          }));

          let itemDetails = null;
          Object.values(activeMenu).forEach(d => {
            const found = d.items?.find(i => String(i.id) === String(itemId));
            if (found) itemDetails = found;
          });

          const numericItemId = !isNaN(parseInt(itemId, 10))
            ? parseInt(itemId, 10)
            : (parseInt(String(itemId).replace(/\D/g, ''), 10) || 55);

          dayItems.push({
            id: numericItemId,
            quantity: qty,
            addon: addonList
          });

          const addonNames = flatAddonIds.map(aid => {
            const def = DEFAULT_ADDONS.find(a => String(a.id) === String(aid));
            return def ? def.name : aid;
          });

          itemsToSync.push({
            id: numericItemId,
            student: studentDisplayName,
            studentName: studentDisplayName,
            childName: studentDisplayName,
            itemName: itemDetails?.name || 'Lunch Meal',
            price: parseFloat(itemDetails?.price || 0),
            quantity: qty,
            day,
            date: dateStr,
            addons: addonNames
          });
        }
      });

      if (dayItems.length > 0) {
        config[classroomKey][dateStr] = dayItems;
      }
    });

    const childMenus = childMenusMap[child?.id] || [];
    const currentMenuId = selectedMenuIdMap[child?.id]
      || childMenus.find(m => (m.title || m.name || m.month) === selectedMonth)?.id
      || childMenus[0]?.id
      || 1;
    const menuId = parseInt(currentMenuId, 10) || 1;
    const childId = parseInt(child?.id, 10) || 940;

    const orderPayload = {
      typeId: childId,
      childId,
      type: 5,
      menuId,
      isDraft: 1,
      notes: childNotes[cid] || '',
      config
    };

    setAddingToCartChildId(cid);

    try {
      const res = await createOrderApi(orderPayload);
      // Check for orders API response; only then save to cart in local state
      if (res && (res.status === 'success' || res.orderId || res.succ_code)) {
        if (addToCart && itemsToSync.length > 0) {
          itemsToSync.forEach(it => addToCart(it));
        }
        if (refreshCart) {
          await refreshCart();
        }
        fetchPlacedOrders();
        toast.success(`Added ${totalItems} meal${totalItems > 1 ? 's' : ''} to cart for ${studentDisplayName}!`);
      } else {
        const errorMsg = res?.message || 'Could not add order to cart.';
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('Order API error:', err);
      const errMsg = err.response?.data?.message
        || err.response?.data?.detail?.message
        || (Array.isArray(err.response?.data?.detail) ? err.response?.data?.detail.map(d => d.msg).join(', ') : null)
        || err.message
        || 'Failed to add meals to cart.';
      toast.error(errMsg);
    } finally {
      setAddingToCartChildId(null);
    }
  };

  const handleNextChild = (currentIndex) => {
    if (currentIndex < children.length - 1) {
      setExpandedChildId(children[currentIndex + 1].id || (currentIndex + 1));
    } else {
      setExpandedChildId(children[0].id || 0);
    }
  };

  /* ─── Loading skeleton ─────────────────────────────────── */
  if (loading) {
    return (
      <>
        <div className="page-header">
          <div>
            <div className="shimmer-base shimmer-title" style={{ width: 280 }} />
            <div className="shimmer-base shimmer-line-sm" style={{ width: 220, marginTop: 6 }} />
          </div>
        </div>
        <ShimmerStats count={4} />
        <ShimmerCards count={3} />
      </>
    );
  }

  /* ─── Error state ───────────────────────────────────────── */
  if (errorMsg) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <i className="lni lni-warning" style={{ fontSize: 48, color: '#E54A4A', display: 'block', marginBottom: 12 }} />
        <p style={{ color: '#E54A4A', fontWeight: 600 }}>{errorMsg}</p>
        <button className="btn-primary" style={{ marginTop: 16 }} onClick={fetchDashboard}>Retry</button>
      </div>
    );
  }

  return (
    <>
      {/* ── Page Header ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">
            Welcome back{firstName ? `, ${firstName}` : ''}! 👋
          </h1>
          <p className="page-subtitle">Here's an overview of your children's meal accounts.</p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={fetchDashboard}>
          <i className="lni lni-reload" /> Refresh
        </button>
      </div>

      {/* ── Summary Stat Chips ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <StatChip icon="lni-dollar" label="Available Funds" value={`$${parseFloat(sumData.availableFunds || 0).toFixed(2)}`} color="#006D77" bg="#E6F4F5" />
        <StatChip icon="lni-alarm" label="Amount Owed" value={`$${parseFloat(sumData.amountOwed || 0).toFixed(2)}`} color="#E54A4A" bg="#FEF2F2" />
        <StatChip icon="lni-cart" label="Cart Items" value={sumData.cartCount || 0} color="#4A90D9" bg="#EFF6FF" onClick={() => navigate('/shoppingcart')} />
        <StatChip icon="lni-users" label="Children" value={children.length} color="#9B59B6" bg="#F5F3FF" />
      </div>

      {/* ── Children Accordion Cards List ── */}
      {children.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
          <i className="lni lni-friends" style={{ fontSize: 52, display: 'block', marginBottom: 12 }} />
          <p style={{ fontSize: 16 }}>No children found on your account.</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/children')}>
            + Add a Child
          </button>
        </div>
      ) : (
        <>
          <div className="student-cards-list">
            {children.map((child, i) => {
              const childId = child.id ?? i;
              const isExpanded = expandedChildId === childId;
              const fullName = child.name || `${child.firstName || ''} ${child.lastName || ''}`.trim() || `Child #${childId}`;
              const initials = fullName.split(' ').map(n => n[0] || '').join('').toUpperCase().slice(0, 2) || 'ST';
              const campus = child.campusName || child.campusInfo?.name || '--';
              const grade = child.gradeName || child.gradeInfo?.name || '--';
              const room = child.className || child.classInfo?.name || '--';
              const balance = child.balance ?? child.owed ?? '0.00';
              const cidKey = childId ?? 'default';
              const childQuantities = menuQuantities[cidKey] || {};

              return (
                <React.Fragment key={childId}>
                  {/* Collapsed Horizontal Student Header Card */}
                  {!isExpanded ? (
                    <div
                      className="horizontal-student-card"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpandedChildId(childId)}
                    >
                      <div className="card-left">
                        <div className="avatar" style={{ background: AVATARS[i % AVATARS.length] }}>
                          {initials}
                        </div>
                        <div className="student-name">{fullName}</div>
                        <div className="meta-divider" />
                        <div className="meta-item"><i className="lni lni-apartment" /><span>{campus}</span></div>
                        <div className="meta-divider" />
                        <div className="meta-item"><i className="lni lni-display-alt" /><span>{room}</span></div>
                        <div className="meta-divider" />
                        <div className="meta-item"><i className="lni lni-graduation" /><span>{grade}</span></div>
                      </div>

                      <div className="card-right">
                        <div className="amount-badge">${parseFloat(balance || 0).toFixed(2)}</div>
                        <button className="action-icon-btn" title="Expand Menu Accordion" onClick={(e) => { e.stopPropagation(); setExpandedChildId(childId); }}>
                          <i className="lni lni-chevron-down" />
                        </button>
                        {/* <button className="action-icon-btn" title="Edit student profile" onClick={(e) => { e.stopPropagation(); navigate('/children'); }}>
                          <i className="lni lni-pencil" />
                        </button> */}
                      </div>
                    </div>
                  ) : (
                    /* Expanded Accordion Container (Weekly & Monthly Menu View) */
                    <div className="student-accordion-container">
                      {/* Top Header Controls Bar */}
                      <div className="accordion-header-bar">
                        <div className="accordion-student-info">
                          <div className="accordion-avatar" style={{ background: AVATARS[i % AVATARS.length] }}>
                            {initials}
                          </div>
                          <div>
                            <input
                              type="text"
                              className="accordion-input-pill"
                              value={fullName}
                              readOnly
                              style={{ width: 115, marginBottom: 3 }}
                            />
                            <select
                              className="accordion-input-pill"
                              value={selectedMenuIdMap[childId] || childMenusMap[childId]?.[0]?.id || ''}
                              onChange={(e) => handleMenuChange(childId, e.target.value)}
                              style={{ width: 140, display: 'block', cursor: 'pointer' }}
                              disabled={loadingMenu}
                            >
                              {childMenusMap[childId]?.length > 0 ? (
                                childMenusMap[childId].map((m, idx) => {
                                  const label = m.title || m.name || m.month || `Menu ${m.id || idx + 1}`;
                                  return (
                                    <option key={m.id || idx} value={m.id}>
                                      {label}
                                    </option>
                                  );
                                })
                              ) : (
                                <>
                                  <option value="1">August 2026</option>
                                  <option value="2">September 2026</option>
                                </>
                              )}
                            </select>
                          </div>
                          <div className="accordion-meta-block">
                            <div><i className="lni lni-apartment" /> {campus}</div>
                            <div><i className="lni lni-display-alt" /> {room}</div>
                            <div><i className="lni lni-graduation" /> {grade}</div>
                          </div>
                        </div>

                        <div className="accordion-header-controls">
                          {/* Week / Month Toggle Pill */}
                          <div className="week-month-toggle-pill">
                            <button
                              className={menuViewType === 'Week' ? 'active' : ''}
                              onClick={() => setMenuViewType('Week')}
                            >
                              Week
                            </button>
                            <button
                              className={menuViewType === 'Month' ? 'active' : ''}
                              onClick={() => setMenuViewType('Month')}
                            >
                              Month
                            </button>
                          </div>

                          {/* Copy Order From */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>
                            <span>Copy order from</span>
                            <select
                              className="accordion-input-pill"
                              value={copyFromStudentMap[childId] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCopyFromStudentMap(prev => ({ ...prev, [childId]: val }));
                                handleCopyOrder(childId, val);
                              }}
                              style={{ width: 125, cursor: 'pointer' }}
                            >
                              <option value="">Select student</option>
                              {children.map((c, idx) => {
                                const sName = c.name || `${c.firstName || c.first_name || ''} ${c.lastName || c.last_name || ''}`.trim() || `Student ${idx + 1}`;
                                return (
                                  <option key={c.id || idx} value={sName}>{sName}</option>
                                );
                              })}
                            </select>
                          </div>

                          {/* Balance amount badge */}
                          <div className="amount-badge" style={{ fontSize: 15, whiteSpace: 'nowrap' }}>
                            ${parseFloat(balance || 0).toFixed(2)}
                          </div>

                          {/* Collapse button */}
                          <button
                            className="action-icon-btn"
                            title="Collapse accordion"
                            onClick={() => setExpandedChildId(null)}
                            style={{ width: 30, height: 30 }}
                          >
                            <i className="lni lni-chevron-up" style={{ fontSize: 12 }} />
                          </button>
                        </div>
                      </div>

                      {/* ── View 1: Week View Carousel ── */}
                      {menuViewType === 'Week' ? (() => {
                        const { weekDays } = getWeekDates(weekOffset);
                        const visibleDays = weekDays;

                        return (
                          <div className="accordion-carousel-wrapper" style={{ flexDirection: 'column', gap: 10 }}>
                            {/* Second Line Bar: Date Range (Left) and FIRST ITEM FOR ALL DAYS (Right Corner) */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              width: '100%',
                              padding: '0 4px',
                              marginBottom: 2
                            }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#006D77', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <i className="lni lni-calendar" />
                                {visibleDays.length > 0
                                  ? `${visibleDays[0].formattedDate} - ${visibleDays[visibleDays.length - 1].formattedDate} (${weekOffset === 0 ? 'Current Week' : `+${weekOffset} Week`})`
                                  : 'No upcoming dates'
                                }
                              </span>

                              <button
                                className="btn-first-item-all"
                                onClick={() => handleFirstItemAllDays(childId)}
                                title="First order for all days"
                              >
                                FIRST ITEM FOR ALL DAYS
                              </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 12 }}>
                              <button
                                className="carousel-nav-btn"
                                onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))}
                                disabled={weekOffset <= 0}
                                style={{
                                  opacity: weekOffset <= 0 ? 0.4 : 1,
                                  cursor: weekOffset <= 0 ? 'not-allowed' : 'pointer'
                                }}
                                title={weekOffset <= 0 ? "Past weeks not accessible" : "Previous Week"}
                              >
                                <i className="lni lni-chevron-left" />
                              </button>

                              <div style={{ flex: 1 }}>
                                {loadingMenu ? (
                                  <div className="weekly-columns-grid">
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, idx) => (
                                      <div className="weekly-day-column" key={idx} style={{ opacity: 0.7 }}>
                                        <div className="weekly-day-header shimmer-base" style={{ height: 38 }} />
                                        <div className="weekly-day-body" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                          <div className="shimmer-base" style={{ height: 85, borderRadius: 12 }} />
                                          <div className="shimmer-base" style={{ height: 85, borderRadius: 12 }} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (() => {
                                  const activeWeeklyMenu = parseApiMenuData(apiMenus[childId], visibleDays);
                                  return (
                                    <div className="weekly-columns-grid">
                                      {Object.keys(activeWeeklyMenu).map(day => {
                                        const dayObj = activeWeeklyMenu[day];
                                        return (
                                          <div className="weekly-day-column" key={day} style={{ border: dayObj.isToday ? '2px solid #006D77' : undefined }}>
                                            <div className="weekly-day-header" style={{ background: dayObj.isToday ? '#E6F4F5' : undefined }}>
                                              <span className="day-date" style={{ color: dayObj.isToday ? '#006D77' : undefined, fontWeight: dayObj.isToday ? 800 : undefined }}>
                                                {dayObj.date}
                                              </span>
                                              <span className="day-name" style={{ color: dayObj.isToday ? '#006D77' : undefined, fontWeight: dayObj.isToday ? 800 : undefined }}>
                                                {day} {dayObj.isToday && <span style={{ fontSize: 10, background: '#006D77', color: '#fff', padding: '1px 5px', borderRadius: 4, marginLeft: 4 }}>TODAY</span>}
                                              </span>
                                              <i className="lni lni-more-alt" style={{ fontSize: 12, color: '#E29578', cursor: 'pointer' }} />
                                            </div>

                                            <div className="weekly-day-body">
                                              {dayObj.items.length === 0 ? (
                                                <div style={{ padding: '30px 10px', fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
                                                  No meals scheduled for {day}.
                                                </div>
                                              ) : (
                                                dayObj.items.map(item => {
                                                  const currentQty = childQuantities[day]?.[item.id] || 0;
                                                  const isSelected = currentQty > 0;

                                                  return (
                                                    <div className={`accordion-food-card ${isSelected ? 'selected' : ''}`} key={item.id}>
                                                      <div className="accordion-food-top">
                                                        <img src={item.image} alt={item.name} className="accordion-food-img" />
                                                        <div>
                                                          <div className="accordion-food-title">{item.name}</div>
                                                          <div className="accordion-food-size">
                                                            <span>{item.size}</span>
                                                            {item.isVegetarian && <span className="tag-dot v-green">V</span>}
                                                            {item.isVegan && <span className="tag-dot vn-green">Vn</span>}
                                                            {item.isGlutenFree && <span className="tag-dot g-gold">G</span>}
                                                            {item.isAllergen && <span className="tag-dot a-red">A</span>}
                                                          </div>
                                                        </div>
                                                      </div>

                                                      <div className="accordion-food-bottom">
                                                        <div className="accordion-food-bottom-left">
                                                          <div className="accordion-qty-box">
                                                            <button className="accordion-qty-btn" onClick={() => updateQty(childId, day, item.id, -1)}>-</button>
                                                            <span className="accordion-qty-val">{currentQty}</span>
                                                            <button className="accordion-qty-btn" onClick={() => updateQty(childId, day, item.id, 1)}>+</button>
                                                          </div>

                                                          {/* Addons Pill Button */}
                                                          {(() => {
                                                            const addonKey = `${childId}_${day}_${item.id}`;
                                                            const hasSelections = selectedAddonsMap[addonKey] !== undefined;
                                                            const addonCount = hasSelections
                                                              ? Object.values(selectedAddonsMap[addonKey]).reduce((sum, list) => sum + (list?.length || 0), 0)
                                                              : (item.addonsCount !== undefined ? item.addonsCount : 0);

                                                            if (!addonCount || addonCount <= 0) return null;

                                                            return (
                                                              <button
                                                                className="addons-pill-btn"
                                                                onClick={() => handleOpenAddons(childId, day, item, currentQty)}
                                                                title="Manage add-ons"
                                                              >
                                                                {addonCount} addons
                                                              </button>
                                                            );
                                                          })()}
                                                        </div>

                                                        <span className="accordion-food-price">${item.price.toFixed(2)}</span>
                                                      </div>
                                                    </div>
                                                  );
                                                })
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>

                              <button
                                className="carousel-nav-btn"
                                onClick={() => setWeekOffset(prev => prev + 1)}
                                title="Next Week"
                              >
                                <i className="lni lni-chevron-right" />
                              </button>
                            </div>
                          </div>
                        );
                      })() : (
                        (() => {
                          const childMenus = childMenusMap[childId] || [];
                          const activeChildMenu = childMenus.find(m => parseInt(m.id, 10) === selectedMenuIdMap[childId]) || childMenus[0];
                          const baseMonthDate = activeChildMenu?.startDate || selectedMonth || new Date();
                          const monthGridDays = getMonthGridDays(baseMonthDate);

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                padding: '0 4px',
                                marginBottom: 2
                              }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                                  <i className="lni lni-calendar" style={{ marginRight: 6, color: '#006D77' }} />
                                  Click any day's cart icon to open that week
                                </div>
                                <button
                                  className="btn-first-item-all"
                                  onClick={() => handleFirstItemAllDays(childId)}
                                  title="First order for all days"
                                >
                                  FIRST ITEM FOR ALL DAYS
                                </button>
                              </div>

                              <div className="month-calendar-grid">
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(dName => (
                                  <div className="month-day-header" key={dName}>{dName}</div>
                                ))}

                                {monthGridDays.map((cell, idx) => {
                                  const orderInfo = getOrderForCell(child, childId, cell);
                                  const dayQty = orderInfo ? orderInfo.totalProducts : Object.values(childQuantities[cell.dayName] || {}).reduce((sum, q) => sum + (q || 0), 0);

                                  return (
                                    <div 
                                      className={`month-day-cell ${cell.isCurrentMonth ? '' : 'other-month'} ${orderInfo ? 'has-order' : ''}`} 
                                      key={idx}
                                      onClick={() => handleOpenWeekForDay(cell.dateObj)}
                                      title={orderInfo ? `Click to edit order for ${cell.dayName}, ${cell.fullDateStr}` : `Click to open week containing ${cell.dayName}, ${cell.fullDateStr}`}
                                    >
                                      <div className={`month-day-cell-top ${orderInfo ? 'has-order' : ''}`}>
                                        <span className="month-day-number">{cell.day}</span>
                                        {!orderInfo && (
                                          <button
                                            type="button"
                                            className="month-day-cart-btn"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenWeekForDay(cell.dateObj);
                                            }}
                                            title={`Open week for ${cell.dayName}, ${cell.fullDateStr}`}
                                          >
                                            <i className="lni lni-cart" />
                                          </button>
                                        )}
                                      </div>

                                      {orderInfo ? (
                                        <div 
                                          className="month-order-card"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditDayOrder(cell.dateObj, cell.dayName, cell.fullDateStr);
                                          }}
                                          title={`Edit order for ${cell.dayName}, ${cell.fullDateStr}`}
                                        >
                                          <div className="month-order-card-header">
                                            <span className="month-order-card-title">
                                              {orderInfo.totalProducts} product{orderInfo.totalProducts !== 1 ? 's' : ''} – {Math.round(orderInfo.totalPrice)}$
                                            </span>
                                            <button
                                              type="button"
                                              className="month-order-card-edit-btn"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditDayOrder(cell.dateObj, cell.dayName, cell.fullDateStr);
                                              }}
                                              title={`Edit order for ${cell.dayName}, ${cell.fullDateStr}`}
                                            >
                                              <i className="lni lni-pencil" />
                                            </button>
                                          </div>

                                          <div className="month-order-item-list">
                                            {orderInfo.items.map((it, i) => (
                                              <div key={i} className="month-order-item-row">
                                                <span className="month-order-item-qty">{it.quantity}x</span>
                                                <span className="month-order-item-name">{it.name}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="month-day-cell-bottom">
                                          {dayQty > 0 && (
                                            <div className="month-day-selected-badge">
                                              <i className="lni lni-checkmark" style={{ fontSize: 10 }} />
                                              {dayQty} selected
                                            </div>
                                          )}
                                          <span className="month-day-open-hint">
                                            View week →
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()
                      )}

                      {/* Accordion Footer Bar */}
                      <div className="accordion-footer-bar">
                        <div className="dietary-legend">
                          <div className="dietary-legend-item"><span className="tag-dot vn-green">Vn</span> Vegan</div>
                          <div className="dietary-legend-item"><span className="tag-dot v-green">V</span> Vegetarian</div>
                          <div className="dietary-legend-item"><span className="tag-dot g-gold">G</span> Gluten free</div>
                          <div className="dietary-legend-item"><span className="tag-dot a-red">A</span> Allergens</div>
                          <button className="btn-add-notes" onClick={() => handleOpenNotes(child)}>
                            {childNotes[child?.id ?? 'default'] ? 'EDIT NOTES ✎' : 'ADD NOTES'}
                          </button>
                        </div>

                        <div className="accordion-footer-actions">
                          <button className="btn-accordion-cancel" onClick={() => setExpandedChildId(null)}>
                            CANCEL
                          </button>
                          <button className="btn-accordion-next" onClick={() => handleNextChild(i)}>
                            NEXT CHILD
                          </button>
                          <button 
                            className="btn-accordion-finish" 
                            onClick={() => handleFinishOrder(child)}
                            disabled={addingToCartChildId === (child?.id ?? 'default')}
                          >
                            {addingToCartChildId === (child?.id ?? 'default') ? 'Adding to Cart...' : 'Add To Cart'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Add New Child button */}
            <div className="add-child-horizontal-btn" onClick={() => navigate('/children')}>
              <i className="lni lni-circle-plus" style={{ fontSize: 18 }} />
              <span>Add New Child</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
            <button className="btn-primary" style={{ padding: '12px 28px', fontSize: 14, fontWeight: 700, borderRadius: 8, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => navigate('/shoppingcart')}>
              <i className="lni lni-cart" style={{ fontSize: 16 }} />
              PROCEED TO CHECKOUT →
            </button>
          </div>
        </>
      )}

      {/* ── Addons Modal Popup ── */}
      <AddonModal
        isOpen={addonModal.isOpen}
        onClose={() => setAddonModal(prev => ({ ...prev, isOpen: false }))}
        item={addonModal.item}
        qty={addonModal.qty}
        initialSelections={
          addonModal.item
            ? selectedAddonsMap[`${addonModal.childId}_${addonModal.day}_${addonModal.item.id}`] || {}
            : {}
        }
        onSave={handleSaveAddons}
      />
    </>
  );
};

/* ── Small Helper: stat chip ── */
function StatChip({ icon, label, value, color, bg, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: '#fff', border: '1px solid #E5E7EB',
        borderRadius: 12, padding: '14px 20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)', flex: '1 1 160px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className={`lni ${icon}`} style={{ fontSize: 18, color }} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#636363', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  );
}

export default Dashboard;
