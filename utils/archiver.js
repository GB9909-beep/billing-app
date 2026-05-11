const cron = require('node-cron');
const Bill = require('../models/Bill');
const Archive = require('../models/Archive');

/**
 * Archive System
 * Moves bills older than 1 year from Bills collection to Archive collection.
 * Runs daily at midnight (00:00).
 */
function startArchiver() {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      // Find bills older than 1 year
      const oldBills = await Bill.find({ createdAt: { $lt: oneYearAgo } });

      if (oldBills.length === 0) {
        console.log('[Archiver] No bills to archive.');
        return;
      }

      console.log(`[Archiver] Found ${oldBills.length} bill(s) to archive.`);

      // Move each bill to archive
      for (const bill of oldBills) {
        const archiveData = {
          originalBillId: bill._id,
          userId: bill.userId,
          invoiceNo: bill.invoiceNo,
          invoiceDate: bill.invoiceDate,
          customer: bill.customer,
          items: bill.items,
          total: bill.total,
          cgst: bill.cgst,
          sgst: bill.sgst,
          labourCharge: bill.labourCharge,
          discount: bill.discount,
          grandTotal: bill.grandTotal,
          amountInWords: bill.amountInWords,
          originalCreatedAt: bill.createdAt,
          archivedAt: new Date()
        };

        await Archive.create(archiveData);
        await Bill.findByIdAndDelete(bill._id);
      }

      console.log(`[Archiver] Successfully archived ${oldBills.length} bill(s).`);
    } catch (error) {
      console.error('[Archiver] Error during archiving:', error.message);
    }
  });

  console.log('[Archiver] Daily archive job scheduled (runs at midnight).');
}

module.exports = startArchiver;
