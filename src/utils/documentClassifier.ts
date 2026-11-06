/**
 * Smart Document Classifier & Metadata Extractor for Indonesian Curriculum Documents
 * Evaluates filename, extensions, headers, and text content to automatically identify
 * Document Category, Semester (Ganjil/Genap), Class Grade, Subject, and Curriculum Framework.
 */

import { DocumentCategory, GradeLevel, SemesterType, CurriculumType, AutoExtractionResult } from '../types/curriculum';

export const SUBJECT_DICTIONARY: Record<string, { standardName: string; keywords: string[] }> = {
  matematika: {
    standardName: 'Matematika',
    keywords: ['matematika', 'math', 'aljabar', 'geometri', 'bilangan', 'statistika', 'mtk']
  },
  ipa: {
    standardName: 'Ilmu Pengetahuan Alam (IPA)',
    keywords: ['ipa', 'ilmu pengetahuan alam', 'biologi', 'fisika', 'kimia', 'sains', 'ekosistem', 'sel', 'zat aditif']
  },
  ips: {
    standardName: 'Ilmu Pengetahuan Sosial (IPS)',
    keywords: ['ips', 'ilmu pengetahuan sosial', 'sejarah', 'geografi', 'ekonomi', 'sosiologi', 'keragaman sosial']
  },
  bahasa_indonesia: {
    standardName: 'Bahasa Indonesia',
    keywords: ['bahasa indonesia', 'bindo', 'teks deskripsi', 'teks narasi', 'puisi', 'laporan hasil observasi', 'resensi', 'surat resmi']
  },
  bahasa_inggris: {
    standardName: 'Bahasa Inggris',
    keywords: ['bahasa inggris', 'english', 'bing', 'greeting', 'narrative text', 'recount text', 'procedure text', 'descriptive']
  },
  informatika: {
    standardName: 'Informatika',
    keywords: ['informatika', 'komputer', 'tik', 'algoritma', 'coding', 'berpikir komputasional', 'sistem komputer', 'jaringan komputer']
  },
  pendidikan_pancasila: {
    standardName: 'Pendidikan Pancasila / PPKn',
    keywords: ['pancasila', 'ppkn', 'kewarganegaraan', 'uud 1945', 'bhinneka tunggal ika', 'norma dan keadilan']
  },
  pai: {
    standardName: 'Pendidikan Agama Islam & Budi Pekerti',
    keywords: ['pai', 'agama islam', 'pendidikan agama', 'budi pekerti', 'al-quran', 'akidah', 'fiqih', 'akhlak']
  },
  pjok: {
    standardName: 'PJOK (Penjasorkes)',
    keywords: ['pjok', 'penjaskes', 'pendidikan jasmani', 'olahraga', 'kebugaran', 'senam', 'atletik', 'sepak bola', 'bola voli']
  },
  seni_budaya: {
    standardName: 'Seni Budaya & Keterampilan',
    keywords: ['seni budaya', 'seni rupa', 'seni musik', 'seni tari', 'seni teater', 'batik', 'ornamen']
  },
  prakarya: {
    standardName: 'Prakarya & Rekayasa',
    keywords: ['prakarya', 'kerajinan', 'pengolahan', 'budidaya', 'rekayasa']
  },
  bk: {
    standardName: 'Bimbingan dan Konseling (BK)',
    keywords: ['bimbingan konseling', 'bk', 'layanan klasikal', 'orientasi karir', 'psikososial']
  }
};

export const CATEGORY_LABELS: Record<DocumentCategory, { name: string; code: string; defaultJp: number }> = {
  silabus_atp: { name: 'Silabus / ATP (Alur Tujuan Pembelajaran)', code: 'ATP', defaultJp: 36 },
  modul_ajar: { name: 'Modul Ajar / RPP Diferensiasi', code: 'MA', defaultJp: 18 },
  promes: { name: 'Program Semester (Promes)', code: 'PROMES', defaultJp: 36 },
  prota: { name: 'Program Tahunan (Prota)', code: 'PROTA', defaultJp: 72 },
  capaian_pemb: { name: 'Capaian Pembelajaran (CP) & Pemetaan TP', code: 'CP-TP', defaultJp: 36 },
  kisi_soal: { name: 'Kisi-Kisi & Bank Soal Asesmen (STS/SAS)', code: 'SOAL', defaultJp: 4 },
  kosp: { name: 'KOSP (Kurikulum Operasional Satuan Pendidikan)', code: 'KOSP', defaultJp: 0 },
  modul_p5: { name: 'Modul Projek P5 (Profil Pelajar Pancasila)', code: 'P5', defaultJp: 24 }
};

/**
 * Automatically extracts document metadata from a filename and optional file text content
 */
