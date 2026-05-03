import React, { useRef } from 'react';
import { X, Printer, Coffee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InvoiceModal = ({ isOpen, onClose, transaction }) => {
    const printRef = useRef();

    if (!isOpen || !transaction) return null;

    const handlePrint = () => {
        window.print();
    };

    const subtotal = (transaction.amount || 0) - (transaction.gst || 0);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white text-slate-900 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                >
                    {/* Header - Not printed */}
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 no-print">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
                                <Coffee className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Tax Invoice</h3>
                                <p className="text-xs text-slate-500">#{transaction.orderId}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                            >
                                <Printer className="w-4 h-4" /> Print
                            </button>
                            <button 
                                onClick={onClose}
                                className="p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content - This is what gets printed */}
                    <div ref={printRef} className="p-6 md:p-12 overflow-y-auto flex-1 invoice-container">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-12">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 mb-1">Ca Phe Bistro</h1>
                                <p className="text-sm text-slate-500 max-w-[200px]">123 Coffee Lane, Sanctuary Circle, Bengaluru, 560001</p>
                                <p className="text-sm text-slate-500 mt-1">GSTIN: 29ABCDE1234F1Z5</p>
                            </div>
                            <div className="text-left md:text-right">
                                <div className="inline-block px-4 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Original Receipt</div>
                                <p className="text-sm font-bold text-slate-900">Date: {transaction.time}</p>
                                <p className="text-sm text-slate-500">Order ID: {transaction.orderId}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 py-8 border-y border-slate-100">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Billed To</p>
                                <p className="font-bold text-slate-900">{transaction.customer || 'Guest Customer'}</p>
                                <p className="text-sm text-slate-500">Authenticated Session</p>
                            </div>
                            <div className="text-left md:text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Payment Status</p>
                                <p className={`font-bold uppercase text-sm ${transaction.status === 'paid' ? 'text-emerald-600' : 'text-orange-600'}`}>
                                    {transaction.status} via {transaction.method}
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto -mx-2 px-2">
                            <table className="w-full mb-12 min-w-[500px] md:min-w-0">
                                <thead>
                                    <tr className="border-b-2 border-slate-900/5">
                                        <th className="text-left py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Description</th>
                                        <th className="text-center py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Qty</th>
                                        <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Price</th>
                                        <th className="text-right py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    <tr>
                                        <td className="py-6">
                                            <p className="font-bold text-slate-900">Food & Beverage Items</p>
                                            <p className="text-xs text-slate-500">Consolidated order summary</p>
                                        </td>
                                        <td className="py-6 text-center text-slate-600 font-medium">1</td>
                                        <td className="py-6 text-right text-slate-600 font-medium">₹{subtotal.toFixed(2)}</td>
                                        <td className="py-6 text-right font-bold text-slate-900">₹{subtotal.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end">
                            <div className="w-full max-w-[240px] space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span className="font-medium text-slate-900">₹{subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">GST (5%)</span>
                                    <span className="font-medium text-slate-900">₹{(transaction.gst || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                    <span className="font-black uppercase tracking-widest text-xs text-slate-900">Total Amount</span>
                                    <span className="text-2xl font-black text-slate-900">₹{transaction.amount?.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-20 pt-8 border-t border-slate-100 text-center">
                            <p className="text-sm font-serif italic text-slate-400">Thank you for your visit! Hope to see you again.</p>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 mt-4">Ca Phe Bistro Sanctuary - Experience the Artisan Soul</p>
                        </div>
                    </div>
                </motion.div>
                
                <style>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .invoice-container, .invoice-container * {
                            visibility: visible;
                        }
                        .invoice-container {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            padding: 20mm;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                `}</style>
            </div>
        </AnimatePresence>
    );
};

export default InvoiceModal;
