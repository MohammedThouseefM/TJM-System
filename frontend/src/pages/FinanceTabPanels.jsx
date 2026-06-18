import { financeAPI } from '../services/api';
import toast from 'react-hot-toast';

const today = () => new Date().toISOString().split('T')[0];
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// ── Receipt Modal ─────────────────────────────────────────────────
export const ReceiptModal = ({ transactionId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    financeAPI.getReceipt(transactionId).then(r=>setData(r.data)).catch(()=>toast.error('Receipt not found.')).finally(()=>setLoading(false));
  }, [transactionId]);
  const print = () => {
    const w = window.open('','_blank');
    w.document.write(`<html><head><title>Receipt</title><style>body{font-family:Arial;padding:30px;max-width:380px;margin:0 auto}.row{display:flex;justify-content:space-between;margin:8px 0;font-size:14px}.amt{font-size:28px;text-align:center;margin:20px 0;font-weight:bold;border:2px solid #333;padding:12px;border-radius:8px}.ft{text-align:center;margin-top:20px;font-size:11px;color:#888;border-top:1px dashed #ccc;padding-top:10px}h1{text-align:center}</style></head><body><h1>🕌 ${data?.jamat_name}</h1><h3 style="text-align:center;color:#555">Contribution Receipt</h3><div class="row"><span>Receipt No:</span><strong>${data?.receipt?.receipt_number}</strong></div><div class="row"><span>Date:</span><span>${new Date(data?.receipt?.transaction_date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</span></div><div class="row"><span>Member:</span><strong>${data?.receipt?.member_name}</strong></div><div class="row"><span>Category:</span><span style="text-transform:capitalize">${data?.receipt?.category}</span></div><div class="row"><span>Payment:</span><span style="text-transform:capitalize">${data?.receipt?.payment_method||'cash'}</span></div><div class="amt">₹ ${Number(data?.receipt?.amount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</div><div class="ft">Recorded by: ${data?.receipt?.created_by_name}<br/>Computer-generated receipt</div></body></html>`);
    w.document.close(); w.print();
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-sm p-6" onClick={e=>e.stopPropagation()}>
        {loading ? <div className="text-center py-8 text-surface-400">Loading...</div> : !data ? <div className="text-center py-8 text-red-400">Receipt not found</div> : (
          <>
            <div className="text-center mb-5"><div className="text-3xl mb-1">🕌</div><h3 className="text-lg font-bold text-surface-100">{data.jamat_name}</h3><p className="text-xs text-surface-500">Contribution Receipt</p></div>
            <div className="space-y-2 mb-4">
              {[['Receipt No', data.receipt.receipt_number||'—'],['Date', new Date(data.receipt.transaction_date).toLocaleDateString('en-IN')],['Member', data.receipt.member_name],['Payment', data.receipt.payment_method||'cash'],['Category', data.receipt.category],['Notes', data.receipt.description||'—']].map(([k,v])=>(
                <div key={k} className="flex justify-between py-1.5 border-b border-surface-700/30 text-sm">
                  <span className="text-surface-400">{k}</span><span className="text-surface-200 font-medium capitalize">{v}</span>
                </div>
              ))}
            </div>
            <div className="py-4 mb-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 text-center">
              <p className="text-xs text-surface-400 mb-1">Amount</p>
              <p className="text-3xl font-bold text-emerald-400">₹{Number(data.receipt.amount).toLocaleString('en-IN',{minimumFractionDigits:2})}</p>
            </div>
            <div className="flex gap-3"><button onClick={print} className="btn-primary flex-1">🖨️ Print Receipt</button><button onClick={onClose} className="btn-secondary">Close</button></div>
          </>
        )}
      </div>
    </div>
  );
};