export function classifyCurriculumDocument(
  fileName: string,
  fileSize: number,
  contentSnippet: string = ''
): AutoExtractionResult {
  const normalizedText = (fileName + ' ' + contentSnippet).toLowerCase();
  let confidence = 50;

  // 1. Detect Category
  let detectedCategory: DocumentCategory = 'silabus_atp';
  if (normalizedText.includes('modul ajar') || normalizedText.includes('rpp') || normalizedText.includes('lesson plan')) {
    detectedCategory = 'modul_ajar';
    confidence += 20;
  } else if (normalizedText.includes('promes') || normalizedText.includes('program semester')) {
    detectedCategory = 'promes';
    confidence += 25;
  } else if (normalizedText.includes('prota') || normalizedText.includes('program tahunan')) {
    detectedCategory = 'prota';
    confidence += 25;
  } else if (normalizedText.includes('atp') || normalizedText.includes('alur tujuan') || normalizedText.includes('silabus')) {
    detectedCategory = 'silabus_atp';
    confidence += 25;
  } else if (normalizedText.includes('capaian pembelajaran') || normalizedText.includes('cp ') || normalizedText.includes('pemetaan')) {
    detectedCategory = 'capaian_pemb';
    confidence += 20;
  } else if (normalizedText.includes('kisi-kisi') || normalizedText.includes('bank soal') || normalizedText.includes('asesmen') || normalizedText.includes('sts') || normalizedText.includes('sas')) {
    detectedCategory = 'kisi_soal';
    confidence += 20;
  } else if (normalizedText.includes('p5') || normalizedText.includes('projek penguatan') || normalizedText.includes('profil pelajar')) {
    detectedCategory = 'modul_p5';
    confidence += 25;
  } else if (normalizedText.includes('kosp') || normalizedText.includes('kurikulum operasional')) {
    detectedCategory = 'kosp';
    confidence += 30;
  }

  // 2. Detect Semester
  let detectedSemester: SemesterType = 'ganjil';
  if (
    normalizedText.includes('genap') ||
    normalizedText.includes('semester 2') ||
    normalizedText.includes('sem 2') ||
    normalizedText.includes('smt 2') ||
    normalizedText.includes('sem_2') ||
    normalizedText.includes('semester ii') ||
    normalizedText.includes('sem ii')
  ) {
    detectedSemester = 'genap';
    confidence += 15;
  } else if (
    normalizedText.includes('ganjil') ||
    normalizedText.includes('gasal') ||
    normalizedText.includes('semester 1') ||
    normalizedText.includes('sem 1') ||
    normalizedText.includes('smt 1') ||
    normalizedText.includes('sem_1') ||
    normalizedText.includes('semester i') ||
    normalizedText.includes('sem i')
  ) {
    detectedSemester = 'ganjil';
    confidence += 15;
  }

  // 3. Detect Grade Level
  let detectedGrade: GradeLevel = '7';
  if (
    normalizedText.includes('kelas 9') ||
    normalizedText.includes('kls 9') ||
    normalizedText.includes('kelas ix') ||
    normalizedText.includes('kls ix') ||
    normalizedText.includes('fase d - 9')
  ) {
    detectedGrade = '9';
    confidence += 15;
  } else if (
    normalizedText.includes('kelas 8') ||
    normalizedText.includes('kls 8') ||
    normalizedText.includes('kelas viii') ||
    normalizedText.includes('kls viii') ||
    normalizedText.includes('fase d - 8')
  ) {
    detectedGrade = '8';
    confidence += 15;
  } else if (
    normalizedText.includes('kelas 7') ||
    normalizedText.includes('kls 7') ||
    normalizedText.includes('kelas vii') ||
    normalizedText.includes('kls vii') ||
    normalizedText.includes('fase d - 7')
  ) {
    detectedGrade = '7';
    confidence += 15;
  } else if (normalizedText.includes('kelas 10') || normalizedText.includes('kelas x')) {
    detectedGrade = '10';
  } else if (normalizedText.includes('kelas 11') || normalizedText.includes('kelas xi')) {
    detectedGrade = '11';
  } else if (normalizedText.includes('kelas 12') || normalizedText.includes('kelas xii')) {
    detectedGrade = '12';
  }

  // 4. Detect Subject
  let detectedSubject = 'Matematika';
  let bestMatchCount = 0;

  for (const [, item] of Object.entries(SUBJECT_DICTIONARY)) {
    let matchCount = 0;
    for (const kw of item.keywords) {
      if (normalizedText.includes(kw)) {
        matchCount++;
      }
    }
    if (matchCount > bestMatchCount) {
      bestMatchCount = matchCount;
      detectedSubject = item.standardName;
    }
  }

  if (bestMatchCount > 0) {
    confidence += 20;
  }

  // 5. Detect Curriculum
  let detectedCurriculum: CurriculumType = 'Kurikulum Merdeka';
  if (normalizedText.includes('k13') || normalizedText.includes('kurikulum 2013') || normalizedText.includes('kd ') || normalizedText.includes('kompetensi dasar')) {
    detectedCurriculum = 'Kurikulum 2013';
  }

  // 6. Generate Clean Title
  const cleanBaseName = fileName.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ');
  const categoryInfo = CATEGORY_LABELS[detectedCategory];
  const detectedTitle = `${categoryInfo.name} ${detectedSubject} Kelas ${detectedGrade} Semester ${detectedSemester === 'ganjil' ? 'Ganjil' : 'Genap'}`;

  // 7. Estimate JP & sample competencies based on subject and grade
  const detectedJp = categoryInfo.defaultJp;
  const detectedCompetencies = generateSuggestedCompetencies(detectedSubject, detectedGrade, detectedSemester);

  return {
    fileName,
    fileSize,
    detectedTitle,
    detectedCategory,
    detectedSubject,
    detectedGrade,
    detectedSemester,
    detectedCurriculum,
    detectedJp,
    detectedCompetencies,
    confidenceScore: Math.min(confidence, 98),
    sampleSnippet: contentSnippet.slice(0, 180)
  };
}

