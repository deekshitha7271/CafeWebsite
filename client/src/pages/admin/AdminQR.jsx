import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Monitor, Printer, Download, Sparkles, Plus, Minus } from 'lucide-react';

const AdminQR = () => {
  const [tableCount, setTableCount] = useState(10);
  const [customBaseUrl, setCustomBaseUrl] = useState(window.location.origin);
  const siteUrl = customBaseUrl || window.location.origin;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-12 pb-20">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 border-b border-white/10 pb-10">
        <div className="animate-print-hide">
          <h2 className="text-4xl font-serif font-bold text-white mb-3">QR Studio</h2>
          <p className="text-primary text-[10px] uppercase font-black tracking-[0.4em] flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            Branded Table Experience
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-6 animate-print-hide bg-surface-dark/50 p-6 rounded-[40px] border border-white/5">
           {/* URL Configuration */}
           <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-widest text-text-muted uppercase mb-2 ml-4">Scan Destination (IP/URL)</span>
              <input 
                type="text"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                placeholder="e.g. 192.168.1.5:5173"
                className="bg-background border border-white/10 rounded-full px-6 py-3 text-sm text-white focus:border-primary outline-none transition-all w-64"
              />
           </div>

           <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-widest text-text-muted uppercase mb-2 ml-4">Total Tables</span>
              <div className="flex items-center gap-4 bg-background rounded-full p-1.5 border border-white/10">
                 <button onClick={() => setTableCount(Math.max(1, tableCount - 1))} className="w-10 h-10 rounded-full bg-surface hover:bg-surface-light flex items-center justify-center transition-colors">
                    <Minus className="w-4 h-4 text-text-muted" />
                 </button>
                 <span className="text-xl font-bold text-white w-12 text-center">{tableCount}</span>
                 <button onClick={() => setTableCount(tableCount + 1)} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center transition-colors">
                    <Plus className="w-4 h-4 text-background" />
                 </button>
              </div>
           </div>
           
           <button 
             onClick={handlePrint}
             className="px-10 py-5 bg-white text-background rounded-[30px] font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:scale-105 transition-transform shadow-xl"
           >
              <Printer className="w-4 h-4" />
              Generate & Print All
           </button>
        </div>
      </header>

      {/* QR Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 print:grid-cols-2 print:gap-4">
         {Array.from({ length: tableCount }).map((_, i) => {
           const tableId = i + 1;
           const qrUrl = `${siteUrl}/?table=${tableId}`;
           // Switched to black pixels on white for 100% scan reliability
           const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}&margin=10`;

           return (
             <motion.div 
               key={tableId}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.05 }}
               className="group relative bg-[#080402] rounded-[50px] overflow-hidden border border-white/10 shadow-2xl print:shadow-none print:border-2 print:border-black/10 print:rounded-none h-[480px] flex flex-col items-center justify-between p-10 break-inside-avoid shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)]"
             >
                {/* Visual Branding in QR */}
                <div className="text-center">
                   <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                         <span className="text-background font-serif font-black text-sm">A.</span>
                      </div>
                      <span className="text-lg font-serif font-bold text-white tracking-widest uppercase">Artisan</span>
                   </div>
                   <h4 className="text-primary text-[8px] font-black uppercase tracking-[0.6em] mb-8">Cafe Ritual</h4>
                </div>

                <div className="relative p-6 bg-white rounded-[40px] shadow-inner mb-6 flex items-center justify-center w-full aspect-square max-w-[240px]">
                   <img src={qrImage} alt={`Table ${tableId}`} className="w-full h-full object-contain" />
                </div>

                <div className="text-center w-full">
                    <div className="text-white/40 text-[9px] font-black uppercase tracking-[0.4em] mb-2">Scan To Discover</div>
                    <div className="text-5xl font-serif font-black text-white relative">
                       <span className="absolute -top-4 -left-6 text-primary/20 italic text-2xl font-serif">No.</span>
                       {tableId}
                    </div>
                </div>

                {/* Print Decoration */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none">
                   <div className="absolute top-0 right-0 w-40 h-40 bg-primary blur-[80px]" />
                   <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary blur-[80px]" />
                </div>
             </motion.div>
           );
         })}
      </div>

      <style>{`
        @media print {
          .animate-print-hide { display: none !important; }
          body { background: white !important; }
          .bg-surface, .bg-surface-dark, .bg-background { background: white !important; }
          .text-white, .text-text-muted { color: black !important; }
          .border-white\\/5, .border-white\\/10 { border-color: #eee !important; }
          aside, nav, header { display: none !important; }
          main { padding: 0 !important; }
          .print\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:border-black\\/10 { border-color: rgba(0,0,0,0.1) !important; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  );
};

export default AdminQR;
