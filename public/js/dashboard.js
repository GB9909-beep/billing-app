// ==================== Dashboard Main Logic ====================
// Handles all sections: Dashboard, Customers, Products, Invoice, History

document.addEventListener('DOMContentLoaded', () => {
  // ===== Auth Check =====
  checkAuthOrRedirect();

  // ===== State =====
  let customers = [];
  let products = [];
  let bills = [];
  let currentViewBillId = null;
  let editingBillId = null;

  // ===== DOM Elements =====
  const sidebar = document.getElementById('sidebar');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const navItems = document.querySelectorAll('.nav-item[data-section]');
  const sections = document.querySelectorAll('.content-section');

  // ===== Initialize =====
  initNavigation();
  initLogout();
  initCustomers();
  initProducts();
  initInvoice();
  loadDashboardData();

  // ==================== AUTH ====================
  async function checkAuthOrRedirect() {
    try {
      const res = await fetch('/api/me');
      if (!res.ok) {
        window.location.href = '/';
        return;
      }
      const data = await res.json();
      const display = document.getElementById('usernameDisplay');
      const avatar = document.getElementById('userAvatar');
      if (display) display.textContent = data.username || 'Admin';
      if (avatar) avatar.textContent = (data.username || 'A').charAt(0).toUpperCase();
    } catch (e) {
      window.location.href = '/';
    }
  }

  // ==================== NAVIGATION ====================
  function initNavigation() {
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const section = item.getAttribute('data-section');
        switchSection(section);
        // Close mobile menu
        sidebar.classList.remove('open');
      });
    });

    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }
  }

  function switchSection(name) {
    navItems.forEach(n => n.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));

    const navEl = document.querySelector(`.nav-item[data-section="${name}"]`);
    const secEl = document.getElementById(`section-${name}`);

    if (navEl) navEl.classList.add('active');
    if (secEl) secEl.classList.add('active');

    // Refresh data when switching
    if (name === 'dashboard') loadDashboardData();
    if (name === 'customers') loadCustomers();
    if (name === 'products') loadProducts();
    if (name === 'create-invoice') initInvoiceForm();
    if (name === 'history') loadHistory();
  }

  // ==================== LOGOUT ====================
  function initLogout() {
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      try {
        await fetch('/api/logout', { method: 'POST' });
      } catch (e) { /* ignore */ }
      window.location.href = '/';
    });
  }

  // ==================== DASHBOARD DATA ====================
  async function loadDashboardData() {
    try {
      const [custData, billData] = await Promise.all([
        fetch('/api/customers').then(r => r.json()),
        fetch('/api/bills').then(r => r.json())
      ]);

      customers = Array.isArray(custData) ? custData : [];
      bills = Array.isArray(billData) ? billData : [];

      document.getElementById('totalCustomers').textContent = customers.length;
      document.getElementById('totalBills').textContent = bills.length;

      const totalRev = bills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
      document.getElementById('totalRevenue').textContent = formatCurrency(totalRev);

      // Recent bills
      renderRecentBills();
    } catch (e) {
      console.error('Dashboard load error:', e);
    }
  }

  function renderRecentBills() {
    const container = document.getElementById('recentBillsList');
    const recent = bills.slice(0, 5);

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📄</div>
          <p>No invoices yet. Create your first invoice!</p>
        </div>`;
      return;
    }

    container.innerHTML = recent.map(b => `
      <div class="bill-list-item">
        <div class="bill-info">
          <span class="bill-number">${b.invoiceNo}</span>
          <span class="bill-customer">${b.customer.name} · ${formatDate(b.invoiceDate)}</span>
        </div>
        <div class="bill-actions">
          <span class="bill-amount">${formatCurrency(b.grandTotal)}</span>
          <button class="btn btn-sm btn-secondary" onclick="window.dashboardApp.viewBill('${b._id}')" title="Preview">👁️</button>
          <button class="btn btn-sm btn-primary" onclick="window.dashboardApp.downloadExcel('${b._id}')" title="Download">📥</button>
          <button class="btn btn-sm btn-danger" onclick="window.dashboardApp.deleteBill('${b._id}', '${b.invoiceNo}')" title="Delete">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  // ==================== CUSTOMERS ====================
  function initCustomers() {
    const addBtn = document.getElementById('addCustomerBtn');
    const modal = document.getElementById('customerModal');
    const closeBtn = document.getElementById('customerModalClose');
    const cancelBtn = document.getElementById('customerModalCancel');
    const saveBtn = document.getElementById('customerModalSave');
    const searchInput = document.getElementById('customerSearch');

    addBtn.addEventListener('click', () => openCustomerModal());
    closeBtn.addEventListener('click', () => closeCustomerModal());
    cancelBtn.addEventListener('click', () => closeCustomerModal());
    saveBtn.addEventListener('click', () => saveCustomer());

    // Close modal on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeCustomerModal();
    });

    searchInput.addEventListener('input', () => {
      renderCustomers(searchInput.value.trim().toLowerCase());
    });
  }

  async function loadCustomers() {
    try {
      const data = await apiCall('/api/customers');
      customers = data || [];
      renderCustomers();
    } catch (e) {
      console.error('Load customers error:', e);
    }
  }

  function renderCustomers(filter = '') {
    const tbody = document.getElementById('customersTableBody');
    const emptyEl = document.getElementById('customersEmpty');
    const tableEl = document.getElementById('customersTable');

    let filtered = customers;
    if (filter) {
      filtered = customers.filter(c =>
        c.name.toLowerCase().includes(filter) ||
        (c.phone || '').toLowerCase().includes(filter) ||
        (c.gstin || '').toLowerCase().includes(filter)
      );
    }

    if (filtered.length === 0) {
      tableEl.style.display = 'none';
      emptyEl.style.display = 'block';
      return;
    }

    tableEl.style.display = 'table';
    emptyEl.style.display = 'none';

    tbody.innerHTML = filtered.map((c, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.phone || '-'}</td>
        <td>${c.address || '-'}</td>
        <td>${c.gstin || '-'}</td>
        <td>${c.state || 'Maharashtra'}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="window.dashboardApp.editCustomer('${c._id}')">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="window.dashboardApp.deleteCustomer('${c._id}', '${c.name.replace(/'/g, "\\'")}')">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function openCustomerModal(customer = null) {
    const modal = document.getElementById('customerModal');
    const title = document.getElementById('customerModalTitle');

    document.getElementById('customerId').value = customer ? customer._id : '';
    document.getElementById('custName').value = customer ? customer.name : '';
    document.getElementById('custPhone').value = customer ? customer.phone : '';
    document.getElementById('custAddress').value = customer ? customer.address : '';
    document.getElementById('custGstin').value = customer ? customer.gstin : '';
    document.getElementById('custState').value = customer ? customer.state : 'Maharashtra';

    title.textContent = customer ? 'Edit Customer' : 'Add Customer';
    modal.classList.add('show');
  }

  function closeCustomerModal() {
    document.getElementById('customerModal').classList.remove('show');
  }

  async function saveCustomer() {
    const id = document.getElementById('customerId').value;
    const data = {
      name: document.getElementById('custName').value.trim(),
      phone: document.getElementById('custPhone').value.trim(),
      address: document.getElementById('custAddress').value.trim(),
      gstin: document.getElementById('custGstin').value.trim(),
      state: document.getElementById('custState').value.trim()
    };

    if (!data.name) {
      showToast('Customer name is required.', 'error');
      return;
    }

    try {
      if (id) {
        await apiCall(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        showToast('Customer updated!');
      } else {
        await apiCall('/api/customers', { method: 'POST', body: JSON.stringify(data) });
        showToast('Customer added!');
      }
      closeCustomerModal();
      loadCustomers();
    } catch (e) { /* error handled by apiCall */ }
  }

  async function editCustomer(id) {
    const c = customers.find(c => c._id === id);
    if (c) openCustomerModal(c);
  }

  async function deleteCustomer(id, name) {
    if (!confirm(`Delete customer "${name}"?`)) return;
    try {
      await apiCall(`/api/customers/${id}`, { method: 'DELETE' });
      showToast('Customer deleted!');
      loadCustomers();
    } catch (e) { /* error handled by apiCall */ }
  }

  // ==================== PRODUCTS ====================
  function initProducts() {
    const addBtn = document.getElementById('addProductBtn');
    const modal = document.getElementById('productModal');
    const closeBtn = document.getElementById('productModalClose');
    const cancelBtn = document.getElementById('productModalCancel');
    const saveBtn = document.getElementById('productModalSave');
    const searchInput = document.getElementById('productSearch');

    addBtn.addEventListener('click', () => openProductModal());
    closeBtn.addEventListener('click', () => closeProductModal());
    cancelBtn.addEventListener('click', () => closeProductModal());
    saveBtn.addEventListener('click', () => saveProduct());

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeProductModal();
    });

    searchInput.addEventListener('input', () => {
      renderProducts(searchInput.value.trim().toLowerCase());
    });
  }

  async function loadProducts() {
    try {
      const data = await apiCall('/api/products');
      products = data || [];
      renderProducts();
    } catch (e) {
      console.error('Load products error:', e);
    }
  }

  function renderProducts(filter = '') {
    const tbody = document.getElementById('productsTableBody');

    let filtered = products;
    if (filter) {
      filtered = products.filter(p =>
        p.name.toLowerCase().includes(filter) ||
        p.hsn.toLowerCase().includes(filter)
      );
    }

    tbody.innerHTML = filtered.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${p.name}</strong></td>
        <td><span class="badge badge-warning">${p.hsn}</span></td>
        <td>₹${parseFloat(p.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="window.dashboardApp.editProduct('${p._id}')">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="window.dashboardApp.deleteProduct('${p._id}', '${p.name.replace(/'/g, "\\'")}')">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function openProductModal(product = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');

    document.getElementById('productId').value = product ? product._id : '';
    document.getElementById('prodName').value = product ? product.name : '';
    document.getElementById('prodHsn').value = product ? product.hsn : '';
    document.getElementById('prodRate').value = product ? product.rate : '';

    title.textContent = product ? 'Edit Product' : 'Add Product';
    modal.classList.add('show');
  }

  function closeProductModal() {
    document.getElementById('productModal').classList.remove('show');
  }

  async function saveProduct() {
    const id = document.getElementById('productId').value;
    const data = {
      name: document.getElementById('prodName').value.trim(),
      hsn: document.getElementById('prodHsn').value.trim(),
      rate: document.getElementById('prodRate').value
    };

    if (!data.name || !data.hsn || !data.rate) {
      showToast('All product fields are required.', 'error');
      return;
    }

    try {
      if (id) {
        await apiCall(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        showToast('Product updated!');
      } else {
        await apiCall('/api/products', { method: 'POST', body: JSON.stringify(data) });
        showToast('Product added!');
      }
      closeProductModal();
      loadProducts();
    } catch (e) { /* error handled by apiCall */ }
  }

  function editProduct(id) {
    const p = products.find(p => p._id === id);
    if (p) openProductModal(p);
  }

  async function deleteProduct(id, name) {
    if (!confirm(`Delete product "${name}"?`)) return;
    try {
      await apiCall(`/api/products/${id}`, { method: 'DELETE' });
      showToast('Product deleted!');
      loadProducts();
    } catch (e) { /* error handled by apiCall */ }
  }

  // ==================== INVOICE CREATION ====================
  let itemRowCount = 0;

  function initInvoice() {
    document.getElementById('addItemBtn').addEventListener('click', addItemRow);
    document.getElementById('saveBillBtn').addEventListener('click', saveBill);
    document.getElementById('resetInvoiceBtn').addEventListener('click', resetInvoiceForm);

    // Labour & discount change triggers recalculation
    document.getElementById('labourCharge').addEventListener('input', recalculate);
    document.getElementById('discountAmount').addEventListener('input', recalculate);

    // Customer select auto-fill
    document.getElementById('customerSelect').addEventListener('change', (e) => {
      const custId = e.target.value;
      if (!custId) return;
      const c = customers.find(c => c._id === custId);
      if (c) {
        document.getElementById('buyerName').value = c.name;
        document.getElementById('buyerPhone').value = c.phone || '';
        document.getElementById('buyerAddress').value = c.address || '';
        document.getElementById('buyerGstin').value = c.gstin || '';
        document.getElementById('buyerState').value = c.state || 'Maharashtra';
      }
    });

    // Invoice view modal
    document.getElementById('invoiceViewClose').addEventListener('click', closeInvoiceView);
    document.getElementById('invoiceViewCloseBtn').addEventListener('click', closeInvoiceView);
    document.getElementById('invoiceViewDownload').addEventListener('click', () => {
      if (currentViewBillId) downloadExcel(currentViewBillId);
    });
    
    document.getElementById('invoiceViewDownloadPdf').addEventListener('click', () => {
      if (currentViewBillId) downloadPdf(currentViewBillId);
    });
  }

  async function initInvoiceForm() {
    // Load customers for dropdown
    try {
      const custData = await fetch('/api/customers').then(r => r.json());
      customers = Array.isArray(custData) ? custData : [];
    } catch (e) { /* ignore */ }

    const select = document.getElementById('customerSelect');
    select.innerHTML = '<option value="">-- Select a customer --</option>';
    customers.forEach(c => {
      select.innerHTML += `<option value="${c._id}">${c.name}</option>`;
    });

    // Load products for item dropdowns
    try {
      const prodData = await fetch('/api/products').then(r => r.json());
      products = Array.isArray(prodData) ? prodData : [];
    } catch (e) { /* ignore */ }

    // Get next invoice number
    try {
      const data = await apiCall('/api/bills/next-invoice-number');
      document.getElementById('invoiceNo').value = data.invoiceNo;
    } catch (e) {
      document.getElementById('invoiceNo').value = 'AC-' + new Date().getFullYear() + '-0001';
    }

    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;

    // Reset items - add 1 empty row
    const container = document.getElementById('itemsContainer');
    container.innerHTML = '';
    itemRowCount = 0;
    addItemRow();

    // Reset calculations
    document.getElementById('labourCharge').value = 0;
    document.getElementById('discountAmount').value = 0;
    editingBillId = null;
    document.getElementById('saveBillBtn').innerHTML = '💾 Save & Download Excel';
    recalculate();
  }

  function addItemRow() {
    itemRowCount++;
    const container = document.getElementById('itemsContainer');

    const row = document.createElement('div');
    row.className = 'item-row';
    row.setAttribute('data-row', itemRowCount);

    // Build product options
    let productOptions = '<option value="">-- Select --</option>';
    products.forEach(p => {
      productOptions += `<option value="${p._id}" data-hsn="${p.hsn}" data-rate="${p.rate}">${p.name}</option>`;
    });

    row.innerHTML = `
      <div class="form-group">
        <div class="sno-display">${itemRowCount}</div>
      </div>
      <div class="form-group">
        <select class="item-product" onchange="window.dashboardApp.onProductSelect(this)">
          ${productOptions}
        </select>
      </div>
      <div class="form-group">
        <input type="text" class="item-hsn" placeholder="HSN" readonly>
      </div>
      <div class="form-group">
        <input type="number" class="item-qty" placeholder="Qty" min="0" step="1" value="" oninput="window.dashboardApp.recalculate()">
      </div>
      <div class="form-group">
        <input type="number" class="item-rate" placeholder="Rate" min="0" step="0.01" value="" oninput="window.dashboardApp.recalculate()">
      </div>
      <div class="form-group">
        <input type="text" class="item-amount" placeholder="0.00" readonly style="background:var(--bg-secondary); font-weight:600;">
      </div>
      <button class="remove-item-btn" onclick="window.dashboardApp.removeItemRow(this)" title="Remove item">✕</button>
    `;

    container.appendChild(row);
  }

  function removeItemRow(btn) {
    const row = btn.closest('.item-row');
    row.remove();
    renumberItems();
    recalculate();
  }

  function renumberItems() {
    const rows = document.querySelectorAll('#itemsContainer .item-row');
    rows.forEach((row, i) => {
      row.querySelector('.sno-display').textContent = i + 1;
    });
    itemRowCount = rows.length;
  }

  function onProductSelect(selectEl) {
    const row = selectEl.closest('.item-row');
    const option = selectEl.options[selectEl.selectedIndex];

    if (option.value) {
      row.querySelector('.item-hsn').value = option.getAttribute('data-hsn') || '';
      row.querySelector('.item-rate').value = option.getAttribute('data-rate') || '';
    } else {
      row.querySelector('.item-hsn').value = '';
      row.querySelector('.item-rate').value = '';
    }
    recalculate();
  }

  function recalculate() {
    const rows = document.querySelectorAll('#itemsContainer .item-row');
    let total = 0;

    rows.forEach(row => {
      const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
      const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
      const amount = qty * rate;
      row.querySelector('.item-amount').value = amount.toFixed(2);
      total += amount;
    });

    const cgst = total * 0.025;
    const sgst = total * 0.025;
    const labour = parseFloat(document.getElementById('labourCharge').value) || 0;
    const discount = parseFloat(document.getElementById('discountAmount').value) || 0;
    const grandTotal = total + cgst + sgst + labour - discount;

    document.getElementById('calcTotal').textContent = formatCurrency(total);
    document.getElementById('calcCgst').textContent = formatCurrency(cgst);
    document.getElementById('calcSgst').textContent = formatCurrency(sgst);
    document.getElementById('calcGrandTotal').textContent = formatCurrency(grandTotal);

    document.getElementById('amountInWords').textContent =
      'Amount in words: ' + numberToWordsClient(Math.max(0, grandTotal));
  }

  function resetInvoiceForm() {
    if (confirm('Reset the invoice form? All entered data will be lost.')) {
      initInvoiceForm();
    }
  }

  async function saveBill() {
    const invoiceNo = document.getElementById('invoiceNo').value;
    const invoiceDate = document.getElementById('invoiceDate').value;
    const buyerName = document.getElementById('buyerName').value.trim();

    if (!buyerName) {
      showToast('Please select or enter a customer name.', 'error');
      return;
    }

    // Gather items
    const rows = document.querySelectorAll('#itemsContainer .item-row');
    const items = [];

    rows.forEach((row, i) => {
      const productSelect = row.querySelector('.item-product');
      const name = productSelect.options[productSelect.selectedIndex]?.text || '';
      const hsn = row.querySelector('.item-hsn').value;
      const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
      const rate = parseFloat(row.querySelector('.item-rate').value) || 0;

      if (name && name !== '-- Select --' && qty > 0 && rate > 0) {
        items.push({ name, hsn, qty, rate });
      }
    });

    if (items.length === 0) {
      showToast('Please add at least one item with quantity and rate.', 'error');
      return;
    }

    const billData = {
      invoiceNo,
      invoiceDate,
      customer: {
        name: buyerName,
        phone: document.getElementById('buyerPhone').value.trim(),
        address: document.getElementById('buyerAddress').value.trim(),
        gstin: document.getElementById('buyerGstin').value.trim(),
        state: document.getElementById('buyerState').value.trim()
      },
      items,
      labourCharge: parseFloat(document.getElementById('labourCharge').value) || 0,
      discount: parseFloat(document.getElementById('discountAmount').value) || 0
    };

    const saveBtn = document.getElementById('saveBillBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner"></span> Saving...';

    try {
      const url = editingBillId ? `/api/bills/${editingBillId}` : '/api/bills/create-bill';
      const method = editingBillId ? 'PUT' : 'POST';

      const bill = await apiCall(url, {
        method: method,
        body: JSON.stringify(billData)
      });

      showToast(editingBillId ? 'Invoice updated successfully!' : 'Invoice saved successfully!');

      // Download Excel
      downloadExcel(bill._id);

      // Reset form for next invoice
      editingBillId = null;
      setTimeout(() => initInvoiceForm(), 1000);
    } catch (e) {
      /* error handled by apiCall */
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = editingBillId ? '💾 Update & Download Excel' : '💾 Save & Download Excel';
    }
  }

  async function editBill(id) {
    try {
      const bill = await apiCall(`/api/bills/${id}`);
      editingBillId = bill._id;
      
      // Switch to invoice tab
      document.querySelector('.nav-item[data-section="create-invoice"]').click();
      
      // Populate form
      document.getElementById('invoiceNo').value = bill.invoiceNo;
      
      // Format date for date input
      const date = new Date(bill.invoiceDate);
      document.getElementById('invoiceDate').value = date.toISOString().split('T')[0];
      
      // Set customer dropdown and fields
      const custSelect = document.getElementById('customerSelect');
      let foundCustomer = false;
      for (let i = 0; i < custSelect.options.length; i++) {
        if (custSelect.options[i].text === bill.customer.name) {
          custSelect.selectedIndex = i;
          foundCustomer = true;
          break;
        }
      }
      if (!foundCustomer) custSelect.value = '';
      
      document.getElementById('buyerName').value = bill.customer.name;
      document.getElementById('buyerPhone').value = bill.customer.phone || '';
      document.getElementById('buyerAddress').value = bill.customer.address || '';
      document.getElementById('buyerGstin').value = bill.customer.gstin || '';
      document.getElementById('buyerState').value = bill.customer.state || 'Maharashtra';
      
      // Populate items
      const container = document.getElementById('itemsContainer');
      container.innerHTML = '';
      itemRowCount = 0;
      
      bill.items.forEach(item => {
        addItemRow();
        const row = container.lastElementChild;
        
        // Find product in dropdown
        const prodSelect = row.querySelector('.item-product');
        for (let i = 0; i < prodSelect.options.length; i++) {
          if (prodSelect.options[i].text === item.name) {
            prodSelect.selectedIndex = i;
            break;
          }
        }
        
        row.querySelector('.item-hsn').value = item.hsn;
        row.querySelector('.item-qty').value = item.qty;
        row.querySelector('.item-rate').value = item.rate;
        row.querySelector('.item-amount').value = item.amount;
      });
      
      document.getElementById('labourCharge').value = bill.labourCharge || 0;
      document.getElementById('discountAmount').value = bill.discount || 0;
      
      document.getElementById('saveBillBtn').innerHTML = '💾 Update & Download Excel';
      recalculate();
    } catch (e) {
      console.error('Error loading bill for edit', e);
    }
  }

  // ==================== INVOICE HISTORY ====================
  async function loadHistory() {
    try {
      const data = await apiCall('/api/bills');
      bills = data || [];
      renderHistory();
    } catch (e) {
      console.error('Load history error:', e);
    }
  }

  function renderHistory(filter = '') {
    const tbody = document.getElementById('historyTableBody');
    const emptyEl = document.getElementById('historyEmpty');
    const tableEl = document.getElementById('historyTable');

    let filtered = bills;
    if (filter) {
      filtered = bills.filter(b =>
        b.invoiceNo.toLowerCase().includes(filter) ||
        b.customer.name.toLowerCase().includes(filter)
      );
    }

    if (filtered.length === 0) {
      tableEl.style.display = 'none';
      emptyEl.style.display = 'block';
      return;
    }

    tableEl.style.display = 'table';
    emptyEl.style.display = 'none';

    tbody.innerHTML = filtered.map(b => `
      <tr>
        <td><strong style="color:var(--accent);">${b.invoiceNo}</strong></td>
        <td>${formatDate(b.invoiceDate)}</td>
        <td>${b.customer.name}</td>
        <td><strong>${formatCurrency(b.grandTotal)}</strong></td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-secondary" onclick="window.dashboardApp.viewBill('${b._id}')" title="Preview">👁️</button>
            <button class="btn btn-sm btn-secondary" onclick="window.dashboardApp.editBill('${b._id}')" title="Edit">✏️</button>
            <button class="btn btn-sm btn-primary" onclick="window.dashboardApp.downloadExcel('${b._id}')" title="Excel">📥</button>
            <button class="btn btn-sm btn-danger" onclick="window.dashboardApp.deleteBill('${b._id}', '${b.invoiceNo}')" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // History search
  const historySearch = document.getElementById('historySearch');
  if (historySearch) {
    historySearch.addEventListener('input', () => {
      renderHistory(historySearch.value.trim().toLowerCase());
    });
  }

  // ==================== VIEW BILL (Preview Modal) ====================
  async function viewBill(id) {
    currentViewBillId = id;
    try {
      const bill = await apiCall(`/api/bills/${id}`);
      renderInvoicePreview(bill);
      document.getElementById('invoiceViewModal').classList.add('show');
    } catch (e) { /* error handled */ }
  }

  function closeInvoiceView() {
    document.getElementById('invoiceViewModal').classList.remove('show');
    currentViewBillId = null;
  }

  function renderInvoicePreview(bill) {
    const container = document.getElementById('invoicePreviewContent');
    const date = formatDate(bill.invoiceDate);

    let itemsHtml = '';
    const maxItemRows = bill.items.length; // only actual items, no blank rows
    
    for (let i = 0; i < maxItemRows; i++) {
      const item = bill.items[i];
      if (item) {
        itemsHtml += `
          <tr>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.sno}</td>
            <td style="border: 1px solid #000; padding: 4px;">${item.name}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.hsn}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.qty}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: right;">${parseFloat(item.rate).toFixed(2)}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: right;">${parseFloat(item.amount).toFixed(2)}</td>
          </tr>`;
      } else {
        itemsHtml += `
          <tr>
            <td style="border: 1px solid #000; padding: 4px; height: 26px;"></td>
            <td style="border: 1px solid #000; padding: 4px;"></td>
            <td style="border: 1px solid #000; padding: 4px;"></td>
            <td style="border: 1px solid #000; padding: 4px;"></td>
            <td style="border: 1px solid #000; padding: 4px;"></td>
            <td style="border: 1px solid #000; padding: 4px;"></td>
          </tr>`;
      }
    }

    container.innerHTML = `
      <div style="background:#fff; color:#000; font-family:'Calibri', sans-serif; padding:10px;">
        <table style="width:100%; border-collapse: collapse; table-layout: fixed; border: 2px solid #000; font-size: 13px; font-family:'Calibri', sans-serif;">
          <colgroup>
            <col style="width: 8%;">
            <col style="width: 36%;">
            <col style="width: 12%;">
            <col style="width: 14%;">
            <col style="width: 14%;">
            <col style="width: 16%;">
          </colgroup>

          <!-- Row 1 & 2 -->
          <tr>
            <td colspan="2" rowspan="2" style="border-top: 1px solid #000; border-bottom: 1px solid #000; border-left: 1px solid #000;"></td>
            <td colspan="2" rowspan="2" style="border-top: 1px solid #000; border-bottom: 1px solid #000; text-align: center; font-size: 26px; font-weight: bold; vertical-align: middle;">Tax Invoice</td>
            <td colspan="2" style="border-top: 1px solid #000; border-right: 1px solid #000; padding: 4px; font-weight: bold; white-space: nowrap;">Invoice Date:-&nbsp;&nbsp;&nbsp;${date}</td>
          </tr>
          <tr>
            <td colspan="2" style="border-right: 1px solid #000; padding: 4px; font-weight: bold; white-space: nowrap;">Invoice No:-&nbsp;&nbsp;&nbsp;${bill.invoiceNo}</td>
          </tr>

          <!-- Business Info -->
          <tr>
            <td colspan="6" style="border: 1px solid #000; padding: 4px; font-weight: bold; border-bottom: none;">Business Name: ANUSHREE CONSTRUCTION</td>
          </tr>
          <tr>
            <td colspan="6" style="border: 1px solid #000; padding: 4px; border-top: none; border-bottom: none; font-weight: bold;">Address: A/P RAKSHEWADI CHAKAN TAL.KHED PUNE- 410501</td>
          </tr>
          <tr>
            <td colspan="6" style="border: 1px solid #000; padding: 4px; border-top: none; border-bottom: none; font-weight: bold;">Contact : 9850031170 / anushreeconstruction1566@gmail.com</td>
          </tr>
          <tr>
            <td colspan="6" style="border: 1px solid #000; padding: 4px; border-top: none; font-weight: bold;">GSTIN : 27CVFPP1152A1ZZ</td>
          </tr>

          <!-- Buyer Details -->
          <tr>
            <td colspan="6" style="border: 1px solid #000; padding: 4px; font-weight: bold; border-bottom: none;">Buyer Details :</td>
          </tr>
          <tr>
            <td colspan="6" style="border: 1px solid #000; padding: 4px; border-top: none; border-bottom: none; font-weight: bold;">Name: ${bill.customer.name}</td>
          </tr>
          <tr>
            <td colspan="6" style="border: 1px solid #000; padding: 4px; border-top: none; height: 50px; vertical-align: top; font-weight: bold;">
              Address: ${bill.customer.address}<br>
              GSTIN (if applicable): ${bill.customer.gstin || ''}<br>
              State: ${bill.customer.state || 'Maharashtra'}
            </td>
          </tr>

          <!-- Headers -->
          <tr>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">S.NO</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">ITEM NAME</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">HSN</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">QTY</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">RATE</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">AMOUNT</th>
          </tr>

          <!-- Items -->
          ${itemsHtml}

          <!-- Summary / Bank -->
          <tr>
            <td colspan="3" style="border: 1px solid #000; padding: 4px; border-bottom: none;">Bank Details</td>
            <td colspan="2" style="border: 1px solid #000; padding: 4px; font-weight: bold;">Total</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: right;">${parseFloat(bill.total).toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="border: 1px solid #000; padding: 4px; border-top: none; border-bottom: none;">The Nasik Merchants Co-operative</td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold;">CGST</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">2.50%</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: right;">${parseFloat(bill.cgst).toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="border: 1px solid #000; padding: 4px; border-top: none; border-bottom: none;">Bank Ltd.Nashik</td>
            <td style="border: 1px solid #000; padding: 4px; font-weight: bold;">SGST</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">2.50%</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: right;">${parseFloat(bill.sgst).toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="border: 1px solid #000; padding: 4px; border-top: none; border-bottom: none; height: 35px; vertical-align: top;">
              Bank Account No :<br>065100100000011
            </td>
            <td colspan="2" style="border: 1px solid #000; padding: 4px; font-weight: bold;">Labour Charge</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: right;">${parseFloat(bill.labourCharge).toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="border: 1px solid #000; padding: 4px; border-top: none; border-bottom: none;">Branch Name     : Chakan</td>
            <td colspan="2" style="border: 1px solid #000; padding: 4px; font-weight: bold;">Discount</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: right;">${parseFloat(bill.discount).toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3" style="border: 1px solid #000; padding: 4px; border-top: none;">Bank IFSC Code  : NMCB0000066</td>
            <td colspan="2" style="border: 1px solid #000; padding: 4px; font-weight: bold; font-size: 14px;">Amount</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold; font-size: 14px;">${parseFloat(bill.grandTotal).toFixed(2)}</td>
          </tr>

          <!-- Amount in words -->
          <tr>
            <td colspan="3" style="border-left: 1px solid #000; border-right: 1px solid #000; border-top: 1px solid #000; border-bottom: none; height: 20px;"></td>
            <td colspan="3" style="border-left: 1px solid #000; border-right: 1px solid #000; border-top: 1px solid #000; border-bottom: none; padding: 4px; font-weight: bold;">Amount in words:-</td>
          </tr>
          <tr>
            <td colspan="3" style="border-left: 1px solid #000; border-right: 1px solid #000; border-top: none; border-bottom: none; height: 20px;"></td>
            <td colspan="3" style="border-left: 1px solid #000; border-right: 1px solid #000; border-top: none; border-bottom: 1px solid #000; padding: 4px; font-weight: bold; vertical-align: top;">${bill.amountInWords}</td>
          </tr>

          <!-- Blank space rows (left/right borders only) -->
          <tr>
            <td colspan="3" style="border-left: 1px solid #000; border-right: 1px solid #000; border-top: none; border-bottom: none; height: 25px;"></td>
            <td colspan="3" style="border-left: 1px solid #000; border-right: 1px solid #000; border-top: none; border-bottom: none; height: 25px;"></td>
          </tr>
          <tr>
            <td colspan="3" style="border-left: 1px solid #000; border-right: 1px solid #000; border-top: none; border-bottom: none; height: 25px;"></td>
            <td colspan="3" style="border-left: 1px solid #000; border-right: 1px solid #000; border-top: none; border-bottom: none; height: 25px;"></td>
          </tr>
          <tr>
            <td colspan="3" style="border-left: 1px solid #000; border-right: 1px solid #000; border-top: none; border-bottom: none; height: 25px;"></td>
            <td colspan="3" style="border-left: 1px solid #000; border-right: 1px solid #000; border-top: none; border-bottom: none; height: 25px;"></td>
          </tr>
          <tr>
            <td colspan="3" style="border-left: 1px solid #000; border-right: 1px solid #000; border-top: none; border-bottom: none; height: 25px;"></td>
            <td colspan="3" style="border-left: 1px solid #000; border-right: 1px solid #000; border-top: none; border-bottom: none; height: 25px;"></td>
          </tr>
          <tr>
            <td colspan="3" style="border-left: 1px solid #000; border-right: 1px solid #000; border-top: none; border-bottom: none; height: 25px;"></td>
            <td colspan="3" style="border-left: 1px solid #000; border-right: 1px solid #000; border-top: none; border-bottom: none; height: 25px;"></td>
          </tr>

          <!-- Signature -->
          <tr>
            <td colspan="3" style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: bottom; height: 45px;">For Receiver</td>
            <td colspan="3" style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: bottom; height: 45px;">For Anushree Construction</td>
          </tr>
        </table>
      </div>
    `;
  }

  // ==================== DOWNLOAD EXCEL ====================
  function downloadExcel(id) {
    const link = document.createElement('a');
    link.href = `/api/download-excel/${id}`;
    link.click();
    showToast('Downloading Excel invoice...', 'info');
  }

  // ==================== DOWNLOAD PDF ====================
  function downloadPdf(id) {
    const bill = bills.find(b => b._id === id);
    if (!bill) return;

    const date = formatDate(bill.invoiceDate);
    const bc = 'border:1px solid #000;'; // border shorthand
    const bk = 'color:#000;'; // black text shorthand
    const bd = 'font-weight:bold;'; // bold shorthand

    // Build item rows
    const maxRows = bill.items.length; // only actual items
    let itemsHtml = '';
    for (let i = 0; i < maxRows; i++) {
      const item = bill.items[i];
      if (item) {
        itemsHtml += `<tr>
          <td style="${bc}${bk}padding:4px;text-align:center;">${item.sno}</td>
          <td style="${bc}${bk}padding:4px;">${item.name}</td>
          <td style="${bc}${bk}padding:4px;text-align:center;">${item.hsn}</td>
          <td style="${bc}${bk}padding:4px;text-align:center;">${item.qty}</td>
          <td style="${bc}${bk}padding:4px;text-align:right;">${parseFloat(item.rate).toFixed(2)}</td>
          <td style="${bc}${bk}padding:4px;text-align:right;">${parseFloat(item.amount).toFixed(2)}</td>
        </tr>`;
      } else {
        itemsHtml += `<tr>
          <td style="${bc}padding:4px;height:24px;"></td>
          <td style="${bc}padding:4px;"></td>
          <td style="${bc}padding:4px;"></td>
          <td style="${bc}padding:4px;"></td>
          <td style="${bc}padding:4px;"></td>
          <td style="${bc}padding:4px;"></td>
        </tr>`;
      }
    }

    // Build a completely standalone HTML string — no CSS inheritance from the page
    const pdfHtml = `
    <div style="background:#fff;color:#000;font-family:'Calibri',sans-serif;padding:0;margin:0;font-size:13px;">
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;${bc}${bk}font-family:'Calibri',sans-serif;">
        <colgroup>
          <col style="width:8%"><col style="width:36%"><col style="width:12%">
          <col style="width:14%"><col style="width:14%"><col style="width:16%">
        </colgroup>

        <!-- Row 1 & 2: Header -->
        <tr>
          <td colspan="2" rowspan="2" style="border-top:1px solid #000;border-bottom:1px solid #000;border-left:1px solid #000;${bk}"></td>
          <td colspan="2" rowspan="2" style="border-top:1px solid #000;border-bottom:1px solid #000;${bk}${bd}text-align:center;font-size:26px;vertical-align:middle;">Tax Invoice</td>
          <td colspan="2" style="border-top:1px solid #000;border-right:1px solid #000;${bk}${bd}padding:4px;white-space:nowrap;">Invoice Date:-&nbsp;&nbsp;&nbsp;${date}</td>
        </tr>
        <tr>
          <td colspan="2" style="border-bottom:1px solid #000;border-right:1px solid #000;${bk}${bd}padding:4px;white-space:nowrap;">Invoice No:-&nbsp;&nbsp;&nbsp;${bill.invoiceNo}</td>
        </tr>

        <!-- Business Info -->
        <tr><td colspan="6" style="border-left:1px solid #000;border-right:1px solid #000;border-top:1px solid #000;${bk}${bd}padding:4px;">Business Name: ANUSHREE CONSTRUCTION</td></tr>
        <tr><td colspan="6" style="border-left:1px solid #000;border-right:1px solid #000;${bk}${bd}padding:4px;">Address: A/P RAKSHEWADI CHAKAN TAL.KHED PUNE- 410501</td></tr>
        <tr><td colspan="6" style="border-left:1px solid #000;border-right:1px solid #000;${bk}${bd}padding:4px;">Contact : 9850031170 / anushreeconstruction1566@gmail.com</td></tr>
        <tr><td colspan="6" style="border-left:1px solid #000;border-right:1px solid #000;border-bottom:1px solid #000;${bk}${bd}padding:4px;">GSTIN : 27CVFPP1152A1ZZ</td></tr>

        <!-- Buyer Details -->
        <tr><td colspan="6" style="border-left:1px solid #000;border-right:1px solid #000;border-top:1px solid #000;${bk}${bd}padding:4px;">Buyer Details :</td></tr>
        <tr><td colspan="6" style="border-left:1px solid #000;border-right:1px solid #000;${bk}${bd}padding:4px;">Name: ${bill.customer.name}</td></tr>
        <tr><td colspan="6" style="border-left:1px solid #000;border-right:1px solid #000;border-bottom:1px solid #000;${bk}${bd}padding:4px;vertical-align:top;height:50px;">Address: ${bill.customer.address}<br>GSTIN (if applicable): ${bill.customer.gstin || ''}<br>State: ${bill.customer.state || 'Maharashtra'}</td></tr>

        <!-- Table Headers -->
        <tr>
          <td style="${bc}${bk}${bd}padding:6px;text-align:center;">S.NO</td>
          <td style="${bc}${bk}${bd}padding:6px;text-align:center;">ITEM NAME</td>
          <td style="${bc}${bk}${bd}padding:6px;text-align:center;">HSN</td>
          <td style="${bc}${bk}${bd}padding:6px;text-align:center;">QTY</td>
          <td style="${bc}${bk}${bd}padding:6px;text-align:center;">RATE</td>
          <td style="${bc}${bk}${bd}padding:6px;text-align:center;">AMOUNT</td>
        </tr>

        <!-- Items -->
        ${itemsHtml}

        <!-- Bank Details & Summary -->
        <tr>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;border-top:1px solid #000;${bk}padding:4px;">Bank Details</td>
          <td colspan="2" style="${bc}${bk}${bd}padding:4px;">Total</td>
          <td style="${bc}${bk}padding:4px;text-align:right;">${parseFloat(bill.total).toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;${bk}padding:4px;">The Nasik Merchants Co-operative</td>
          <td style="${bc}${bk}${bd}padding:4px;">CGST</td>
          <td style="${bc}${bk}${bd}padding:4px;text-align:right;">2.50%</td>
          <td style="${bc}${bk}padding:4px;text-align:right;">${parseFloat(bill.cgst).toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;${bk}padding:4px;">Bank Ltd.Nashik</td>
          <td style="${bc}${bk}${bd}padding:4px;">SGST</td>
          <td style="${bc}${bk}${bd}padding:4px;text-align:right;">2.50%</td>
          <td style="${bc}${bk}padding:4px;text-align:right;">${parseFloat(bill.sgst).toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;${bk}padding:4px;vertical-align:top;height:35px;">Bank Account No :<br>065100100000011</td>
          <td colspan="2" style="${bc}${bk}${bd}padding:4px;">Labour Charge</td>
          <td style="${bc}${bk}padding:4px;text-align:right;">${parseFloat(bill.labourCharge).toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;${bk}padding:4px;">Branch Name     : Chakan</td>
          <td colspan="2" style="${bc}${bk}${bd}padding:4px;">Discount</td>
          <td style="${bc}${bk}padding:4px;text-align:right;">${parseFloat(bill.discount).toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;border-bottom:1px solid #000;${bk}padding:4px;">Bank IFSC Code  : NMCB0000066</td>
          <td colspan="2" style="${bc}${bk}${bd}padding:4px;font-size:14px;">Amount</td>
          <td style="${bc}${bk}${bd}padding:4px;text-align:right;font-size:14px;">${parseFloat(bill.grandTotal).toFixed(2)}</td>
        </tr>

        <!-- Amount in Words -->
        <tr>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;border-top:1px solid #000;border-bottom:none;${bk}height:20px;"></td>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;border-top:1px solid #000;border-bottom:none;${bk}${bd}padding:4px;">Amount in words:-</td>
        </tr>
        <tr>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;border-top:none;border-bottom:none;${bk}height:20px;"></td>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;border-top:none;border-bottom:1px solid #000;${bk}${bd}padding:4px;vertical-align:top;">${bill.amountInWords}</td>
        </tr>

        <!-- Blank space rows (left/right borders only) -->
        <tr>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;border-top:none;border-bottom:none;height:25px;"></td>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;border-top:none;border-bottom:none;height:25px;"></td>
        </tr>
        <tr>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;border-top:none;border-bottom:none;height:25px;"></td>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;border-top:none;border-bottom:none;height:25px;"></td>
        </tr>
        <tr>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;border-top:none;border-bottom:none;height:25px;"></td>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;border-top:none;border-bottom:none;height:25px;"></td>
        </tr>
        <tr>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;border-top:none;border-bottom:none;height:25px;"></td>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;border-top:none;border-bottom:none;height:25px;"></td>
        </tr>
        <tr>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;border-top:none;border-bottom:none;height:25px;"></td>
          <td colspan="3" style="border-left:1px solid #000;border-right:1px solid #000;border-top:none;border-bottom:none;height:25px;"></td>
        </tr>

        <!-- Signature -->
        <tr>
          <td colspan="3" style="${bc}${bk}padding:4px;text-align:center;vertical-align:bottom;height:45px;">For Receiver</td>
          <td colspan="3" style="${bc}${bk}padding:4px;text-align:center;vertical-align:bottom;height:45px;">For Anushree Construction</td>
        </tr>
      </table>
    </div>`;

    const opt = {
      margin:       [0.3, 0.3],
      filename:     `Invoice_${bill.invoiceNo.replace(/\//g, '-')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    showToast('Generating PDF...', 'info');
    html2pdf().set(opt).from(pdfHtml).save();
  }

  // ==================== DELETE BILL ====================
  async function deleteBill(id, invoiceNo) {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNo}? This cannot be undone.`)) {
      return;
    }
    try {
      await apiCall(`/api/bills/${id}`, { method: 'DELETE' });
      showToast(`Invoice ${invoiceNo} deleted successfully!`, 'success');
      // Reload data
      await loadDashboardData();
      renderHistory();
    } catch (e) {
      // error already shown by apiCall
    }
  }

  // ==================== Expose functions globally ====================
  window.dashboardApp = {
    editCustomer,
    deleteCustomer,
    editProduct,
    deleteProduct,
    viewBill,
    editBill,
    deleteBill,
    downloadExcel,
    downloadPdf,
    onProductSelect,
    recalculate,
    removeItemRow
  };
});