/**
 * Generate authentic Indonesian standard learning competencies (Tujuan Pembelajaran)
 */
export function generateSuggestedCompetencies(
  subject: string,
  grade: GradeLevel,
  semester: SemesterType
): string[] {
  const key = `${subject}_${grade}_${semester}`.toLowerCase();

  if (key.includes('matematika')) {
    if (semester === 'ganjil') {
      return [
        'Memahami konsep bilangan bulat dan operasi hitung rasional',
        'Menyelesaikan permasalahan konteks nyata terkait perbandingan dan skala',
        'Mengidentifikasi bentuk aljabar linear dan pemodelan matematis'
      ];
    } else {
      return [
        'Menyelidiki sifat-sifat bangun datar dan teorema phytagoras',
        'Menganalisis penyajian data dalam diagram batang, garis, dan lingkaran',
        'Menghitung peluang empiris dan frekuensi relatif kejadian'
      ];
    }
  }

  if (key.includes('ilmu pengetahuan alam') || key.includes('ipa')) {
    if (semester === 'ganjil') {
      return [
        'Menganalisis konsep pengukuran besaran pokok dan besaran turunan',
        'Mengidentifikasi organisasi kehidupan seluler dan jaringan tumbuhan/hewan',
        'Memahami sifat wujud zat, perubahan fisika, dan perubahan kimia'
      ];
    } else {
      return [
        'Menjelaskan interaksi antara makhluk hidup dan lingkungan ekosistem',
        'Menganalisis pencemaran lingkungan dan upaya konservasi sumber daya',
        'Mengkaji sistem tata surya dan dinamika pergerakan lempeng bumi'
      ];
    }
  }

  if (key.includes('bahasa indonesia')) {
    if (semester === 'ganjil') {
      return [
        'Mengevaluasi gagasan dan pesan penting dalam teks deskripsi lisan dan tulis',
        'Menyusun teks cerita fantasi dengan struktur orientasi, komplikasi, dan resolusi',
        'Menyajikan teks prosedur dengan langkah-langkah logis dan kebahasaan yang runtut'
      ];
    } else {
      return [
        'Menganalisis fakta dan opini dalam teks berita media massa cetak dan digital',
        'Mengapresiasi keindahan diksi dan rima dalam puisi rakyat dan puisi modern',
        'Menulis surat resmi kedinasan dan surat pribadi sesuai etika komunikasi tertulis'
      ];
    }
  }

  if (key.includes('bahasa inggris')) {
    return [
      'Identify communicative purposes and context in greeting and self-introduction dialogs',
      'Describe people, animals, and common school objects using simple present tense and adjectives',
      'Follow and present short spoken procedure texts about daily school activities'
    ];
  }

  if (key.includes('informatika')) {
    return [
      'Menerapkan konsep computational thinking dalam pemecahan masalah dekomposisi dan pola',
      'Memahami arsitektur perangkat keras, perangkat lunak, dan interaksi sistem operasi',
      'Mendesain algoritma pemrograman visual (Scratch/Blockly) dan keamanan etika digital'
    ];
  }

  if (key.includes('pancasila')) {
    return [
      'Meneladani proses perumusan dan penetapan Pancasila sebagai dasar negara',
      'Mematuhi norma yang berlaku dalam kehidupan bermasyarakat untuk menegakkan keadilan',
      'Menghayati kedudukan UUD Negara Republik Indonesia Tahun 1945 dalam sistem hukum nasional'
    ];
  }

  return [
    `Penguasaan konsep materi esensial ${subject} untuk Semester ${semester === 'ganjil' ? '1 (Ganjil)' : '2 (Genap)'}`,
    `Penerapan keterampilan proses dan literasi numerasi dalam lingkup Kelas ${grade}`,
    `Penguatan Dimensi Profil Pelajar Pancasila (Mandiri, Bernalar Kritis, Gotong Royong)`
  ];
}
