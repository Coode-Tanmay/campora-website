import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, QrCode, ShieldCheck, Upload, AlertCircle, Sparkles, FileImage } from 'lucide-react';
import { CamporaOrder } from '../types';

export const UPI_ID = 'tanmayvbhagat-1@oksbi';

interface ManualPaymentSectionProps {
  order: CamporaOrder;
  onPaymentSubmitted: (utrNumber: string, screenshotUrl?: string) => Promise<void> | void;
}

export const ManualPaymentSection: React.FC<ManualPaymentSectionProps> = ({
  order,
  onPaymentSubmitted,
}) => {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountToPay = order.finalPrice || order.total || 350;

  useEffect(() => {
    const upiUri = `upi://pay?pa=${UPI_ID}&pn=CAMPORA&am=${amountToPay}&cu=INR&tn=${encodeURIComponent(`CAMPORA Order ${order.id}`)}`;
    QRCode.toDataURL(upiUri, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0B0B0B',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR:', err));
  }, [amountToPay, order.id]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 500 * 1024) {
        setError('Please choose a PNG or JPG screenshot under 500 KB.');
        e.target.value = '';
        return;
      }
      setScreenshotName(file.name);
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setScreenshotPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUtr = utrNumber.trim().replace(/\s+/g, '');
    if (!screenshotPreview || !screenshotFile) {
      setError('Please upload your payment screenshot. It is required for manual verification.');
      return;
    }
    if (cleanUtr && !/^[A-Za-z0-9-]{8,32}$/.test(cleanUtr)) {
      setError('Please enter a valid UPI reference / UTR number, or leave it blank.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onPaymentSubmitted(cleanUtr, screenshotPreview);
    } catch (err: any) {
      setError(err.message || 'Failed to submit payment details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-zinc-100">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Manual UPI Payment</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Pay for Order #{order.id}
        </h3>
        <p className="text-xs text-zinc-400">
          Scan the QR or transfer directly to our verified UPI ID.
        </p>
      </div>

      {/* Amount banner */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-amber-500/30 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Total Payable</span>
          <span className="text-xs text-zinc-300">{order.serviceName}</span>
        </div>
        <div className="text-2xl font-extrabold text-amber-400 font-mono">
          ₹{amountToPay}
        </div>
      </div>

      {/* QR Code and UPI ID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
        <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl shadow-md">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="CAMPORA UPI Payment QR Code"
              className="w-48 h-48 object-contain rounded-lg"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-zinc-400 text-xs">
              Generating QR...
            </div>
          )}
          <span className="text-[10px] text-zinc-800 font-bold mt-1">Scan using GPay, PhonePe, Paytm, BHIM</span>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block mb-1">
              Official UPI ID
            </label>
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg">
              <span className="font-mono font-bold text-amber-400 select-all truncate text-xs flex-1">
                {UPI_ID}
              </span>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors shrink-0"
              >
                {copiedUpi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 space-y-1 leading-relaxed">
            <p>1. Open any UPI application on your smartphone.</p>
            <p>2. Send exact amount <strong className="text-white">₹{amountToPay}</strong>.</p>
            <p>3. Upload the payment screenshot. UTR is optional.</p>
          </div>
        </div>
      </div>

      {/* Form for UTR and Proof submission */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-zinc-300">
            UPI Reference / UTR Number <span className="text-zinc-500">(Optional)</span>
          </label>
          <input
            type="text"
            value={utrNumber}
            onChange={(e) => setUtrNumber(e.target.value)}
            placeholder="Enter UTR if available (optional)"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-zinc-300">
            Upload Payment Screenshot / Receipt <span className="text-amber-400">*</span>
          </label>
          <div className="relative border-2 border-dashed border-zinc-800 hover:border-amber-500/50 rounded-xl p-3 text-center transition-colors">
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
              <Upload className="w-4 h-4 text-amber-400" />
              <span>{screenshotName ? screenshotName : 'Upload PNG or JPG screenshot (required, max 500 KB)'}</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <span>Submitting for Verification...</span>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Submit Screenshot for Admin Verification</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-zinc-500 text-center">
          Screenshot is required. UTR is optional. Admin manually checks the payment before work begins.
        </p>
      </form>
    </div>
  );
};
