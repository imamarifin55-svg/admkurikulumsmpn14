import React from 'react';
import { CurriculumDocument, SchoolProfile } from '../types/curriculum';
import { CATEGORY_LABELS } from '../utils/documentClassifier';
import { Printer, ArrowLeft, CheckCircle2, ShieldCheck, QrCode } from 'lucide-react';

interface PrintValidationSheetProps {
  document: CurriculumDocument | null;
  profile: SchoolProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintValidationSheet: React.FC<PrintValidationSheetProps> = ({
  document,
  profile,
  isOpen,
  onClose
}) => {
  if (!isOpen || !document) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden my-6 print:m-0 print:border-none print:shadow-none">
        {/* Floating Top Control for Screen Mode */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </button>
            <span className="text-xs text-slate-300 font-medium">
              Pratinjau Lembar Pengesahan Resmi (Format Cetak A4)
            </span>
          </div>

          <button
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" /> Cetak / Unduh Dokumen (PDF)
          </button>
        </div>

        {/* Printable Official Sheet (A4 Proportion) */}
        <div className="p-8 sm:p-12 text-slate-900 bg-white font-serif max-w-[800px] mx-auto print:max-w-none print:p-8">
          {/* KOP SURAT RESMI */}
          <div className="pb-3 border-b-4 border-slate-900 relative">
            <div className="flex items-center justify-between gap-4 mb-1">
              {/* Logo Pemda */}
              <div className="w-20 h-20 flex items-center justify-center shrink-0">
                {profile.pemdaLogoUrl ? (
                  <img src={profile.pemdaLogoUrl} alt="Logo Pemda" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="w-14 h-14 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400 font-sans text-center">
                    Logo Pemda
                  </div>
                )}
              </div>

              {/* Teks Tengah Kop */}
              <div className="text-center font-sans flex-1">
                <div className="text-xs tracking-widest font-semibold uppercase text-slate-700">
                  {profile.regionalGovernment || 'PEMERINTAH DAERAH KHUSUS IBUKOTA JAKARTA'}
                </div>
                <div className="text-sm tracking-wider font-semibold uppercase text-slate-800">
                  {profile.educationDepartment || 'DINAS PENDIDIKAN'}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 font-serif my-0.5">
                  {profile.name.toUpperCase()}
                </h1>
                <div className="text-[11px] text-slate-600 font-sans leading-tight">
                  {profile.address} {profile.postalCode ? `Kode Pos ${profile.postalCode}` : ''}
                </div>
                <div className="text-[10px] text-slate-500 font-sans tracking-wide mt-0.5">
                  NPSN: {profile.npsn} · {profile.accreditation} · Telp: {profile.phone || '-'} · Laman: {profile.website || '-'}
                </div>
              </div>

              {/* Logo Sekolah */}
              <div className="w-20 h-20 flex items-center justify-center shrink-0">
                {profile.schoolLogoUrl ? (
                  <img src={profile.schoolLogoUrl} alt="Logo Sekolah" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="w-14 h-14 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400 font-sans text-center">
                    Logo Sekolah
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Garis ganda kop surat */}
          <div className="border-b border-slate-900 mt-0.5 mb-6" />

          {/* JUDUL LEMBAR PENGESAHAN */}
          <div className="text-center my-6 font-sans">
            <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-slate-950 underline decoration-2 underline-offset-4">
              LEMBAR VERIFIKASI DAN PENGESAHAN
            </h2>
            <div className="text-xs font-semibold text-slate-700 mt-1 uppercase">
              DOKUMEN PERANGKAT AJAR KURIKULUM MERDEKA
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
              Nomor Registrasi: {document.approvalNumber || 'REG-KUR/SMP1/2025/ATP-001'}
            </div>
          </div>

          <p className="text-xs font-sans text-slate-800 leading-relaxed mb-4 text-justify">
            Setelah melalui proses telaah, supervisi, dan verifikasi kelayakan substansi kurikulum yang dilaksanakan oleh Tim Pengembang Kurikulum Satuan Pendidikan, maka dokumen perangkat pembelajaran di bawah ini:
          </p>

          {/* TABEL IDENTITAS PERANGKAT */}
          <div className="border border-slate-400 rounded-lg overflow-hidden font-sans text-xs mb-6">
            <table className="w-full border-collapse">
              <tbody className="divide-y divide-slate-300">
                <tr className="bg-slate-50">
                  <td className="w-1/3 py-2 px-3 font-semibold text-slate-700 border-r border-slate-300">
                    Nama Dokumen
                  </td>
                  <td className="py-2 px-3 font-bold text-slate-900">
                    {document.title}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-700 border-r border-slate-300">
                    Kategori Dokumen
                  </td>
                  <td className="py-2 px-3 text-slate-800">
                    {CATEGORY_LABELS[document.category]?.name || document.category}
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="py-2 px-3 font-semibold text-slate-700 border-r border-slate-300">
                    Mata Pelajaran &amp; Jenjang
                  </td>
                  <td className="py-2 px-3 text-slate-800">
                    {document.subject} · Kelas {document.grade} (Fase D SMP)
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-700 border-r border-slate-300">
                    Semester &amp; Tahun Ajaran
                  </td>
                  <td className="py-2 px-3 font-bold text-indigo-900">
                    Semester {document.semester === 'ganjil' ? 'Ganjil (Gasal)' : 'Genap'} · TP {document.academicYear}
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="py-2 px-3 font-semibold text-slate-700 border-r border-slate-300">
                    Guru Penyusun / Pengampu
                  </td>
                  <td className="py-2 px-3 text-slate-900 font-semibold">
                    {document.teacherName} (NIP. {document.teacherNip})
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-700 border-r border-slate-300">
                    Alokasi Jam Pembelajaran
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-800">
                    {document.alokasiJp ? `${document.alokasiJp} Jam Pelajaran (JP)` : 'Sesuai Kalender Pendidikan'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* CATATAN VERIFIKATOR */}
          <div className="p-3 border border-slate-300 rounded-lg bg-slate-50 font-sans text-xs mb-6">
            <div className="font-semibold text-slate-800 mb-1">
              Catatan &amp; Rekomendasi Tim Supervisi Kurikulum:
            </div>
            <div className="text-slate-700 italic leading-relaxed">
              &ldquo;{document.supervisorNotes || 'Perangkat ajar telah memenuhi kriteria kelayakan Alur Tujuan Pembelajaran, Asesmen Diagnostik/Formatif, serta diferensiasi pembelajaran Kurikulum Merdeka.'}&rdquo;
            </div>
            <div className="mt-2 text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              STATUS: Dinyatakan SAH dan LAYAK digunakan sebagai pedoman pembelajaran TP {document.academicYear}.
            </div>
          </div>

          {/* TANDA TANGAN DUA KOLOM */}
          <div className="font-sans text-xs grid grid-cols-2 gap-8 pt-4">
            {/* Verifikator: Waka Kurikulum */}
            <div className="text-center">
              <div className="text-slate-600">Mengetahui &amp; Memverifikasi,</div>
              <div className="font-semibold text-slate-800">Waka Bidang Kurikulum</div>
              
              {/* Digital Seal / QR */}
              <div className="my-3 flex flex-col items-center justify-center">
                <div className="w-20 h-20 border border-slate-300 rounded-lg p-1 bg-white shadow-xs flex flex-col items-center justify-center">
                  <div className="text-[9px] font-mono font-bold text-indigo-700">TERVALIDASI</div>
                  <div className="w-10 h-10 border border-indigo-200 rounded flex items-center justify-center my-0.5">
                    <QrCode className="w-8 h-8 text-indigo-800" />
                  </div>
                  <div className="text-[8px] font-mono text-slate-500">DIGITAL SIGN</div>
                </div>
              </div>

              <div className="font-bold text-slate-900 underline underline-offset-2">
                {profile.curriculumViceName}
              </div>
              <div className="text-[11px] text-slate-600 font-mono">
                NIP. {profile.curriculumViceNip}
              </div>
            </div>

            {/* Pengesahan: Kepala Sekolah */}
            <div className="text-center">
              <div className="text-slate-600">Jakarta, {currentDate}</div>
              <div className="font-semibold text-slate-800">Mengesahkan: Kepala Sekolah</div>

              {/* Digital Seal / QR */}
              <div className="my-3 flex flex-col items-center justify-center">
                <div className="w-20 h-20 border-2 border-emerald-500/50 rounded-lg p-1 bg-white shadow-xs flex flex-col items-center justify-center">
                  <div className="text-[9px] font-mono font-bold text-emerald-800">DISAHKAN</div>
                  <div className="w-10 h-10 border border-emerald-300 rounded flex items-center justify-center my-0.5">
                    <ShieldCheck className="w-8 h-8 text-emerald-700" />
                  </div>
                  <div className="text-[8px] font-mono text-slate-500">KEPALA SEKOLAH</div>
                </div>
              </div>

              <div className="font-bold text-slate-900 underline underline-offset-2">
                {profile.headmasterName}
              </div>
              <div className="text-[11px] text-slate-600 font-mono">
                NIP. {profile.headmasterNip}
              </div>
            </div>
          </div>

          {/* Footer watermark notice */}
          <div className="mt-10 pt-4 border-t border-slate-200 text-center font-sans text-[10px] text-slate-400">
            Arsip Digital Sistem Administrasi Kurikulum Satuan Pendidikan · Dicetak melalui ArsipKurikulum pada {new Date().toLocaleString('id-ID')}
          </div>
        </div>
      </div>
    </div>
  );
};
