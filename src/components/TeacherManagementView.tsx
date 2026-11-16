import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Pencil, Trash2, Search, ShieldCheck, Award,
  Save, X, CheckCircle2, Mail, BookOpen, Info
} from 'lucide-react';
import { Teacher, SchoolProfile, CurriculumDocument } from '../types/curriculum';
import { SUBJECT_DICTIONARY } from '../utils/documentClassifier';

interface TeacherManagementViewProps {
  teachers: Teacher[];
  documents: CurriculumDocument[];
  profile: SchoolProfile;
  onSaveProfile: (updatedProfile: SchoolProfile) => void;
  onAddTeacher: (newTeacher: Teacher) => void;
  onUpdateTeacher: (updatedTeacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
}

export const TeacherManagementView: React.FC<TeacherManagementViewProps> = ({
  teachers,
  documents,
  profile,
  onSaveProfile,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher
}) => {
  // Pejabat Kurikulum quick edit state
  const [wakaName, setWakaName] = useState(profile.curriculumViceName);
  const [wakaNip, setWakaNip] = useState(profile.curriculumViceNip);
  const [headmasterName, setHeadmasterName] = useState(profile.headmasterName);
  const [headmasterNip, setHeadmasterNip] = useState(profile.headmasterNip);
  const [isOfficialsSaved, setIsOfficialsSaved] = useState(false);

  // Sync if profile updates asynchronously (e.g. from Firestore)
  useEffect(() => {
    setWakaName(profile.curriculumViceName);
    setWakaNip(profile.curriculumViceNip);
    setHeadmasterName(profile.headmasterName);
    setHeadmasterNip(profile.headmasterNip);
  }, [profile]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Teacher Add/Edit Modal state
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formName, setFormName] = useState('');
  const [formNip, setFormNip] = useState('');
  const [formSubject, setFormSubject] = useState('Matematika');
  const [formEmail, setFormEmail] = useState('');

  const subjectOptions = Object.values(SUBJECT_DICTIONARY).map(s => s.standardName);

  const handleSaveOfficials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wakaName.trim() || !wakaNip.trim()) return;

