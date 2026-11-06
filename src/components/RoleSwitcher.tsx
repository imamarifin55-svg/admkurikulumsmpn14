import React, { useState } from 'react';
import { 
  ShieldCheck, UserCheck, LogIn, LogOut, ChevronDown, 
  Sparkles, Layers, CloudCheck, Check, School
} from 'lucide-react';
import { AppUser, AppUserRole, Teacher } from '../types/curriculum';
import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

interface RoleSwitcherProps {
  currentUser: AppUser;
  onRoleChange: (role: AppUserRole, teacherId?: string) => void;
  teachers: Teacher[];
  isCloudSynced: boolean;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  currentUser,
  onRoleChange,
  teachers,
  isCloudSynced
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsAuthLoading(true);
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;
      
      // If logging in as Waka Kurikulum admin email
      if (user.email === 'imamarifin55@admin.smp.belajar.id') {
        onRoleChange('waka_kurikulum');
      } else {
        // Find if user corresponds to any registered teacher
        const matchedTeacher = teachers.find(t => t.email.toLowerCase() === (user.email || '').toLowerCase());
        onRoleChange('guru', matchedTeacher ? matchedTeacher.id : teachers[0].id);
      }
    } catch (err) {
      console.warn('Firebase Google Auth popup cancelled or failed:', err);
    } finally {
      setIsAuthLoading(false);
      setIsOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn(e);
    }
    // Default to Waka view
    onRoleChange('waka_kurikulum');
    setIsOpen(false);
  };

  const selectedTeacher = teachers.find(t => t.id === currentUser.teacherId);

  return (
    <div className="relative">
      {/* Active Role Capsule Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-2xs transition-all text-left text-xs font-medium cursor-pointer"
        title="Beralih peran antara Waka Kurikulum (Dashboard Utama) dan Portal Guru Mandiri"
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
            {currentUser.role === 'waka_kurikulum' ? 'Dashboard Utama Sekolah' : selectedTeacher?.name || 'Guru Pengampu'}
          </div>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {/* Role Selection Dropdown */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 p-2.5 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
            {/* Header info */}
            <div className="px-2.5 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-800 text-[11px]">
                  Hak Akses &amp; Integrasi Cloud
                </div>
                <div className="text-[10px] text-slate-500">
                  {isCloudSynced ? '✓ Terhubung ke Firestore' : 'Penyimpanan Offline Lokal'}
                </div>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Online
              </span>
            </div>

            {/* Option 1: Waka Kurikulum (Dashboard Utama) */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                Pilih Tampilan Peran:
              </div>

              <button
                type="button"
                onClick={() => {
                  onRoleChange('waka_kurikulum');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
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
                      Waka Kurikulum (Dashboard Utama)
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      Akses semua berkas guru, telaah &amp; supervisi
                    </div>
                  </div>
                </div>
                {currentUser.role === 'waka_kurikulum' && (
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                )}
              </button>
            </div>

            {/* Option 2: Portal Guru Mandiri (Per Guru) */}
            <div className="pt-1 border-t border-slate-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                Atau Masuk Sebagai Guru Pengampu:
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
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
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

            {/* Google Login with belajar.id */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isAuthLoading}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk Akun Google / belajar.id</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
