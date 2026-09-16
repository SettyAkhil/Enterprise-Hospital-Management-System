import { CheckCircle, Printer } from "lucide-react";
import { PharmacyDatabase } from "../../../services/pharmacyDb";

export function numberToWords(num: number): string {
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
    if ((num = Math.floor(num)) === 0) return 'Zero';
    if (num < 0) return 'Negative ' + numberToWords(Math.abs(num));
    let str = '';
    if (num >= 10000000) { str += numberToWords(Math.floor(num / 10000000)) + ' Crore '; num %= 10000000; }
    if (num >= 100000) { str += numberToWords(Math.floor(num / 100000)) + ' Lakh '; num %= 100000; }
    if (num >= 1000) { str += numberToWords(Math.floor(num / 1000)) + ' Thousand '; num %= 1000; }
    if (num >= 100) { str += numberToWords(Math.floor(num / 100)) + ' Hundred '; num %= 100; }
    if (num > 0) {
        if (str !== '') str += 'and ';
        if (num < 20) str += a[num];
        else {
            str += b[Math.floor(num / 10)];
            if (num % 10 > 0) str += '-' + a[num % 10];
        }
    }
    return str.trim();
}

interface InvoicePrintModalProps {
    bill: any;
    onClose: () => void;
}

export default function InvoicePrintModal({ bill, onClose }: InvoicePrintModalProps) {
    const printInvoice = () => window.print();

    if (!bill) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm print:absolute print:inset-0 print:p-0 print:bg-white">
            <style>{`
                @media print { 
                    body * { visibility: hidden; } 
                    #printable-invoice, #printable-invoice * { visibility: visible; } 
                    #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; } 
                    @page { size: landscape; margin: 10mm; }
                }
            `}</style>
            <div id="printable-invoice" className="bg-white rounded shadow-2xl w-full max-w-2xl max-h-full overflow-y-auto print:max-w-none print:shadow-none print:w-full print:m-0 print:overflow-visible relative">
                <div className="p-6 print:p-0 border-b border-[#DDE2EC] flex justify-between items-center print:hidden bg-[#F5F7FA] sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-[#0F1624] flex items-center gap-2">
                        <CheckCircle className="text-green-600" /> Invoice {bill.billNumber}
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={printInvoice} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-colors">
                            <Printer size={16} /> Print Receipt
                        </button>
                        <button onClick={onClose} className="bg-white border border-[#DDE2EC] hover:bg-gray-50 text-[#0F1624] px-4 py-2 text-sm font-semibold transition-colors">
                            Close
                        </button>
                    </div>
                </div>
                
                {/* Detailed A4 Print Layout matching requested invoice */}
                <div className="p-8 print:p-0 font-sans text-sm print:text-[9px] text-black w-full max-w-5xl print:max-w-full mx-auto bg-white">
                    <div className="flex justify-between border-b-2 border-black pb-4 mb-4">
                        <div className="flex-1">
                            <h1 className="text-2xl print:text-lg font-bold tracking-wider mb-2">VH PHARMACY</h1>
                            <p className="print:text-[9px]">27-1-7/3/1, Premises Of Imperial Hospital,</p>
                            <p className="print:text-[9px]">J P Road, Bhimavaram, West Godavari,</p>
                            <p className="print:text-[9px]">Andhra Pradesh-534202</p>
                            <p className="font-bold print:text-[9px] mt-1">GST No : 37AASFV7563M1Z1</p>
                            <h2 className="text-lg print:text-sm font-bold uppercase mt-2">Pharmacy Receipt <br/> TAX INVOICE</h2>
                        </div>
                        <div className="flex-1">
                            <table className="w-full text-left print:text-[9px] border-collapse">
                                <tbody>
                                    <tr><td className="py-0.5 font-semibold">Bill No</td><td>: {bill.billNumber}</td><td className="font-semibold w-24">Bill Date</td><td>: {new Date(bill.createdAt || bill.date).toLocaleString().split(',')[0]}</td></tr>
                                    <tr><td className="py-0.5 font-semibold">UMR No</td><td>: {bill.uhid || "UMR10050"}</td><td className="font-semibold w-24">Dt of Supply</td><td>: {new Date(bill.createdAt || bill.date).toLocaleString()}</td></tr>
                                    <tr><td className="py-0.5 font-semibold">Patient Name</td><td colSpan={3}>: {bill.patientName || "Walk-in Patient"}</td></tr>
                                    <tr><td className="py-0.5 font-semibold">Doctor Name</td><td colSpan={3}>: {bill.doctorName || "Self"}</td></tr>
                                    <tr><td className="py-0.5 font-semibold">RCM Invoice</td><td>: NO</td><td className="font-semibold w-24">D.L.No.</td><td>: AP/05/02/2017-13965</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <table className="w-full mb-4 print:text-[8px] table-fixed uppercase" style={{ borderCollapse: 'collapse' }}>
                        <thead className="border-y-2 border-black">
                            <tr>
                                <th className="w-[18%] p-1 text-left font-semibold align-bottom">ITEM DESC</th>
                                <th className="w-[6%] p-1 text-left font-semibold align-bottom">HSN<br/>CODE</th>
                                <th className="w-[4%] p-1 text-left font-semibold align-bottom">MNF</th>
                                <th className="w-[3%] p-1 text-left font-semibold align-bottom">SH</th>
                                <th className="w-[10%] p-1 text-left font-semibold align-bottom">BATCH NO</th>
                                <th className="w-[5%] p-1 text-left font-semibold align-bottom">EXP DT</th>
                                <th className="w-[3%] p-1 text-left font-semibold align-bottom">BIN<br/>NO</th>
                                <th className="w-[4%] p-1 text-right font-semibold align-bottom">QTY</th>
                                <th className="w-[5%] p-1 text-right font-semibold align-bottom">RATE</th>
                                <th className="w-[6%] p-1 text-right font-semibold align-bottom">AMOUNT</th>
                                <th className="w-[5%] p-1 text-right font-semibold align-bottom">DISC<br/>AMT</th>
                                <th className="w-[7%] p-1 text-right font-semibold align-bottom">TAXABLE<br/>AMT</th>
                                <th className="w-[8%] p-1 align-bottom font-semibold">
                                    <div className="text-center">CGST</div>
                                    <div className="flex justify-between text-[7px] mt-1 px-1">
                                        <span>%</span>
                                        <span>AMT</span>
                                    </div>
                                </th>
                                <th className="w-[8%] p-1 align-bottom font-semibold">
                                    <div className="text-center">SGST</div>
                                    <div className="flex justify-between text-[7px] mt-1 px-1">
                                        <span>%</span>
                                        <span>AMT</span>
                                    </div>
                                </th>
                                <th className="w-[8%] p-1 text-right font-semibold align-bottom">BILL<br/>AMT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(bill.items || []).map((c: any, i: number) => {
                                // Fetch name from db if missing in bill
                                let medName = c.medicineName || c.medicine;
                                if (!medName && c.medicineId) {
                                    const med = PharmacyDatabase.getMedicines().find(m => m.id === c.medicineId);
                                    if (med) medName = med.brandName || med.medicineName;
                                }
                                medName = medName || "Unknown Medicine";

                                // Compatible with both bill schemas
                                const mrp = c.unitPrice || c.mrp || 0;
                                const qty = c.quantity || c.qty || 0;
                                const discount = c.discount || 0;
                                const tax = c.tax || 12;

                                const amount = qty * mrp;
                                const discAmt = amount * (discount / 100);
                                const taxable = amount - discAmt;
                                const cgstRate = tax / 2;
                                const sgstRate = tax / 2;
                                const cgstAmt = taxable * (cgstRate / 100);
                                const sgstAmt = taxable * (sgstRate / 100);
                                const billAmt = taxable + cgstAmt + sgstAmt;
                                
                                return (
                                <tr key={i} className="align-top">
                                    <td className="p-1 text-left break-words pr-2">{medName}</td>
                                    <td className="p-1 text-left">{c.hsnCode || "300490"}</td>
                                    <td className="p-1 text-left">{medName.substring(0, 3)}</td>
                                    <td className="p-1 text-left">{(c.batchNumber || c.batch || "H").charAt(0)}</td>
                                    <td className="p-1 text-left break-all">{c.batchNumber || c.batch}</td>
                                    <td className="p-1 text-left">{c.expiryDate || c.expiry || "2026-12"}</td>
                                    <td className="p-1 text-left"></td>
                                    <td className="p-1 text-right">{qty}</td>
                                    <td className="p-1 text-right">{mrp.toFixed(2)}</td>
                                    <td className="p-1 text-right">{amount.toFixed(2)}</td>
                                    <td className="p-1 text-right">{discAmt.toFixed(2)}</td>
                                    <td className="p-1 text-right">{taxable.toFixed(2)}</td>
                                    <td className="p-1">
                                        <div className="flex justify-between px-1">
                                            <span>{cgstRate}</span>
                                            <span>{cgstAmt.toFixed(2)}</span>
                                        </div>
                                    </td>
                                    <td className="p-1">
                                        <div className="flex justify-between px-1">
                                            <span>{sgstRate}</span>
                                            <span>{sgstAmt.toFixed(2)}</span>
                                        </div>
                                    </td>
                                    <td className="p-1 text-right font-bold">{billAmt.toFixed(2)}</td>
                                </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="border-y-2 border-black font-bold text-[9px]">
                            <tr>
                                <td colSpan={7} className="p-1 text-right font-normal text-[8px] italic"></td>
                                <td className="p-1 text-right"></td>
                                <td className="p-1 text-right"></td>
                                <td className="p-1 text-right">{(bill.subTotal || 0).toFixed(2)}</td>
                                <td className="p-1 text-right">{(bill.discount || 0).toFixed(2)}</td>
                                <td className="p-1 text-right">{(bill.taxableTotal || bill.subTotal - bill.discount || 0).toFixed(2)}</td>
                                <td className="p-1">
                                    <div className="flex justify-end px-1">
                                        <span>{(bill.cgstTotal || (bill.tax||0)/2 || 0).toFixed(2)}</span>
                                    </div>
                                </td>
                                <td className="p-1">
                                    <div className="flex justify-end px-1">
                                        <span>{(bill.sgstTotal || (bill.tax||0)/2 || 0).toFixed(2)}</span>
                                    </div>
                                </td>
                                <td className="p-1 text-right">{(bill.totalAmount || 0).toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    
                    <div className="flex justify-between items-end mt-4 print:text-[9px]">
                        <div>
                            <p>Received sum of <span className="font-bold uppercase">{numberToWords(bill.totalAmount || 0)} Rupees Only</span> towards Above Bill</p>
                            <div className="mt-6 border-t border-dashed border-black pt-2">
                                <p className="font-bold mb-1">Payment Breakdown:</p>
                                {Object.entries(bill.paymentsData?.amounts || { Cash: bill.totalAmount }).map(([method, amount]) => (
                                    <div key={method} className="flex justify-between w-48 text-[9px] uppercase">
                                        <span>{method} {(bill.paymentsData?.refs as any)?.[method] ? `(${(bill.paymentsData?.refs as any)[method]})` : ''}:</span>
                                        <span className="font-bold">{(Number(amount) || 0).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="text-right pb-4">
                            <p className="font-bold">For VH PHARMACY</p>
                            <div className="h-12 border-b border-dashed border-gray-400 w-48 ml-auto mt-2"></div>
                            <p className="mt-1">Authorized Signatory</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
