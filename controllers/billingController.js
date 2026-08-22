// controllers/billingController.js — Module 7: Billing & Financial Management
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Installment = require('../models/Installment');
const { generateInvoiceReceiptPdf } = require('../helpers/generateInvoiceReceiptPdf');

// F-7.1: Invoice & Receipt Generator
// @ts-ignore
exports.createInvoice = async (req, res) => {
    try {
        const { patientId, appointmentId, treatmentRecordId, items, taxRate, discount } = req.body;

        if (!patientId || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'patientId and at least one item are required' });
        }

        const normalizedItems = items.map(item => ({
            description: item.description,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice,
            amount: (item.quantity || 1) * item.unitPrice
        }));

        const subtotal = normalizedItems.reduce((sum, item) => sum + item.amount, 0);
        const rate = taxRate || 0;
        const taxAmount = +(subtotal * (rate / 100)).toFixed(2);
        const discountAmount = discount || 0;
        const totalAmount = +(subtotal + taxAmount - discountAmount).toFixed(2);

        const invoice = await Invoice.create({
            patientId,
            appointmentId,
            treatmentRecordId,
            items: normalizedItems,
            subtotal,
            taxRate: rate,
            taxAmount,
            discount: discountAmount,
            totalAmount,
            amountPaid: 0,
            balanceDue: totalAmount
        });

        res.status(201).json({ success: true, message: 'Invoice generated', invoice });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @ts-ignore
exports.getInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
        res.status(200).json({ success: true, invoice });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @ts-ignore
exports.listPatientInvoices = async (req, res) => {
    try {
        const invoices = await Invoice.find({ patientId: req.params.patientId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: invoices.length, invoices });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// F-7.1 (cont.): downloadable PDF receipt
// @ts-ignore
exports.downloadReceipt = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

        const receipt = await generateInvoiceReceiptPdf(invoice);
        if (!receipt) throw new Error('Failed to generate receipt PDF');

        res.setHeader('Content-Type', receipt.contentType);
        res.setHeader(receipt.setHeader, receipt.attachment);
        res.send(receipt.pdf);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Shared helper: applies a successful payment to an invoice's paid/balance/status fields
async function applyPaymentToInvoice(invoice, amount) {
    invoice.amountPaid = +(invoice.amountPaid + amount).toFixed(2);
    invoice.balanceDue = Math.max(0, +(invoice.totalAmount - invoice.amountPaid).toFixed(2));
    invoice.status = invoice.balanceDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
    await invoice.save();
}

// F-7.2: Instalment Ledger Tracker — split an invoice into a partial-payment schedule
// @ts-ignore
exports.createInstallmentPlan = async (req, res) => {
    try {
        const { invoiceId, numberOfInstallments, startDate } = req.body;
        if (!invoiceId || !numberOfInstallments || numberOfInstallments < 2) {
            return res.status(400).json({ success: false, message: 'invoiceId and numberOfInstallments (>=2) are required' });
        }

        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

        const existingPlan = await Installment.findOne({ invoiceId });
        if (existingPlan) {
            return res.status(400).json({ success: false, message: 'An installment plan already exists for this invoice' });
        }

        const installmentAmount = +(invoice.balanceDue / numberOfInstallments).toFixed(2);
        const base = startDate ? new Date(startDate) : new Date();

        const schedule = Array.from({ length: numberOfInstallments }, (_, i) => {
            const due = new Date(base);
            due.setMonth(due.getMonth() + i); // one installment per month
            return {
                installmentNumber: i + 1,
                dueAmount: installmentAmount,
                dueDate: due.toISOString().slice(0, 10),
                status: 'PENDING'
            };
        });

        const plan = await Installment.create({
            invoiceId,
            patientId: invoice.patientId,
            totalAmount: invoice.balanceDue,
            numberOfInstallments,
            schedule,
            outstandingBalance: invoice.balanceDue
        });

        res.status(201).json({ success: true, message: 'Installment plan created', plan });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// F-7.2 (cont.): record a payment against the next pending installment
// @ts-ignore
exports.payInstallment = async (req, res) => {
    try {
        const { id } = req.params; // installment plan id
        const { installmentNumber, method } = req.body;

        const plan = await Installment.findById(id);
        if (!plan) return res.status(404).json({ success: false, message: 'Installment plan not found' });

        const entry = installmentNumber
            ? plan.schedule.find(e => e.installmentNumber === installmentNumber)
            : plan.schedule.find(e => e.status === 'PENDING');

        if (!entry) return res.status(400).json({ success: false, message: 'No matching pending installment found' });
        if (entry.status === 'PAID') return res.status(400).json({ success: false, message: 'This installment is already paid' });

        const payment = await Payment.create({
            invoiceId: plan.invoiceId,
            patientId: plan.patientId,
            amount: entry.dueAmount,
            method: method || 'CASH',
            status: 'SUCCESS'
        });

        entry.status = 'PAID';
        entry.paidDate = new Date();
        entry.paymentId = payment._id;
        plan.outstandingBalance = Math.max(0, +(plan.outstandingBalance - entry.dueAmount).toFixed(2));
        await plan.save();

        const invoice = await Invoice.findById(plan.invoiceId);
        if (invoice) await applyPaymentToInvoice(invoice, entry.dueAmount);

        res.status(200).json({ success: true, message: `Installment #${entry.installmentNumber} paid`, plan, payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// F-7.2 (cont.): ledger view — plan + outstanding balance
// @ts-ignore
exports.getLedger = async (req, res) => {
    try {
        const plan = await Installment.findOne({ invoiceId: req.params.invoiceId });
        if (!plan) return res.status(404).json({ success: false, message: 'No installment plan for this invoice' });
        res.status(200).json({ success: true, plan });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// F-7.3: Payment Gateway Integration (Extra)
// NOTE: This is a mocked gateway adapter so the rest of the billing flow (invoice status,
// receipts) can be built/demoed end-to-end. Swap the body of this function for a real
// provider SDK call (e.g. Stripe PaymentIntents, PayHere) — the request/response contract
// below is written so that swap doesn't need to touch any other module.
// @ts-ignore
exports.processGatewayPayment = async (req, res) => {
    try {
        const { invoiceId, amount, method } = req.body; // method: 'CARD' | 'QR'
        if (!invoiceId || !amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'invoiceId and a positive amount are required' });
        }
        if (!['CARD', 'QR'].includes(method)) {
            return res.status(400).json({ success: false, message: "method must be 'CARD' or 'QR'" });
        }

        const invoice = await Invoice.findById(invoiceId);
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
        if (amount > invoice.balanceDue) {
            return res.status(400).json({ success: false, message: 'Amount exceeds the outstanding balance' });
        }

        // --- mock gateway call ---
        const transactionRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
        const gatewaySucceeded = true; // a real integration would branch on the provider's response
        // -------------------------

        const payment = await Payment.create({
            invoiceId,
            patientId: invoice.patientId,
            amount,
            method: 'GATEWAY',
            status: gatewaySucceeded ? 'SUCCESS' : 'FAILED',
            transactionRef
        });

        if (gatewaySucceeded) await applyPaymentToInvoice(invoice, amount);

        res.status(gatewaySucceeded ? 200 : 402).json({
            success: gatewaySucceeded,
            message: gatewaySucceeded ? 'Payment successful' : 'Payment declined',
            payment,
            invoice
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
