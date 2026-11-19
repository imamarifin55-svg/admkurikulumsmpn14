import React, { useEffect, useMemo, useState } from 'react';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
  Film,
  Music,
  FileArchive,
  FileCode,
  File as FileIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  ExternalLink,
  Download,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  UploadCloud
} from 'lucide-react';
import { CurriculumDocument, DocumentFile } from '../types/curriculum';

interface UniversalFilePreviewProps {
  storedFile: DocumentFile | null;
  blobUrl: string | null;
  documentMeta: CurriculumDocument;
  isLoading: boolean;
  onDownload?: () => void;
  onRequestUpload?: () => void;
}

type PreviewMode =
  | 'image'
  | 'pdf'
  | 'docx'
  | 'doc_legacy'
  | 'odt'
  | 'rtf'
  | 'spreadsheet'
  | 'pptx'
  | 'odp'
  | 'text'
  | 'audio'
  | 'video'
  | 'zip'
  | 'binary';

interface SheetData {
  name: string;
  rows: string[][];
  totalRows: number;
  totalCols: number;
}

interface SlideData {
  slideNumber: number;
  paragraphs: string[];
}

interface ZipEntryInfo {
  name: string;
  dir: boolean;
  size: number;
}

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif', 'tif', 'tiff']);
const SPREADSHEET_EXTS = new Set(['xlsx', 'xls', 'xlsm', 'xlsb', 'ods', 'csv', 'tsv']);
const TEXT_EXTS = new Set([
  'txt', 'md', 'markdown', 'json', 'xml', 'html', 'htm', 'css', 'scss',
  'js', 'jsx', 'ts', 'tsx', 'yml', 'yaml', 'ini', 'conf', 'log', 'sql', 'py', 'java', 'php'
]);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mkv']);

