import React, { useState } from 'react';
import { 
  ShieldCheck, UserCheck, LogIn, LogOut, ChevronDown, Check
} from 'lucide-react';
import { AppUser, AppUserRole, Teacher } from '../types/curriculum';
import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup } from 'firebase/auth';

interface RoleSwitcherProps {
  currentUser: AppUser;
  onRoleChange: (role: AppUserRole, teacherId?: string) => void;
  teachers: Teacher[];
  onLogout: () => void;
  wakaName?: string;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  currentUser,
  onRoleChange,
  teachers,
  onLogout,
  wakaName
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const isWakaAccount = currentUser.email === 'imamarifin55@admin.smp.belajar.id';

  const handleSwitchGoogleAccount = async () => {
    try {
      setIsAuthLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.warn('Google account switch cancelled or failed:', err);
    } finally {
      setIsAuthLoading(false);
      setIsOpen(false);
    }
  };

  const selectedTeacher = teachers.find(t => t.id === currentUser.teacherId);

  return (
    <div className="relative">
      {/* Active Role Capsule Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-2xs transition-all text-left text-xs font-medium cursor-pointer"
        title="Informasi akun & beralih tampilan peran"
      >
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
          currentUser.role === 'waka_kurikulum'
            ? 'bg-indigo-700 text-white'
            : 'bg-emerald-600 text-white'
        }`}>
          {currentUser.role === 'waka_kurikulum' ? (
            <ShieldCheck className="w-3.5 h-3.5" />
          ) : (
            <UserCheck className="w-3.5 h-3.5" />
          )}
        </div>

        <div className="hidden sm:block min-w-0 pr-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
            {currentUser.role === 'waka_kurikulum' ? 'Mode Waka Kurikulum' : 'Portal Guru'}
          </div>
          <div className="text-xs font-bold text-slate-800 truncate max-w-[150px]">
            {currentUser.role === 'waka_kurikulum' ? (wakaName || 'Dashboard Utama') : selectedTeacher?.name || currentUser.displayName}
          </div>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {/* Role & Account Dropdown */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 p-2.5 space-y-2 text-xs">
            {/* Connected Account Info */}
            <div className="px-2.5 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-[11px] truncate">
                  {currentUser.email}
                </div>
                <div className="text-[10px] text-emerald-700 font-medium">
                  Sinkronisasi Cloud Real-Time Aktif
                </div>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold shrink-0">
                Real-Time
              </span>
            </div>

            {/* Waka Admin Role Switcher (available for Waka account) */}
            {isWakaAccount && (
              <>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                    Tampilan Dashboard:
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onRoleChange('waka_kurikulum');
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                      currentUser.role === 'waka_kurikulum'
                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-indigo-700 text-white flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-tight truncate">
                          {wakaName || 'Waka Kurikulum'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          Dashboard Utama Sekolah
                        </div>
                      </div>
                    </div>
                    {currentUser.role === 'waka_kurikulum' && (
                      <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                    )}
                  </button>
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                    Pratinjau Portal Guru:
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {teachers.map((t) => {
                      const isSelected = currentUser.role === 'guru' && currentUser.teacherId === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            onRoleChange('guru', t.id);
                            setIsOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-950 font-bold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {t.name.split(' ')[0][0]}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs truncate font-medium">{t.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">{t.subject}</div>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Account Actions */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <button
                type="button"
                onClick={handleSwitchGoogleAccount}
                disabled={isAuthLoading}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isAuthLoading ? 'Memproses...' : 'Ganti Akun Google / belajar.id'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Akun</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
