import React, { useState } from 'react';
import { Icon } from './icons';

export default function PaymentCollection() {
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);

  const invoices = [
    { id: "INV-29381", patient: "Maria Garcia", date: "Aug 24, 2026", type: "Outpatient Consult", amount: 150.00, status: "Pending" },
    { id: "INV-29380", patient: "John Smith", date: "Aug 24, 2026", type: "Pharmacy", amount: 45.50, status: "Pending" },
    { id: "INV-29375", patient: "Robert Lee", date: "Aug 23, 2026", type: "Radiology (X-Ray)", amount: 320.00, status: "Pending" },
    { id: "INV-29372", patient: "Emma Wilson", date: "Aug 23, 2026", type: "Emergency Co-pay", amount: 250.00, status: "Paid" },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Payment Collection</h1>
          <p className="text-[12.5px] text-[#64748B]">Process patient payments, co-pays, and issue receipts.</p>
        </div>
        <div className="relative">
           <Icon.Search />
           <input placeholder="Search patient or Invoice ID..." className="pl-8 pr-3 py-1.5 text-[12px] border border-[#DDE2EC] rounded w-64 focus:outline-none focus:border-[#1B4FD8]" />
           <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]"><Icon.Search /></span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex gap-6 max-w-7xl mx-auto w-full">
        {/* Left Side: Invoice List */}
        <div className="flex-1 bg-white border border-[#DDE2EC] rounded-xl shadow-sm flex flex-col overflow-hidden">
           <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC]">
             <h2 className="text-[14px] font-semibold text-gray-900">Pending Invoices</h2>
           </div>
           <div className="flex-1 overflow-auto">
              <table className="w-full text-left">
                <thead className="border-b border-[#DDE2EC]">
                  <tr>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Invoice ID</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Patient</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Type</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Amount</th>
                    <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {invoices.map((inv, i) => (
                    <tr 
                      key={i} 
                      onClick={() => setSelectedInvoice(inv.id)}
                      className={`cursor-pointer transition-colors ${selectedInvoice === inv.id ? 'bg-[#EFF6FF]' : 'hover:bg-[#F8FAFC]'}`}
                    >
                      <td className="px-5 py-4 text-[12.5px] font-mono text-[#1B4FD8]">{inv.id}</td>
                      <td className="px-5 py-4 text-[13px] font-bold text-gray-900">{inv.patient}</td>
                      <td className="px-5 py-4 text-[12.5px] text-gray-700">{inv.type}</td>
                      <td className="px-5 py-4 text-[13px] font-semibold text-gray-900">${inv.amount.toFixed(2)}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 text-[10.5px] font-bold rounded uppercase tracking-wider ${
                          inv.status === 'Paid' ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEF3C7] text-[#92400E]'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>

        {/* Right Side: Payment Terminal */}
        <div className="w-96 bg-white border border-[#DDE2EC] rounded-xl shadow-sm flex flex-col">
          <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC]">
            <h2 className="text-[14px] font-semibold text-gray-900 flex items-center gap-2">
              <Icon.Billing /> Payment Terminal
            </h2>
          </div>
          
          {!selectedInvoice ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#94A3B8]">
              <div className="text-4xl mb-4">💳</div>
              <p className="text-[13px]">Select an invoice from the list to process payment.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="p-5 border-b border-[#DDE2EC]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[12px] text-[#64748B]">Invoice ID</span>
                  <span className="text-[12px] font-mono text-gray-900">{selectedInvoice}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[12px] text-[#64748B]">Patient</span>
                  <span className="text-[13px] font-bold text-gray-900">Maria Garcia</span>
                </div>
                
                <div className="bg-[#F8FAFC] border border-[#DDE2EC] rounded p-4 text-center">
                   <div className="text-[12px] text-[#64748B] uppercase tracking-wider mb-1">Total Due</div>
                   <div className="text-4xl font-bold text-gray-900">$150.00</div>
                </div>
              </div>

              <div className="p-5 flex-1">
                 <h3 className="text-[12px] font-semibold text-gray-900 mb-3">Payment Method</h3>
                 <div className="grid grid-cols-2 gap-3 mb-6">
                   <button className="py-2 border-2 border-[#1B4FD8] bg-[#EFF6FF] rounded text-[12.5px] font-semibold text-[#1B4FD8]">Credit Card</button>
                   <button className="py-2 border border-[#DDE2EC] rounded text-[12.5px] font-medium text-gray-700 hover:bg-[#F8FAFC]">Cash</button>
                   <button className="py-2 border border-[#DDE2EC] rounded text-[12.5px] font-medium text-gray-700 hover:bg-[#F8FAFC]">Insurance Copay</button>
                   <button className="py-2 border border-[#DDE2EC] rounded text-[12.5px] font-medium text-gray-700 hover:bg-[#F8FAFC]">UPI / Digital</button>
                 </div>

                 <button className="w-full h-12 bg-[#16A34A] text-white text-[14px] font-bold rounded hover:bg-[#15803D] transition-colors shadow-sm mb-3">
                   Process Payment
                 </button>
                 <button className="w-full h-10 bg-white border border-[#DDE2EC] text-gray-700 text-[13px] font-medium rounded hover:bg-[#F8FAFC] transition-colors flex items-center justify-center gap-2">
                   <Icon.Download /> Print Receipt
                 </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