function dataUrlToUint8Array(dataUrl: string): Uint8Array | null {
  try {
    const commaIdx = dataUrl.indexOf(',');
    const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function sanitizeHtml(rawHtml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  doc.querySelectorAll('script, iframe, object, embed, link, meta, style').forEach((el) => el.remove());
  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const val = attr.value.trim().toLowerCase();
      if (
        name.startsWith('on') ||
        ((name === 'href' || name === 'src') && val.startsWith('javascript:'))
      ) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.innerHTML;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getColumnLabel(index: number): string {
  let label = '';
  let n = index;
  while (n >= 0) {
    label = String.fromCharCode((n % 26) + 65) + label;
    n = Math.floor(n / 26) - 1;
  }
  return label;
}

function detectPreviewMode(fileName: string, mimeType: string, bytes: Uint8Array | null): PreviewMode {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  // Check magic bytes to guard against misnamed files or missing extensions
  const hasPdfHeader =
    bytes && bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
  const isPngMagic =
    bytes && bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpgMagic =
    bytes && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isGifMagic =
    bytes && bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;

  if (IMAGE_EXTS.has(ext) || mime.startsWith('image/') || isPngMagic || isJpgMagic || isGifMagic) {
    return 'image';
  }
  if (ext === 'pdf' || mime === 'application/pdf') {
    if (bytes && bytes.length > 0 && !hasPdfHeader) {
      // File saved with .pdf extension but actually plain text (e.g. demo mock)
      return 'text';
    }
    return 'pdf';
  }
  if (
    ext === 'docx' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  if (ext === 'doc' || mime === 'application/msword') {
    return 'doc_legacy';
  }
  if (ext === 'odt' || mime === 'application/vnd.oasis.opendocument.text') {
    return 'odt';
  }
  if (ext === 'rtf' || mime === 'application/rtf' || mime === 'text/rtf') {
    return 'rtf';
  }
  if (
    SPREADSHEET_EXTS.has(ext) ||
    mime.includes('spreadsheetml') ||
    mime === 'application/vnd.ms-excel' ||
    mime === 'text/csv'
  ) {
    return 'spreadsheet';
  }
  if (
    ext === 'pptx' ||
    mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'pptx';
  }
  if (ext === 'odp' || mime === 'application/vnd.oasis.opendocument.presentation') {
    return 'odp';
  }
  if (AUDIO_EXTS.has(ext) || mime.startsWith('audio/')) {
    return 'audio';
  }
  if (VIDEO_EXTS.has(ext) || mime.startsWith('video/')) {
    return 'video';
  }
  if (ext === 'zip' || mime === 'application/zip' || mime === 'application/x-zip-compressed') {
    return 'zip';
  }
  if (TEXT_EXTS.has(ext) || mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml') {
    return 'text';
  }

  // Heuristic: if unknown extension is mostly UTF-8 printable text, show as text
  if (bytes && bytes.length > 0) {
    const sampleLen = Math.min(bytes.length, 1024);
    let printable = 0;
    for (let i = 0; i < sampleLen; i++) {
      const b = bytes[i];
      if ((b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13 || b >= 128) {
        printable++;
      }
    }
    if (printable / sampleLen > 0.92) {
      return 'text';
    }
  }

  return 'binary';
}

function extractReadableTextFromBinary(bytes: Uint8Array): string {
  // Scan ASCII printable runs of length >= 4
  const chunks: string[] = [];
  let current = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if ((b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9) {
      current += String.fromCharCode(b);
    } else if (b === 0 && current.length > 0) {
      // Handle UTF-16LE gaps gracefully
      continue;
    } else {
      if (current.trim().length >= 6) {
        chunks.push(current.trim());
      }
      current = '';
    }
  }
  if (current.trim().length >= 6) {
    chunks.push(current.trim());
  }
  return chunks.join('\n').slice(0, 15000);
}

function buildHexPreview(bytes: Uint8Array, maxBytes = 512): string {
  const slice = bytes.slice(0, maxBytes);
  const lines: string[] = [];
  for (let i = 0; i < slice.length; i += 16) {
    const row = slice.slice(i, i + 16);
    const offset = i.toString(16).padStart(6, '0').toUpperCase();
    const hex = Array.from(row)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ')
      .padEnd(47, ' ');
    const ascii = Array.from(row)
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('');
    lines.push(`${offset}  ${hex}  |${ascii}|`);
  }
  return lines.join('\n');
}

function stripRtf(rtfText: string): string {
  return rtfText
    .replace(/\\par[d]?/g, '\n')
    .replace(/\{\*?\\[^{}]+}|[{}]|\\[A-Za-z]+-?\d*\s?/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const UniversalFilePreview: React.FC<UniversalFilePreviewProps> = ({
  storedFile,
  blobUrl,
  documentMeta,
  isLoading,
  onDownload,
  onRequestUpload
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Parsed state for rich formats
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [plainText, setPlainText] = useState<string | null>(null);
  const [zipEntries, setZipEntries] = useState<ZipEntryInfo[]>([]);
  const [copiedText, setCopiedText] = useState(false);

  const fileBytes = useMemo(() => {
    if (!storedFile?.dataUrl || storedFile.dataUrl === 'CHUNKED') return null;
    return dataUrlToUint8Array(storedFile.dataUrl);
  }, [storedFile]);

  const previewMode: PreviewMode = useMemo(() => {
    if (!storedFile) return 'binary';
    return detectPreviewMode(storedFile.fileName, storedFile.mimeType, fileBytes);
  }, [storedFile, fileBytes]);

  useEffect(() => {
    setImageZoom(1);
    setImageRotation(0);
    setParseError(null);
    setDocxHtml(null);
    setSheets([]);
    setActiveSheetIdx(0);
    setSlides([]);
    setPlainText(null);
    setZipEntries([]);

    if (!storedFile || !fileBytes) return;

    let cancelled = false;
    const arrayBuffer = fileBytes.buffer.slice(
      fileBytes.byteOffset,
      fileBytes.byteOffset + fileBytes.byteLength
    ) as ArrayBuffer;

    const parseContent = async () => {
      if (previewMode === 'image' || previewMode === 'pdf' || previewMode === 'audio' || previewMode === 'video') {
        return;
      }

      setIsParsing(true);
      try {
        if (previewMode === 'docx') {
          try {
            const result = await mammoth.convertToHtml({ arrayBuffer });
            if (!cancelled) {
              setDocxHtml(sanitizeHtml(result.value || '<p><em>Dokumen Word kosong.</em></p>'));
            }
          } catch {
            // Fallback to ZIP XML text extraction or plain text if corrupted/mock
            try {
              const zip = await JSZip.loadAsync(arrayBuffer);
              const docXml = await zip.file('word/document.xml')?.async('string');
              if (docXml && !cancelled) {
                const xmlDoc = new DOMParser().parseFromString(docXml, 'application/xml');
                const texts = Array.from(xmlDoc.getElementsByTagName('w:t')).map((n) => n.textContent || '');
                setPlainText(texts.join(' ') || 'Dokumen Word tidak memiliki teks terbaca.');
              }
            } catch {
              const fallback = new TextDecoder('utf-8', { fatal: false }).decode(fileBytes);
              if (!cancelled) setPlainText(fallback);
            }
          }
        } else if (previewMode === 'odt') {
          const zip = await JSZip.loadAsync(arrayBuffer);
          const xml = await zip.file('content.xml')?.async('string');
          if (xml && !cancelled) {
            const xmlDoc = new DOMParser().parseFromString(xml, 'application/xml');
            const paras = Array.from(xmlDoc.getElementsByTagName('text:p'))
              .map((p) => p.textContent?.trim() || '')
              .filter(Boolean);
            setPlainText(paras.join('\n\n') || 'Dokumen ODT kosong.');
          }
        } else if (previewMode === 'doc_legacy') {
          const extracted = extractReadableTextFromBinary(fileBytes);
          if (!cancelled) {
            setPlainText(extracted || 'Format .doc biner lama tidak mengandung teks ASCII yang dapat diekstrak.');
          }
        } else if (previewMode === 'rtf') {
          const raw = new TextDecoder('utf-8', { fatal: false }).decode(fileBytes);
          if (!cancelled) setPlainText(stripRtf(raw));
        } else if (previewMode === 'spreadsheet') {
          try {
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const parsedSheets: SheetData[] = workbook.SheetNames.map((name) => {
              const sheet = workbook.Sheets[name];
              const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
                header: 1,
                defval: ''
              });
              const maxCols = rawRows.reduce((m, r) => Math.max(m, Array.isArray(r) ? r.length : 0), 0);
              const cappedCols = Math.min(Math.max(maxCols, 1), 40);
              const cappedRows = rawRows.slice(0, 300).map((r) => {
                const rowArr = Array.isArray(r) ? r : [];
                return Array.from({ length: cappedCols }, (_, cIdx) =>
                  rowArr[cIdx] !== undefined && rowArr[cIdx] !== null ? String(rowArr[cIdx]) : ''
                );
              });
              return {
                name,
                rows: cappedRows,
                totalRows: rawRows.length,
                totalCols: maxCols
              };
            });
            if (!cancelled) {
              setSheets(parsedSheets);
              setActiveSheetIdx(0);
            }
          } catch {
            const fallback = new TextDecoder('utf-8', { fatal: false }).decode(fileBytes);
            if (!cancelled) setPlainText(fallback);
          }
        } else if (previewMode === 'pptx') {
          const zip = await JSZip.loadAsync(arrayBuffer);
          const slideFiles = Object.keys(zip.files)
            .filter((p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p))
            .sort((a, b) => {
              const na = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
              const nb = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
              return na - nb;
            });

          const parsedSlides: SlideData[] = [];
          for (let i = 0; i < slideFiles.length; i++) {
            const xml = await zip.file(slideFiles[i])?.async('string');
            if (!xml) continue;
            const xmlDoc = new DOMParser().parseFromString(xml, 'application/xml');
            const pNodes = Array.from(xmlDoc.getElementsByTagName('a:p'));
            const paragraphs = pNodes
              .map((p) =>
                Array.from(p.getElementsByTagName('a:t'))
                  .map((t) => t.textContent || '')
                  .join('')
                  .trim()
              )
              .filter(Boolean);
            parsedSlides.push({ slideNumber: i + 1, paragraphs });
          }
          if (!cancelled) setSlides(parsedSlides);
        } else if (previewMode === 'odp') {
          const zip = await JSZip.loadAsync(arrayBuffer);
          const xml = await zip.file('content.xml')?.async('string');
          if (xml && !cancelled) {
            const xmlDoc = new DOMParser().parseFromString(xml, 'application/xml');
            const pages = Array.from(xmlDoc.getElementsByTagName('draw:page'));
            const parsedSlides: SlideData[] = pages.map((page, idx) => ({
              slideNumber: idx + 1,
              paragraphs: Array.from(page.getElementsByTagName('text:p'))
                .map((p) => p.textContent?.trim() || '')
                .filter(Boolean)
            }));
            setSlides(parsedSlides);
          }
        } else if (previewMode === 'zip') {
          const zip = await JSZip.loadAsync(arrayBuffer);
          const entries: ZipEntryInfo[] = [];
          zip.forEach((relPath, entry) => {
            const internalData = entry as JSZip.JSZipObject & { _data?: { uncompressedSize?: number } };
            entries.push({
              name: relPath,
              dir: entry.dir,
              size: internalData._data?.uncompressedSize || 0
            });
          });
          entries.sort((a, b) => a.name.localeCompare(b.name));
          if (!cancelled) setZipEntries(entries);
        } else if (previewMode === 'text') {
          let decoded = new TextDecoder('utf-8', { fatal: false }).decode(fileBytes);
          const ext = (storedFile.fileName.split('.').pop() || '').toLowerCase();
          if (ext === 'json') {
            try {
              decoded = JSON.stringify(JSON.parse(decoded), null, 2);
            } catch {
              // keep raw
            }
          }
          if (!cancelled) setPlainText(decoded);
        } else {
          // Universal binary fallback: extract printable strings if any, else hex view
          const readable = extractReadableTextFromBinary(fileBytes);
          if (!cancelled) {
            setPlainText(
              readable.length >= 20
                ? readable
                : buildHexPreview(fileBytes, 512)
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setParseError(err instanceof Error ? err.message : 'Gagal memproses pratinjau file.');
        }
      } finally {
        if (!cancelled) setIsParsing(false);
      }
    };

    parseContent();
    return () => {
      cancelled = true;
    };
  }, [storedFile, fileBytes, previewMode]);

  const handleCopyText = (content: string) => {
    navigator.clipboard?.writeText(content).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }).catch(() => {});
  };

  const renderFormatBadge = () => {
    const ext = (storedFile?.fileName.split('.').pop() || documentMeta.fileType || 'FILE').toUpperCase();
    switch (previewMode) {
      case 'image':
        return { icon: <ImageIcon className="w-4 h-4 text-emerald-700" />, label: `Gambar (${ext})`, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'pdf':
        return { icon: <FileText className="w-4 h-4 text-rose-700" />, label: 'Dokumen PDF', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'docx':
      case 'doc_legacy':
      case 'odt':
      case 'rtf':
        return { icon: <FileText className="w-4 h-4 text-blue-700" />, label: `Dokumen Word (${ext})`, color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'spreadsheet':
        return { icon: <FileSpreadsheet className="w-4 h-4 text-emerald-700" />, label: `Spreadsheet / Excel (${ext})`, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'pptx':
      case 'odp':
        return { icon: <Presentation className="w-4 h-4 text-amber-700" />, label: `Presentasi (${ext})`, color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'audio':
        return { icon: <Music className="w-4 h-4 text-purple-700" />, label: `Audio (${ext})`, color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'video':
        return { icon: <Film className="w-4 h-4 text-indigo-700" />, label: `Video (${ext})`, color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'zip':
        return { icon: <FileArchive className="w-4 h-4 text-amber-700" />, label: `Arsip ZIP`, color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'text':
        return { icon: <FileCode className="w-4 h-4 text-slate-700" />, label: `Teks / Dokumen (${ext})`, color: 'bg-slate-200 text-slate-800 border-slate-300' };
      default:
        return { icon: <FileIcon className="w-4 h-4 text-slate-700" />, label: `Berkas ${ext}`, color: 'bg-slate-200 text-slate-800 border-slate-300' };
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 rounded-xl border border-indigo-200 bg-indigo-50/40 flex items-center justify-center gap-3 text-xs text-indigo-800">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
        <span className="font-medium">Memuat berkas dan menyiapkan pratinjau dari Cloud...</span>
      </div>
    );
  }

  if (!storedFile) {
    return (
      <div className="p-5 rounded-xl border border-amber-200 bg-amber-50/60 space-y-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-900 text-xs">
              Belum Ada Berkas Fisik Terunggah di Cloud
            </div>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Arsip <strong>{documentMeta.originalFileName}</strong> ini baru berisi metadata ringkasan (belum ada file fisik yang diunggah). Silakan unggah file asli (JPG/PNG, PDF, Word, Excel, atau format lainnya) melalui menu Edit agar dapat dipratinjau dan diunduh langsung.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {onRequestUpload && (
            <button
              type="button"
              onClick={onRequestUpload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Unggah File Sekarang</span>
            </button>
          )}
          {documentMeta.externalFileUrl && (
            <a
              href={documentMeta.externalFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-300 rounded-lg"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Tautan Lama</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  const badge = renderFormatBadge();
  const activeSheet = sheets[activeSheetIdx];
  const containerHeightClass = isExpanded ? 'h-[72vh]' : 'h-[460px]';

  return (
    <div
      className={
        isExpanded
          ? 'fixed inset-3 sm:inset-6 z-[60] bg-white rounded-2xl border border-slate-300 shadow-2xl flex flex-col overflow-hidden'
          : 'rounded-xl border border-emerald-200 bg-emerald-50/35 overflow-hidden'
      }
    >
      {/* Preview Toolbar Header */}
      <div className="px-4 py-3 border-b border-emerald-200/80 bg-white/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            {badge.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 text-xs truncate max-w-[260px] sm:max-w-[360px]">
                {storedFile.fileName}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge.color}`}>
                {badge.label}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {formatBytes(storedFile.fileSize)} · {storedFile.mimeType || 'application/octet-stream'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {previewMode === 'image' && (
            <>
              <button
                type="button"
                onClick={() => setImageZoom((z) => Math.max(0.4, +(z - 0.25).toFixed(2)))}
                className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                title="Perkecil Gambar"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-semibold text-slate-600 px-1">
                {Math.round(imageZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setImageZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                title="Perbesar Gambar"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setImageRotation((r) => (r + 90) % 360)}
                className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                title="Putar 90 Derajat"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {blobUrl && (
            <a
              href={blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg"
              title="Buka file di tab browser baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tab Baru</span>
            </a>
          )}

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            title={isExpanded ? 'Perkecil Tampilan Pratinjau' : 'Perbesar Pratinjau Layar Penuh'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Preview Body */}
      <div className={isExpanded ? 'flex-1 overflow-auto bg-slate-100 p-4' : 'p-3 bg-slate-100/70'}>
        {isParsing ? (
          <div className="h-64 flex items-center justify-center gap-2 text-xs text-slate-600 bg-white rounded-xl border border-slate-200">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Menguraikan isi dokumen untuk pratinjau...</span>
          </div>
        ) : parseError ? (
          <div className="p-5 bg-white rounded-xl border border-rose-200 text-xs text-rose-700 space-y-2">
            <div className="font-bold">Tidak dapat mem-parsing pratinjau otomatis:</div>
            <div className="font-mono text-[11px]">{parseError}</div>
            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Berkas Asli</span>
              </button>
            )}
          </div>
        ) : previewMode === 'image' ? (
          <div
            className={`${containerHeightClass} overflow-auto bg-slate-900/90 rounded-xl border border-slate-300 flex items-center justify-center p-4`}
          >
            <img
              src={blobUrl || storedFile.dataUrl}
              alt={storedFile.fileName}
              style={{
                transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                transformOrigin: 'center center'
              }}
              className="max-w-full max-h-full object-contain transition-transform duration-150 rounded shadow-lg bg-white/5"
            />
          </div>
        ) : previewMode === 'pdf' ? (
          <div className={`${containerHeightClass} rounded-xl overflow-hidden border border-slate-300 bg-white`}>
            <iframe
              src={blobUrl || storedFile.dataUrl}
              title={storedFile.fileName}
              className="w-full h-full"
            />
          </div>
        ) : previewMode === 'docx' && docxHtml ? (
          <div
            className={`${containerHeightClass} overflow-y-auto rounded-xl border border-slate-300 bg-white p-6 sm:p-8 shadow-inner`}
          >
            <div
              className="max-w-3xl mx-auto text-slate-800 text-xs sm:text-sm leading-relaxed [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:mb-3 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_p]:mb-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2.5 [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_td]:border [&_td]:border-slate-300 [&_td]:px-2.5 [&_td]:py-1.5 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:font-bold [&_img]:max-w-full [&_img]:h-auto [&_img]:my-2"
              dangerouslySetInnerHTML={{ __html: docxHtml }}
            />
          </div>
        ) : previewMode === 'spreadsheet' && sheets.length > 0 ? (
          <div className={`${containerHeightClass} flex flex-col rounded-xl border border-slate-300 bg-white overflow-hidden`}>
            {/* Sheet tabs */}
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1.5">
                {sheets.map((s, idx) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => setActiveSheetIdx(idx)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors shrink-0 cursor-pointer ${
                      idx === activeSheetIdx
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              {activeSheet && (
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  {activeSheet.totalRows} baris × {activeSheet.totalCols} kolom
                </span>
              )}
            </div>

            {/* Table Grid */}
            <div className="flex-1 overflow-auto">
              {activeSheet && activeSheet.rows.length > 0 ? (
                <table className="min-w-full border-collapse text-[11px]">
                  <thead className="sticky top-0 z-10 bg-slate-100">
                    <tr>
                      <th className="border border-slate-300 bg-slate-200/80 px-2 py-1 text-center font-mono text-slate-600 w-10">
                        #
                      </th>
                      {activeSheet.rows[0].map((_, cIdx) => (
                        <th
                          key={cIdx}
                          className="border border-slate-300 px-2.5 py-1 text-center font-mono font-bold text-slate-700 min-w-[90px]"
                        >
                          {getColumnLabel(cIdx)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeSheet.rows.map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx === 0 ? 'bg-emerald-50/40 font-semibold' : 'hover:bg-slate-50'}>
                        <td className="border border-slate-200 bg-slate-50 px-2 py-1 text-center font-mono text-slate-400">
                          {rIdx + 1}
                        </td>
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="border border-slate-200 px-2.5 py-1 text-slate-800 whitespace-pre-wrap break-words max-w-[260px]"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  Sheet ini tidak memiliki data.
                </div>
              )}
            </div>
          </div>
        ) : (previewMode === 'pptx' || previewMode === 'odp') && slides.length > 0 ? (
          <div className={`${containerHeightClass} overflow-y-auto space-y-3 rounded-xl border border-slate-300 bg-slate-100 p-4`}>
            {slides.map((slide) => (
              <div
                key={slide.slideNumber}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2"
              >
                <div className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  Slide {slide.slideNumber}
                </div>
                {slide.paragraphs.length > 0 ? (
                  <div className="space-y-1.5 text-xs text-slate-800 leading-relaxed">
                    {slide.paragraphs.map((p, idx) => (
                      <p key={idx} className={idx === 0 ? 'font-bold text-sm text-slate-900' : ''}>
                        {p}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    (Slide hanya berisi gambar atau elemen grafis)
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : previewMode === 'audio' ? (
          <div className="p-8 rounded-xl border border-slate-300 bg-white flex flex-col items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Music className="w-7 h-7" />
            </div>
            <div className="text-xs font-bold text-slate-900">{storedFile.fileName}</div>
            <audio controls src={blobUrl || storedFile.dataUrl} className="w-full max-w-md" />
          </div>
        ) : previewMode === 'video' ? (
          <div className="rounded-xl border border-slate-300 bg-black overflow-hidden flex items-center justify-center">
            <video
              controls
              src={blobUrl || storedFile.dataUrl}
              className="w-full max-h-[460px]"
            />
          </div>
        ) : previewMode === 'zip' && zipEntries.length > 0 ? (
          <div className={`${containerHeightClass} overflow-y-auto rounded-xl border border-slate-300 bg-white`}>
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800">
              Isi Arsip ZIP ({zipEntries.length} item)
            </div>
            <div className="divide-y divide-slate-100">
              {zipEntries.map((entry, idx) => (
                <div key={idx} className="px-4 py-2 flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-slate-800 truncate">{entry.name}</span>
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">
                    {entry.dir ? 'Folder' : formatBytes(entry.size)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`${containerHeightClass} flex flex-col rounded-xl border border-slate-300 bg-white overflow-hidden`}>
            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-700">
                {previewMode === 'doc_legacy'
                  ? 'Pratinjau Teks Terbaca dari Dokumen (.doc)'
                  : previewMode === 'binary'
                  ? 'Inspeksi Isi Berkas (Teks / Heksadesimal)'
                  : 'Pratinjau Isi Dokumen Teks'}
              </span>
              {plainText && (
                <button
                  type="button"
                  onClick={() => handleCopyText(plainText)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded cursor-pointer"
                >
                  {copiedText ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedText ? 'Tersalin' : 'Salin Teks'}</span>
                </button>
              )}
            </div>
            <pre className="flex-1 overflow-auto p-4 text-[11px] font-mono text-slate-800 whitespace-pre-wrap break-words leading-relaxed bg-white">
              {plainText || 'Tidak ada konten teks yang dapat ditampilkan. Silakan klik tombol Unduh untuk membuka berkas di perangkat Anda.'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
