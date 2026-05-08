import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PaywallSection({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[4px] rounded-2xl z-20">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl border border-gray-100 text-center max-w-lg w-full mx-4 animate-in zoom-in-95 duration-300 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        
        <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Premium Content</h3>
        
        <p className="font-bold text-lg text-indigo-600 mb-6 px-4">
          You’re one step away from applying with a strong profile.
        </p>
        
        <div className="bg-slate-50 rounded-2xl p-6 text-left mb-8 border border-slate-100">
          <p className="font-bold text-gray-900 mb-4 uppercase tracking-widest text-xs opacity-70">You'll unlock:</p>
          <ul className="space-y-3">
            <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-500" /> <span className="font-bold text-gray-700">Optimized Resume</span></li>
            <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-500" /> <span className="font-bold text-gray-700">Personalized Cover Letter</span></li>
            <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-green-500" /> <span className="font-bold text-gray-700">Ready-to-send HR Email</span></li>
            <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-indigo-500" /> <span className="font-black text-indigo-700">Higher shortlist chances</span></li>
          </ul>
        </div>

        <Button 
          onClick={onUnlock}
          size="lg" 
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xl h-16 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 mb-4"
        >
          Unlock Full Application – ₹499
        </Button>
        
        <p className="text-sm font-bold text-gray-600 mb-3">
          Most users apply within 2 minutes after unlocking.
        </p>
        <p className="text-xs font-semibold text-gray-400">
          No subscription • One-time payment • Instant access
        </p>
      </div>
    </div>
  );
}