    onSaveProfile({
      ...profile,
      curriculumViceName: wakaName.trim(),
      curriculumViceNip: wakaNip.trim(),
      headmasterName: headmasterName.trim(),
      headmasterNip: headmasterNip.trim()
    });
    setIsOfficialsSaved(true);
    setTimeout(() => setIsOfficialsSaved(false), 3000);
  };

  const handleOpenAddTeacher = () => {
    setEditingTeacher(null);
    setFormName('');
    setFormNip('');
    setFormSubject(subjectOptions[0] || 'Matematika');
    setFormEmail('');
    setIsTeacherModalOpen(true);
  };

  const handleOpenEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormName(teacher.name);
    setFormNip(teacher.nip);
    setFormSubject(teacher.subject);
    setFormEmail(teacher.email);
    setIsTeacherModalOpen(true);
  };

  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSubject.trim()) return;

    if (editingTeacher) {
      onUpdateTeacher({
        ...editingTeacher,
        name: formName.trim(),
        nip: formNip.trim() || '-',
        subject: formSubject.trim(),
        email: formEmail.trim().toLowerCase()
      });
    } else {
      const newTeacher: Teacher = {
        id: `t-${Date.now()}`,
        name: formName.trim(),
        nip: formNip.trim() || '-',
        subject: formSubject.trim(),
        email: formEmail.trim().toLowerCase()
      };
      onAddTeacher(newTeacher);
    }

    setIsTeacherModalOpen(false);
  };

  const getTeacherDocsCount = (teacher: Teacher) => {
    return documents.filter(
      d =>
        d.teacherId === teacher.id ||
        d.teacherName === teacher.name ||
        (teacher.nip !== '-' && d.teacherNip === teacher.nip)
    ).length;
  };

  const filteredTeachers = teachers.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.nip.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 mb-8 text-xs">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Data Guru Pengampu &amp; Pejabat Kurikulum
          </h2>
          <p className="text-slate-500 mt-1">
            Perbarui nama, NIP, mata pelajaran, dan email belajar.id guru serta pejabat penandatangan (Waka Kurikulum &amp; Kepala Sekolah). Perubahan langsung tersinkron ke Matriks Guru dan Lembar Pengesahan.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddTeacher}
          className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Tambah Guru Baru</span>
        </button>
      </div>

      {/* Section 1: Waka Kurikulum & Kepala Sekolah Quick Update Card */}
      <form
        onSubmit={handleSaveOfficials}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Pejabat Penelaah &amp; Pengesah Kurikulum
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Nama Waka Kurikulum tampil di Sidebar, Dashboard Supervisi, dan kolom pemeriksa Lembar Pengesahan Resmi.
            </p>
          </div>

          {isOfficialsSaved && (
            <div className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Pejabat berhasil diperbarui</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Waka Kurikulum */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <ShieldCheck className="w-4 h-4 text-indigo-700 shrink-0" />
              <span>Waka Kurikulum (Pejabat Penelaah)</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nama Lengkap &amp; Gelar Waka Kurikulum
              </label>
              <input
                type="text"
                required
                value={wakaName}
                onChange={(e) => setWakaName(e.target.value)}
                placeholder="Contoh: Imam Arifin, S.Pd., M.Si."
                className="w-full font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                NIP Waka Kurikulum
              </label>
              <input
                type="text"
                required
                value={wakaNip}
                onChange={(e) => setWakaNip(e.target.value)}
                placeholder="Contoh: 19820815 200801 1 009"
                className="w-full font-mono text-slate-800 bg-white border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Kepala Sekolah */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <Award className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Kepala Sekolah (Pejabat Pengesah)</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nama Lengkap &amp; Gelar Kepala Sekolah
              </label>
              <input
                type="text"
                required
                value={headmasterName}
                onChange={(e) => setHeadmasterName(e.target.value)}
                placeholder="Contoh: Drs. H. Bambang Hartono, M.Ed."
                className="w-full font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                NIP Kepala Sekolah
              </label>
              <input
                type="text"
                required
                value={headmasterNip}
                onChange={(e) => setHeadmasterNip(e.target.value)}
                placeholder="Contoh: 19740512 199903 1 004"
                className="w-full font-mono text-slate-800 bg-white border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Nama Waka &amp; Kepala Sekolah</span>
          </button>
        </div>
      </form>

      {/* Section 2: Daftar Guru Pengampu */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-bold text-slate-900 text-sm">
              Daftar Guru Pengampu Mata Pelajaran
            </span>
            <span className="text-slate-400">·</span>
            <span className="font-mono text-slate-600 tabular-nums font-semibold">
              {teachers.length} Guru
            </span>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama guru, NIP, mapel, email..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-4 min-w-[220px]">Nama Guru &amp; Gelar</th>
                <th className="py-3 px-4 min-w-[160px]">NIP / NUPTK</th>
                <th className="py-3 px-4 min-w-[180px]">Mata Pelajaran</th>
                <th className="py-3 px-4 min-w-[210px]">Email Akun (belajar.id)</th>
                <th className="py-3 px-3 min-w-[90px] text-center">Berkas</th>
                <th className="py-3 px-4 min-w-[100px] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Tidak ada data guru yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => {
                  const docCount = getTeacherDocsCount(teacher);
                  return (
                    <tr key={teacher.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                            {teacher.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{teacher.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">ID: {teacher.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700 tabular-nums">
                        {teacher.nip || '-'}
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {teacher.subject}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                        {teacher.email || '-'}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold text-slate-800 tabular-nums">
                        {docCount} berkas
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditTeacher(teacher)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title={`Edit data ${teacher.name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (teachers.length <= 1) {
                                alert('Minimal harus ada 1 guru pengampu di dalam sistem.');
                                return;
                              }
                              if (window.confirm(`Yakin ingin menghapus "${teacher.name}" dari daftar guru? Dokumen yang sudah diarsipkan tetap tersimpan.`)) {
                                onDeleteTeacher(teacher.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={`Hapus ${teacher.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl flex items-start gap-3 text-indigo-900">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Catatan Sinkronisasi Otomatis:</strong> Email yang didaftarkan pada setiap guru akan digunakan sistem untuk mengenali akun <strong>Google / belajar.id</strong> saat guru masuk melalui halaman login, sehingga guru langsung diarahkan ke berkas miliknya sendiri. Jika nama atau NIP guru diperbarui, seluruh dokumen arsip milik guru tersebut akan otomatis ikut diperbarui.
        </div>
      </div>

      {/* Add / Edit Teacher Modal */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingTeacher ? 'Edit Data Guru Pengampu' : 'Tambah Guru Pengampu Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsTeacherModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTeacherSubmit} className="p-6 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap &amp; Gelar Guru
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Siti Rahmawati, S.Pd., M.Pd."
                  className="w-full font-semibold text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NIP / NUPTK
                  </label>
                  <input
                    type="text"
                    value={formNip}
                    onChange={(e) => setFormNip(e.target.value)}
                    placeholder="Contoh: 19840210 200902 2 007"
                    className="w-full font-mono text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mata Pelajaran Utama
                  </label>
                  <input
                    type="text"
                    required
                    list="subject-suggestions"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="Pilih atau ketik mata pelajaran"
                    className="w-full font-medium text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
                  />
                  <datalist id="subject-suggestions">
                    {subjectOptions.map((sub) => (
                      <option key={sub} value={sub} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Akun Guru (belajar.id / Google)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="Contoh: nama.guru@guru.smp.belajar.id"
                    className="w-full pl-9 pr-3 py-2.5 font-mono text-slate-800 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Digunakan untuk pencocokan login otomatis akun belajar.id / Google.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTeacherModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingTeacher ? 'Simpan Perubahan' : 'Tambahkan Guru'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
