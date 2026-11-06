import React, { useState } from 'react';
import { 
  FolderKanban, Plus, Pencil, Trash2, CheckCircle2, X, 
  Save, AlertCircle, Info, ShieldCheck, ToggleLeft, ToggleRight 
} from 'lucide-react';
import { CategoryItem } from '../types/curriculum';

interface CategoryManagementViewProps {
  categories: CategoryItem[];
  onAddCategory: (newCategory: CategoryItem) => void;
  onUpdateCategory: (updatedCategory: CategoryItem) => void;
  onDeleteCategory: (categoryId: string) => void;
}

export const CategoryManagementView: React.FC<CategoryManagementViewProps> = ({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}) => {
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State for Adding / Editing
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [defaultJp, setDefaultJp] = useState<number>(36);
  const [description, setDescription] = useState('');
  const [isSupervisedInMatrix, setIsSupervisedInMatrix] = useState(true);

  const handleOpenAddModal = () => {
    setCode('');
    setName('');
    setDefaultJp(36);
    setDescription('');
    setIsSupervisedInMatrix(true);
    setEditingCategory(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCode(cat.code);
    setName(cat.name);
    setDefaultJp(cat.defaultJp);
    setDescription(cat.description || '');
    setIsSupervisedInMatrix(cat.isSupervisedInMatrix);
    setIsAddModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    if (editingCategory) {
      onUpdateCategory({
        ...editingCategory,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        defaultJp: Number(defaultJp),
        description: description.trim(),
        isSupervisedInMatrix
      });
    } else {
      const generatedId = `cat_${Date.now()}_${code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      onAddCategory({
        id: generatedId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        defaultJp: Number(defaultJp),
        description: description.trim(),
        isSupervisedInMatrix,
        isSystemDefault: false
      });
    }

    setIsAddModalOpen(false);
  };

  const handleToggleMatrixStatus = (cat: CategoryItem) => {
    onUpdateCategory({
      ...cat,
      isSupervisedInMatrix: !cat.isSupervisedInMatrix
    });
  };

  return (
    <div className="space-y-6 mb-8 text-xs">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Kelola Kategori Perangkat Pembelajaran &amp; Silabus
            </h2>
            <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-0.5">
              {categories.length} Kategori Terdaftar
            </span>
          </div>
          <p className="text-slate-500 mt-1">
            Konfigurasikan jenis dokumen kurikulum sekolah. Kategori yang ditandai aktif di matriks akan otomatis muncul sebagai kolom pemantauan supervisi guru.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Tambah Kategori Baru</span>
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="font-bold text-slate-900 flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-indigo-600" />
            <span>Daftar Kategori Instrumen Perangkat Ajar</span>
          </div>
          <span className="text-[11px] text-slate-500">
            Kolom Matriks: {categories.filter(c => c.isSupervisedInMatrix).length} terpilih
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="py-3 px-4 min-w-[90px] text-center">Kode</th>
                <th className="py-3 px-4 min-w-[240px]">Nama Kategori Perangkat</th>
                <th className="py-3 px-3 min-w-[90px] text-center">Default JP</th>
                <th className="py-3 px-4 min-w-[260px]">Deskripsi &amp; Panduan Penggunaan</th>
                <th className="py-3 px-4 min-w-[140px] text-center">Pantau di Matriks Guru</th>
                <th className="py-3 px-4 min-w-[100px] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {categories.map((cat) => {
                return (
                  <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Code Badge */}
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-xs">
                        {cat.code}
                      </span>
                    </td>

                    {/* Category Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{cat.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        ID: {cat.id}
                      </div>
                    </td>

                    {/* Default JP */}
                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-800 tabular-nums">
                      {cat.defaultJp > 0 ? `${cat.defaultJp} JP` : '-'}
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 text-slate-600 leading-relaxed">
                      {cat.description || '-'}
                    </td>

                    {/* Toggle Matriks Status */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleMatrixStatus(cat)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                          cat.isSupervisedInMatrix
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Klik untuk mengubah visibilitas kolom di Matriks Guru"
                      >
                        {cat.isSupervisedInMatrix ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Tampil di Matriks</span>
                          </>
                        ) : (
                          <span>Tidak Tampil</span>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(cat)}
                          className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit Kategori"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Yakin ingin menghapus kategori "${cat.name}"? Dokumen yang sudah ada tetap tersimpan.`)) {
                              onDeleteCategory(cat.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Kategori"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Card */}
      <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl flex items-start gap-3 text-indigo-900">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Integrasi Otomatis:</strong> Setiap kategori yang Anda tambahkan atau ubah di sini akan langsung tersedia pada formulir <strong>Unggah Dokumen Otomatis</strong>, formulir <strong>Edit Dokumen</strong>, dan sebagai kolom pemantauan pada <strong>Matriks Kelengkapan Supervisi Guru</strong>.
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingCategory ? 'Edit Kategori Perangkat Pembelajaran' : 'Tambah Kategori Perangkat Baru'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {/* Code & Default JP */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kode Singkat (Huruf Kapital)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: LKPD, ATP, RPP"
                    className="w-full uppercase font-mono font-bold text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alokasi JP Standar
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={150}
                    value={defaultJp}
                    onChange={(e) => setDefaultJp(Number(e.target.value))}
                    className="w-full font-mono font-semibold text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap Kategori Perangkat
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Lembar Kerja Peserta Didik (LKPD)"
                  className="w-full font-medium text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Deskripsi / Fungsi Dokumen
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Penjelasan fungsi perangkat dan acuan kurikulum..."
                  className="w-full text-slate-800 border border-slate-200 rounded-lg p-2.5 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Monitored in Teacher Matrix Checkbox */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">
                    Tampilkan Kolom di Matriks Guru
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Jika aktif, Waka Kurikulum akan memantau kelengkapan berkas ini untuk tiap guru.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isSupervisedInMatrix}
                  onChange={(e) => setIsSupervisedInMatrix(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingCategory ? 'Simpan Perubahan' : 'Tambahkan Kategori'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
