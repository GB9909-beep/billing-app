const ExcelJS = require('exceljs');

/**
 * Generate an Excel invoice matching the EXACT template format.
 * Returns an ExcelJS workbook buffer.
 */
async function generateInvoiceExcel(bill) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Tax Invoice', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5, right: 0.5,
        top: 0.5, bottom: 0.5,
        header: 0.3, footer: 0.3
      }
    }
  });

  // Column widths matching the image proportions
  sheet.columns = [
    { key: 'A', width: 8 },   // S.NO
    { key: 'B', width: 30 },  // ITEM NAME
    { key: 'C', width: 12 },  // HSN
    { key: 'D', width: 12 },  // QTY / CGST
    { key: 'E', width: 14 },  // RATE / 2.50%
    { key: 'F', width: 16 }   // AMOUNT
  ];

  // Default font for entire workbook
  const defaultFont = { name: 'Calibri', size: 12 };
  const defaultFontBold = { ...defaultFont, bold: true };

  const thin = { style: 'thin', color: { argb: 'FF000000' } };
  const borderAll = { top: thin, left: thin, bottom: thin, right: thin };

  // Helper to format date
  const invoiceDate = new Date(bill.invoiceDate);
  const dateStr = `${invoiceDate.getUTCDate().toString().padStart(2, '0')}/${(invoiceDate.getUTCMonth() + 1).toString().padStart(2, '0')}/${invoiceDate.getUTCFullYear()}`;

  // Helper: set left/right borders only for A:C merged cells
  const setAcBoxBorder = (rowNum, isTop, isBottom) => {
    ['A','B','C'].forEach(c => {
      sheet.getCell(`${c}${rowNum}`).border = {
        left: c === 'A' ? thin : undefined,
        right: c === 'C' ? thin : undefined,
        top: isTop ? thin : undefined,
        bottom: isBottom ? thin : undefined
      };
    });
  };

  // Helper: set left/right borders for full row (A:F)
  const setFullRowBorder = (rowNum, isTop, isBottom) => {
    ['A','B','C','D','E','F'].forEach(c => {
      sheet.getCell(`${c}${rowNum}`).border = {
        left: c === 'A' ? thin : undefined,
        right: c === 'F' ? thin : undefined,
        top: isTop ? thin : undefined,
        bottom: isBottom ? thin : undefined
      };
    });
  };

  // ==================== ROW 1 & 2: Header ====================
  sheet.mergeCells('A1:B2');
  ['A', 'B'].forEach(c => {
    sheet.getCell(`${c}1`).border = { top: thin, left: c === 'A' ? thin : undefined };
    sheet.getCell(`${c}2`).border = { bottom: thin, left: c === 'A' ? thin : undefined };
  });

  sheet.mergeCells('C1:D2');
  const taxInvoiceCell = sheet.getCell('C1');
  taxInvoiceCell.value = 'Tax Invoice';
  taxInvoiceCell.font = { ...defaultFont, bold: true, size: 22 };
  taxInvoiceCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ['C', 'D'].forEach(c => {
    sheet.getCell(`${c}1`).border = { top: thin };
    sheet.getCell(`${c}2`).border = { bottom: thin };
  });

  sheet.mergeCells('E1:F1');
  sheet.getCell('E1').value = `Invoice Date:-   ${dateStr}`;
  sheet.getCell('E1').font = defaultFontBold;
  sheet.getCell('E1').alignment = { horizontal: 'left', vertical: 'middle' };
  ['E1', 'F1'].forEach(c => {
    sheet.getCell(c).border = { top: thin, right: c === 'F1' ? thin : undefined };
  });

  sheet.mergeCells('E2:F2');
  sheet.getCell('E2').value = `Invoice No:-   ${bill.invoiceNo}`;
  sheet.getCell('E2').font = defaultFontBold;
  sheet.getCell('E2').alignment = { horizontal: 'left', vertical: 'middle' };
  ['E2', 'F2'].forEach(c => {
    sheet.getCell(c).border = { bottom: thin, right: c === 'F2' ? thin : undefined };
  });

  sheet.getRow(1).height = 28;
  sheet.getRow(2).height = 28;

  // ==================== ROW 3 to 6: Business Details ====================
  const bizDetails = [
    'Business Name: ANUSHREE CONSTRUCTION',
    'Address: A/P RAKSHEWADI CHAKAN TAL.KHED PUNE- 410501',
    'Contact : 9850031170 / anushreeconstruction1566@gmail.com',
    'GSTIN : 27CVFPP1152A1ZZ'
  ];
  
  for (let r = 3; r <= 6; r++) {
    sheet.mergeCells(`A${r}:F${r}`);
    sheet.getCell(`A${r}`).value = bizDetails[r - 3];
    sheet.getCell(`A${r}`).font = defaultFontBold;
    sheet.getCell(`A${r}`).alignment = { vertical: 'middle' };
    sheet.getRow(r).height = 25;
    setFullRowBorder(r, r === 3, r === 6);
  }

  // ==================== ROW 7: Buyer Details Header ====================
  sheet.mergeCells('A7:F7');
  sheet.getCell('A7').value = 'Buyer Details :';
  sheet.getCell('A7').font = defaultFontBold;
  sheet.getCell('A7').alignment = { vertical: 'middle' };
  sheet.getRow(7).height = 25;
  setFullRowBorder(7, true, false);

  // ==================== ROW 8: Name ====================
  sheet.mergeCells('A8:F8');
  sheet.getCell('A8').value = `Name: ${bill.customer.name}`;
  sheet.getCell('A8').font = defaultFontBold;
  sheet.getCell('A8').alignment = { vertical: 'middle' };
  sheet.getRow(8).height = 25;
  setFullRowBorder(8, false, false);

  // ==================== ROW 9: Address ====================
  sheet.mergeCells('A9:F9');
  sheet.getCell('A9').value = `Address: ${bill.customer.address}`;
  sheet.getCell('A9').font = defaultFontBold;
  sheet.getCell('A9').alignment = { vertical: 'middle' };
  sheet.getRow(9).height = 25;
  setFullRowBorder(9, false, false);

  // ==================== ROW 10: GSTIN ====================
  sheet.mergeCells('A10:F10');
  sheet.getCell('A10').value = `GSTIN (if applicable): ${bill.customer.gstin || ''}`;
  sheet.getCell('A10').font = defaultFontBold;
  sheet.getCell('A10').alignment = { vertical: 'middle' };
  sheet.getRow(10).height = 25;
  setFullRowBorder(10, false, false);

  // ==================== ROW 11: State ====================
  sheet.mergeCells('A11:F11');
  sheet.getCell('A11').value = `State: ${bill.customer.state || 'Maharashtra'}`;
  sheet.getCell('A11').font = defaultFontBold;
  sheet.getCell('A11').alignment = { vertical: 'middle' };
  sheet.getRow(11).height = 25;
  setFullRowBorder(11, false, true);

  // ==================== ROW 12: Table Headers ====================
  const headers = ['S.NO', 'ITEM NAME', 'HSN', 'QTY', 'RATE', 'AMOUNT'];
  const headerRow = sheet.getRow(12);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = defaultFontBold;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = borderAll;
  });
  headerRow.height = 26;

  // ==================== ROWS 13+: Item Rows ====================
  const itemStartRow = 13;
  const maxItemRows = bill.items.length;

  for (let i = 0; i < maxItemRows; i++) {
    const row = sheet.getRow(itemStartRow + i);
    const item = bill.items[i];

    row.getCell(1).value = item.sno;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(1).font = defaultFont;
    row.getCell(2).value = item.name;
    row.getCell(2).font = defaultFont;
    row.getCell(2).alignment = { vertical: 'middle' };
    row.getCell(3).value = item.hsn;
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).font = defaultFont;
    row.getCell(4).value = item.qty;
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).font = defaultFont;
    row.getCell(5).value = item.rate;
    row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(5).numFmt = '0.00';
    row.getCell(5).font = defaultFont;
    row.getCell(6).value = item.amount;
    row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(6).numFmt = '0.00';
    row.getCell(6).font = defaultFont;

    // Apply borders to all columns
    for (let j = 1; j <= 6; j++) {
      row.getCell(j).border = borderAll;
    }
    row.height = 25;
  }

  // ==================== Summary Section ====================
  const summaryStartRow = itemStartRow + maxItemRows;

  // --- Bank Details & Total ---
  const r14 = summaryStartRow;
  sheet.mergeCells(`A${r14}:C${r14}`);
  sheet.getCell(`A${r14}`).value = 'Bank Details';
  sheet.getCell(`A${r14}`).font = defaultFont;
  sheet.getCell(`A${r14}`).alignment = { vertical: 'middle' };
  setAcBoxBorder(r14, true, false);
  sheet.getRow(r14).height = 25;

  sheet.mergeCells(`D${r14}:E${r14}`);
  sheet.getCell(`D${r14}`).value = 'Total';
  sheet.getCell(`D${r14}`).font = defaultFontBold;
  sheet.getCell(`D${r14}`).alignment = { vertical: 'middle' };
  ['D','E'].forEach(c => sheet.getCell(`${c}${r14}`).border = borderAll);
  sheet.getCell(`F${r14}`).value = bill.total;
  sheet.getCell(`F${r14}`).numFmt = '0.00';
  sheet.getCell(`F${r14}`).font = defaultFont;
  sheet.getCell(`F${r14}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`F${r14}`).border = borderAll;

  // --- Bank Name & CGST ---
  const r15 = r14 + 1;
  sheet.mergeCells(`A${r15}:C${r15}`);
  sheet.getCell(`A${r15}`).value = 'The Nasik Merchants Co-operative';
  sheet.getCell(`A${r15}`).font = defaultFont;
  sheet.getCell(`A${r15}`).alignment = { vertical: 'middle' };
  setAcBoxBorder(r15, false, false);
  sheet.getRow(r15).height = 25;

  sheet.getCell(`D${r15}`).value = 'CGST';
  sheet.getCell(`D${r15}`).font = defaultFontBold;
  sheet.getCell(`D${r15}`).alignment = { vertical: 'middle' };
  sheet.getCell(`D${r15}`).border = borderAll;
  sheet.getCell(`E${r15}`).value = '2.50%';
  sheet.getCell(`E${r15}`).font = defaultFontBold;
  sheet.getCell(`E${r15}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`E${r15}`).border = borderAll;
  sheet.getCell(`F${r15}`).value = bill.cgst;
  sheet.getCell(`F${r15}`).numFmt = '0.00';
  sheet.getCell(`F${r15}`).font = defaultFont;
  sheet.getCell(`F${r15}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`F${r15}`).border = borderAll;

  // --- Bank Ltd & SGST ---
  const r16 = r15 + 1;
  sheet.mergeCells(`A${r16}:C${r16}`);
  sheet.getCell(`A${r16}`).value = 'Bank Ltd.Nashik';
  sheet.getCell(`A${r16}`).font = defaultFont;
  sheet.getCell(`A${r16}`).alignment = { vertical: 'middle' };
  setAcBoxBorder(r16, false, false);
  sheet.getRow(r16).height = 25;

  sheet.getCell(`D${r16}`).value = 'SGST';
  sheet.getCell(`D${r16}`).font = defaultFontBold;
  sheet.getCell(`D${r16}`).alignment = { vertical: 'middle' };
  sheet.getCell(`D${r16}`).border = borderAll;
  sheet.getCell(`E${r16}`).value = '2.50%';
  sheet.getCell(`E${r16}`).font = defaultFontBold;
  sheet.getCell(`E${r16}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`E${r16}`).border = borderAll;
  sheet.getCell(`F${r16}`).value = bill.sgst;
  sheet.getCell(`F${r16}`).numFmt = '0.00';
  sheet.getCell(`F${r16}`).font = defaultFont;
  sheet.getCell(`F${r16}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`F${r16}`).border = borderAll;

  // --- Account No & Labour Charge ---
  const r17 = r16 + 1;
  sheet.mergeCells(`A${r17}:C${r17}`);
  sheet.getCell(`A${r17}`).value = 'Bank Account No :\n065100100000011';
  sheet.getCell(`A${r17}`).font = defaultFont;
  sheet.getCell(`A${r17}`).alignment = { wrapText: true, vertical: 'top' };
  sheet.getRow(r17).height = 35;
  setAcBoxBorder(r17, false, false);

  sheet.mergeCells(`D${r17}:E${r17}`);
  sheet.getCell(`D${r17}`).value = 'Labour Charge';
  sheet.getCell(`D${r17}`).font = defaultFontBold;
  sheet.getCell(`D${r17}`).alignment = { vertical: 'middle' };
  ['D','E'].forEach(c => sheet.getCell(`${c}${r17}`).border = borderAll);
  sheet.getCell(`F${r17}`).value = bill.labourCharge;
  sheet.getCell(`F${r17}`).numFmt = '0.00';
  sheet.getCell(`F${r17}`).font = defaultFont;
  sheet.getCell(`F${r17}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`F${r17}`).border = borderAll;

  // --- Branch & Discount ---
  const r18 = r17 + 1;
  sheet.mergeCells(`A${r18}:C${r18}`);
  sheet.getCell(`A${r18}`).value = 'Branch Name   : Chakan';
  sheet.getCell(`A${r18}`).font = defaultFont;
  sheet.getCell(`A${r18}`).alignment = { vertical: 'middle' };
  setAcBoxBorder(r18, false, false);
  sheet.getRow(r18).height = 25;

  sheet.mergeCells(`D${r18}:E${r18}`);
  sheet.getCell(`D${r18}`).value = 'Discount';
  sheet.getCell(`D${r18}`).font = defaultFontBold;
  sheet.getCell(`D${r18}`).alignment = { vertical: 'middle' };
  ['D','E'].forEach(c => sheet.getCell(`${c}${r18}`).border = borderAll);
  sheet.getCell(`F${r18}`).value = bill.discount;
  sheet.getCell(`F${r18}`).numFmt = '0.00';
  sheet.getCell(`F${r18}`).font = defaultFont;
  sheet.getCell(`F${r18}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`F${r18}`).border = borderAll;

  // --- IFSC & Amount ---
  const r19 = r18 + 1;
  sheet.mergeCells(`A${r19}:C${r19}`);
  sheet.getCell(`A${r19}`).value = 'Bank IFSC Code  :NMCB0000066';
  sheet.getCell(`A${r19}`).font = defaultFont;
  sheet.getCell(`A${r19}`).alignment = { vertical: 'middle' };
  setAcBoxBorder(r19, false, true);
  sheet.getRow(r19).height = 25;

  sheet.mergeCells(`D${r19}:E${r19}`);
  sheet.getCell(`D${r19}`).value = 'Amount';
  sheet.getCell(`D${r19}`).font = { ...defaultFont, bold: true, size: 13 };
  sheet.getCell(`D${r19}`).alignment = { vertical: 'middle' };
  ['D','E'].forEach(c => sheet.getCell(`${c}${r19}`).border = borderAll);
  sheet.getCell(`F${r19}`).value = bill.grandTotal;
  sheet.getCell(`F${r19}`).font = { ...defaultFont, bold: true, size: 13 };
  sheet.getCell(`F${r19}`).numFmt = '0.00';
  sheet.getCell(`F${r19}`).alignment = { horizontal: 'right', vertical: 'middle' };
  sheet.getCell(`F${r19}`).border = borderAll;

  // ==================== Amount in Words ====================
  const r20 = r19 + 1;

  // Amount in words label
  sheet.mergeCells(`A${r20}:C${r20}`);
  setAcBoxBorder(r20, true, false);

  sheet.mergeCells(`D${r20}:F${r20}`);
  sheet.getCell(`D${r20}`).value = 'Amount in words:-';
  sheet.getCell(`D${r20}`).font = defaultFontBold;
  sheet.getCell(`D${r20}`).alignment = { vertical: 'middle' };
  ['D','E','F'].forEach(c => {
    sheet.getCell(`${c}${r20}`).border = { top: thin, left: c==='D'?thin:undefined, right: c==='F'?thin:undefined };
  });
  sheet.getRow(r20).height = 25;

  // Amount in words value (multi-line)
  const r21 = r20 + 1;
  sheet.mergeCells(`A${r21}:C${r21}`);
  setAcBoxBorder(r21, false, false);

  sheet.mergeCells(`D${r21}:F${r21}`);
  sheet.getCell(`D${r21}`).value = bill.amountInWords;
  sheet.getCell(`D${r21}`).font = defaultFontBold;
  sheet.getCell(`D${r21}`).alignment = { wrapText: true, vertical: 'top' };
  sheet.getRow(r21).height = 45;
  ['D','E','F'].forEach(c => {
    sheet.getCell(`${c}${r21}`).border = { bottom: thin, left: c==='D'?thin:undefined, right: c==='F'?thin:undefined };
  });

  // ==================== Blank Space (between amount in words and signature) ====================
  const blankStart = r21 + 1;
  const blankCount = 5;
  for (let r = blankStart; r < blankStart + blankCount; r++) {
    sheet.mergeCells(`A${r}:C${r}`);
    ['A','B','C'].forEach(c => {
      sheet.getCell(`${c}${r}`).border = {
        left: c === 'A' ? thin : undefined,
        right: c === 'C' ? thin : undefined
      };
    });
    sheet.mergeCells(`D${r}:F${r}`);
    ['D','E','F'].forEach(c => {
      sheet.getCell(`${c}${r}`).border = {
        left: c === 'D' ? thin : undefined,
        right: c === 'F' ? thin : undefined
      };
    });
    sheet.getRow(r).height = 22;
  }

  // ==================== Signature Row ====================
  const sigRow = blankStart + blankCount;
  sheet.mergeCells(`A${sigRow}:C${sigRow}`);
  sheet.getCell(`A${sigRow}`).value = 'For Receiver';
  sheet.getCell(`A${sigRow}`).font = defaultFont;
  sheet.getCell(`A${sigRow}`).alignment = { horizontal: 'center', vertical: 'bottom' };
  ['A','B','C'].forEach(c => {
    sheet.getCell(`${c}${sigRow}`).border = borderAll;
  });

  sheet.mergeCells(`D${sigRow}:F${sigRow}`);
  sheet.getCell(`D${sigRow}`).value = 'For Anushree Construction';
  sheet.getCell(`D${sigRow}`).font = defaultFont;
  sheet.getCell(`D${sigRow}`).alignment = { horizontal: 'center', vertical: 'bottom' };
  ['D','E','F'].forEach(c => {
    sheet.getCell(`${c}${sigRow}`).border = borderAll;
  });

  sheet.getRow(sigRow).height = 45;

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = generateInvoiceExcel;
