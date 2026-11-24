import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Camera } from 'lucide-react';
import {
  SCHOOL_CLASS_GROUPS,
  SCHOOL_CLASS_VALUES,
  StudentGender,
  StudentRecord,
  StudentStatus
} from '../types/curriculum';
import {
  FAMILY_STATUS_OPTIONS,
  RELIGION_OPTIONS,
  compressStudentPhoto
} from '../utils/studentExcelHelper';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingStudent: StudentRecord | null;
  isWaka: boolean;
  activeHomeroomClass?: string | null;
  defaultClassFilter?: string;
  academicYear: string;
  onSave: (student: StudentRecord, isEdit: boolean) => Promise<void> | void;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  editingStudent,
  isWaka,
  activeHomeroomClass,
  defaultClassFilter = 'all',
  academicYear,
  onSave
}) => {
  const normalizedActiveClass = (activeHomeroomClass || '').trim().toUpperCase();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [nis, setNis] = useState('');
  const [nisn, setNisn] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<StudentGender>('L');
  const [religion, setReligion] = useState('Islam');
  const [familyStatus, setFamilyStatus] = useState('Anak Kandung');
  const [childOrder, setChildOrder] = useState('');
  const [homeroomClass, setHomeroomClass] = useState<string>(
    normalizedActiveClass || SCHOOL_CLASS_VALUES[0]
  );
  const [birthPlace, setBirthPlace] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianJob, setGuardianJob] = useState('');
  const [guardianAddress, setGuardianAddress] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentJob, setParentJob] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentAddress, setParentAddress] = useState('');
  const [address, setAddress] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [previousSchool, setPreviousSchool] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [entryClass, setEntryClass] = useState('');
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [graduationDate, setGraduationDate] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [status, setStatus] = useState<StudentStatus>('aktif');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (editingStudent) {
      setNis(editingStudent.nis === '-' ? '' : editingStudent.nis || '');
      setNisn(editingStudent.nisn === '-' ? '' : editingStudent.nisn || '');
      setName(editingStudent.name || '');
      setGender(editingStudent.gender || 'L');
      setReligion(editingStudent.religion || 'Islam');
      setFamilyStatus(editingStudent.familyStatus || 'Anak Kandung');
      setChildOrder(editingStudent.childOrder || '');
      setHomeroomClass(
        editingStudent.homeroomClass || normalizedActiveClass || SCHOOL_CLASS_VALUES[0]
      );
      setBirthPlace(editingStudent.birthPlace || '');
      setBirthDate(editingStudent.birthDate || '');
      setFatherName(editingStudent.fatherName || '');
      setMotherName(editingStudent.motherName || '');
      setGuardianName(editingStudent.guardianName || '');
      setGuardianJob(editingStudent.guardianJob || '');
      setGuardianAddress(editingStudent.guardianAddress || '');
      setParentName(editingStudent.parentName || '');
      setParentJob(editingStudent.parentJob || '');
      setParentPhone(editingStudent.parentPhone || '');
      setParentAddress(editingStudent.parentAddress || '');
      setAddress(editingStudent.address || '');
      setPhotoUrl(editingStudent.photoUrl || '');
      setPreviousSchool(editingStudent.previousSchool || '');
      setEntryDate(editingStudent.entryDate || '');
      setEntryClass(editingStudent.entryClass || '');
      setLeaveDate(editingStudent.leaveDate || '');
      setLeaveReason(editingStudent.leaveReason || '');
      setGraduationDate(editingStudent.graduationDate || '');
      setCertificateNumber(editingStudent.certificateNumber || '');
      setStatus(editingStudent.status || 'aktif');
      setNotes(editingStudent.notes || '');
    } else {
      setNis('');
      setNisn('');
      setName('');
      setGender('L');
      setReligion('Islam');
      setFamilyStatus('Anak Kandung');
      setChildOrder('');
      setHomeroomClass(
        isWaka
          ? defaultClassFilter !== 'all'
            ? defaultClassFilter
            : SCHOOL_CLASS_VALUES[0]
          : normalizedActiveClass || SCHOOL_CLASS_VALUES[0]
      );
      setBirthPlace('');
      setBirthDate('');
      setFatherName('');
      setMotherName('');
      setGuardianName('');
      setGuardianJob('');
      setGuardianAddress('');
      setParentName('');
      setParentJob('');
      setParentPhone('');
      setParentAddress('');
      setAddress('');
      setPhotoUrl('');
      setPreviousSchool('');
      setEntryDate('');
      setEntryClass('');
      setLeaveDate('');
      setLeaveReason('');
      setGraduationDate('');
      setCertificateNumber('');
      setStatus('aktif');
      setNotes('');
    }
  }, [isOpen, editingStudent, isWaka, normalizedActiveClass, defaultClassFilter]);

  if (!isOpen) return null;

  const handlePhotoUpload = async (file: File | null) => {
    if (!file) return;
    try {
      const compressed = await compressStudentPhoto(file);
      setPhotoUrl(compressed);
    } catch (err) {
      console.error(err);
    } finally {
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !name.trim()) return;

    const targetClass = isWaka
      ? homeroomClass.trim().toUpperCase()
      : normalizedActiveClass || homeroomClass.trim().toUpperCase();
    if (!targetClass) return;

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const resolvedPrimaryParent =
        parentName.trim() ||
        fatherName.trim() ||
        motherName.trim() ||
        guardianName.trim() ||
        undefined;

      const payload: StudentRecord = {
        id: editingStudent?.id || `std_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        nis: (nis.trim() || '-').slice(0, 40),
        nisn: (nisn.trim() || '-').slice(0, 40),
        name: name.trim().slice(0, 150),
        gender,
        religion: religion.trim() ? religion.trim().slice(0, 40) : undefined,
        familyStatus: familyStatus.trim() ? familyStatus.trim().slice(0, 50) : undefined,
        childOrder: childOrder.trim() ? childOrder.trim().slice(0, 20) : undefined,
        homeroomClass: targetClass.slice(0, 20),
        birthPlace: birthPlace.trim() ? birthPlace.trim().slice(0, 100) : undefined,
        birthDate: birthDate.trim() ? birthDate.trim().slice(0, 30) : undefined,
        fatherName: fatherName.trim() ? fatherName.trim().slice(0, 150) : undefined,
        motherName: motherName.trim() ? motherName.trim().slice(0, 150) : undefined,
        guardianName: guardianName.trim() ? guardianName.trim().slice(0, 150) : undefined,
        guardianJob: guardianJob.trim() ? guardianJob.trim().slice(0, 100) : undefined,
        guardianAddress: guardianAddress.trim() ? guardianAddress.trim().slice(0, 300) : undefined,
        parentName: resolvedPrimaryParent ? resolvedPrimaryParent.slice(0, 150) : undefined,
        parentJob: parentJob.trim() ? parentJob.trim().slice(0, 100) : undefined,
        parentPhone: parentPhone.trim() ? parentPhone.trim().slice(0, 40) : undefined,
        parentAddress: parentAddress.trim() ? parentAddress.trim().slice(0, 300) : undefined,
        address: address.trim() ? address.trim().slice(0, 300) : undefined,
        photoUrl: photoUrl || undefined,
        previousSchool: previousSchool.trim() ? previousSchool.trim().slice(0, 150) : undefined,
        entryDate: entryDate.trim() ? entryDate.trim().slice(0, 30) : undefined,
        entryClass: entryClass.trim() ? entryClass.trim().slice(0, 20) : undefined,
        leaveDate: leaveDate.trim() ? leaveDate.trim().slice(0, 30) : undefined,
        leaveReason: leaveReason.trim() ? leaveReason.trim().slice(0, 250) : undefined,
        graduationDate: graduationDate.trim() ? graduationDate.trim().slice(0, 30) : undefined,
        certificateNumber: certificateNumber.trim() ? certificateNumber.trim().slice(0, 80) : undefined,
        status,
        notes: notes.trim() ? notes.trim().slice(0, 500) : undefined,
        academicYear: editingStudent?.academicYear || academicYear,
        createdAt: editingStudent?.createdAt || now,
        updatedAt: now
      };

      await onSave(payload, Boolean(editingStudent));
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {editingStudent
                ? 'Edit & Lengkapi Data Peserta Didik / Buku Induk'
                : 'Tambah Peserta Didik & Data Buku Induk'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Data Peserta Didik &amp; Buku Induk tersinkron otomatis ke Cloud Firestore.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto text-xs">
          {/* Group 1: Identitas Pribadi */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-800 border-b border-slate-200 pb-1.5">
              1. Identitas Pribadi Peserta Didik
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">NIS</label>
                <input
                  type="text"
                  maxLength={40}
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="Contoh: 2290"
                  className="w-full font-mono text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">NISN</label>
                <input
                  type="text"
                  maxLength={40}
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value)}
                  placeholder="10 digit NISN"
                  className="w-full font-mono text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap Siswa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama sesuai Akta Kelahiran / Ijazah SD"
                  className="w-full font-medium text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as StudentGender)}
                  className="w-full font-semibold text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                >
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  maxLength={100}
                  value={birthPlace}
                  onChange={(e) => setBirthPlace(e.target.value)}
                  placeholder="Kota/Kabupaten"
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full font-mono text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Agama &amp; Kepercayaan</label>
                <select
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                >
                  {RELIGION_OPTIONS.map((rel) => (
                    <option key={rel} value={rel}>{rel}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status dalam Keluarga</label>
                <select
                  value={familyStatus}
                  onChange={(e) => setFamilyStatus(e.target.value)}
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                >
                  {FAMILY_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Anak Ke-</label>
                <input
                  type="text"
                  maxLength={20}
                  value={childOrder}
                  onChange={(e) => setChildOrder(e.target.value)}
                  placeholder="Contoh: 1"
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kelas Saat Ini</label>
                {isWaka ? (
                  <select
                    value={homeroomClass}
                    onChange={(e) => setHomeroomClass(e.target.value)}
                    className="w-full font-semibold text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                  >
                    {SCHOOL_CLASS_GROUPS.map((group) => (
                      <optgroup key={group.level} label={group.groupLabel}>
                        {group.classes.map((cls) => (
                          <option key={cls.value} value={cls.value}>
                            {cls.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    readOnly
                    value={`Kelas ${normalizedActiveClass || homeroomClass}`}
                    className="w-full font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg p-2.5"
                  />
                )}
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status di Sekolah</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StudentStatus)}
                  className="w-full font-semibold text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                >
                  <option value="aktif">Aktif</option>
                  <option value="pindahan">Pindahan</option>
                  <option value="keluar">Mutasi Keluar</option>
                  <option value="lulus">Lulus</option>
                </select>
              </div>
            </div>

            {/* Pas Foto Siswa 3x4 */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-16 border border-slate-300 rounded bg-white flex items-center justify-center overflow-hidden shrink-0">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Pas Foto" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">Pas Foto Siswa (3x4)</div>
                  <div className="text-[11px] text-slate-500">
                    Ditampilkan di pojok kiri bawah saat mencetak Lembar Buku Induk Siswa.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-teal-700" />
                  <span>{photoUrl ? 'Ganti Foto' : 'Unggah Foto 3x4'}</span>
                </button>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold cursor-pointer"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Group 2: Orang Tua / Wali & Alamat */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-800 border-b border-slate-200 pb-1.5">
              2. Keterangan Orang Tua / Wali &amp; Tempat Tinggal
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Ayah Kandung</label>
                <input
                  type="text"
                  maxLength={150}
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="Nama lengkap ayah"
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Ibu Kandung</label>
                <input
                  type="text"
                  maxLength={150}
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  placeholder="Nama lengkap ibu"
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kontak Utama Orang Tua</label>
                <input
                  type="text"
                  maxLength={150}
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Otomatis dari nama ayah/ibu"
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pekerjaan Orang Tua</label>
                <input
                  type="text"
                  maxLength={100}
                  value={parentJob}
                  onChange={(e) => setParentJob(e.target.value)}
                  placeholder="Contoh: Wiraswasta / ASN / Petani"
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">No. HP / Telepon</label>
                <input
                  type="text"
                  maxLength={40}
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full font-mono text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Peserta Didik</label>
                <input
                  type="text"
                  maxLength={300}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Desa/Kelurahan, RT/RW, Kecamatan"
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Orang Tua (Jika Berbeda)</label>
                <input
                  type="text"
                  maxLength={300}
                  value={parentAddress}
                  onChange={(e) => setParentAddress(e.target.value)}
                  placeholder="Kosongkan jika sama dengan alamat siswa"
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Wali (Jika Ada)</label>
                <input
                  type="text"
                  maxLength={150}
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="Opsional"
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pekerjaan Wali (Jika Ada)</label>
                <input
                  type="text"
                  maxLength={100}
                  value={guardianJob}
                  onChange={(e) => setGuardianJob(e.target.value)}
                  placeholder="Opsional"
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Wali (Jika Ada)</label>
                <input
                  type="text"
                  maxLength={300}
                  value={guardianAddress}
                  onChange={(e) => setGuardianAddress(e.target.value)}
                  placeholder="Opsional"
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Group 3: Riwayat Masuk, Mutasi & Kelulusan */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-800 border-b border-slate-200 pb-1.5">
              3. Riwayat Masuk, Mutasi &amp; Kelulusan
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Asal Sekolah (SD/MI/SMP Asal)</label>
                <input
                  type="text"
                  maxLength={150}
                  value={previousSchool}
                  onChange={(e) => setPreviousSchool(e.target.value)}
                  placeholder="Contoh: Sekolah Dasar (SD / MI)"
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Diterima Masuk</label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Diterima di Kelas</label>
                <input
                  type="text"
                  maxLength={20}
                  value={entryClass}
                  onChange={(e) => setEntryClass(e.target.value)}
                  placeholder="Misal: 7.1"
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Mutasi Keluar (Jika Keluar)</label>
                <input
                  type="date"
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alasan / Sekolah Tujuan Mutasi</label>
                <input
                  type="text"
                  maxLength={250}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Opsional jika mutasi keluar"
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal Lulus (Jika Lulus)</label>
                <input
                  type="date"
                  value={graduationDate}
                  onChange={(e) => setGraduationDate(e.target.value)}
                  className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor Ijazah / SKL</label>
                <input
                  type="text"
                  maxLength={80}
                  value={certificateNumber}
                  onChange={(e) => setCertificateNumber(e.target.value)}
                  placeholder="Nomor seri ijazah / surat keterangan lulus"
                  className="w-full font-mono text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Catatan Wali Kelas / Buku Induk</label>
              <textarea
                rows={2}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Prestasi, beasiswa PIP, ketua kelas, atau catatan penting lainnya..."
                className="w-full text-slate-900 border border-slate-200 rounded-lg p-2.5 focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'Menyimpan...'
                  : editingStudent
                  ? 'Simpan Perubahan Data'
                  : 'Simpan Data Siswa'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
