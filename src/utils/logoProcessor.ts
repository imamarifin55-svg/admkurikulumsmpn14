/**
 * Utilitas pemrosesan logo sekolah untuk menghilangkan background solid (putih/terang)
 * secara otomatis menggunakan flood-fill dari tepi gambar dan memangkas ruang kosong
 * berlebih agar logo tampil lebih besar, bersih, dan transparan.
 */

interface ProcessLogoOptions {
  maxDim?: number;
  forceCornerColor?: boolean;
  tolerance?: number;
  trimPadding?: boolean;
}

const processedLogoCache = new Map<string, string>();

const isNearWhite = (r: number, g: number, b: number): boolean => {
  const maxChannel = Math.max(r, g, b);
  const minChannel = Math.min(r, g, b);
  return r >= 218 && g >= 218 && b >= 218 && maxChannel - minChannel <= 34;
};

const colorDistance = (
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number => {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

export const getCachedProcessedLogo = (src: string): string | undefined => {
  return processedLogoCache.get(src);
};

export const processLogoTransparency = async (
  src: string,
  options: ProcessLogoOptions = {}
): Promise<string> => {
  if (!src) return src;

  const {
    maxDim = 320,
    forceCornerColor = false,
    tolerance = 44,
    trimPadding = true
  } = options;

  // Gunakan cache hanya untuk pemrosesan otomatis default
  const useCache = !forceCornerColor && trimPadding && maxDim === 320;
  if (useCache) {
    const cached = processedLogoCache.get(src);
    if (cached) return cached;
  }

  // SVG data URL bawaan preset sudah transparan; biarkan tetap vektor tajam
  if (src.startsWith('data:image/svg+xml') && !forceCornerColor) {
    if (useCache) processedLogoCache.set(src, src);
    return src;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    if (!/^data:/i.test(src)) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      try {
        const naturalW = img.naturalWidth || img.width;
        const naturalH = img.naturalHeight || img.height;
        if (!naturalW || !naturalH) {
          resolve(src);
          return;
        }

        const scale = Math.min(1, maxDim / Math.max(naturalW, naturalH));
        const w = Math.max(1, Math.round(naturalW * scale));
        const h = Math.max(1, Math.round(naturalH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        let imageData: ImageData;
        try {
          imageData = ctx.getImageData(0, 0, w, h);
        } catch {
          // CORS-tainted canvas fallback
          resolve(src);
          return;
        }

        const data = imageData.data;

        // Kumpulkan piksel tepi luar gambar untuk mendeteksi warna background
        const perimeterIndices: number[] = [];
        for (let x = 0; x < w; x++) {
          perimeterIndices.push(x); // baris atas
          if (h > 1) perimeterIndices.push((h - 1) * w + x); // baris bawah
        }
        for (let y = 1; y < h - 1; y++) {
          perimeterIndices.push(y * w); // kolom kiri
          if (w > 1) perimeterIndices.push(y * w + (w - 1)); // kolom kanan
        }

        let transparentPerimeterCount = 0;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let opaquePerimeterCount = 0;

        for (const idx of perimeterIndices) {
          const p = idx * 4;
          if (data[p + 3] < 24) {
            transparentPerimeterCount++;
          } else {
            sumR += data[p];
            sumG += data[p + 1];
            sumB += data[p + 2];
            opaquePerimeterCount++;
          }
        }

        const alreadyMostlyTransparent =
          transparentPerimeterCount >= perimeterIndices.length * 0.55;

        let didModifyAlpha = false;

        if (!alreadyMostlyTransparent && opaquePerimeterCount > 0) {
          // Sampel 4 sudut untuk akurasi warna background utama
          const cornerCoords = [
            0,
            w - 1,
            (h - 1) * w,
            (h - 1) * w + (w - 1)
          ];
          let bgR = Math.round(sumR / opaquePerimeterCount);
          let bgG = Math.round(sumG / opaquePerimeterCount);
          let bgB = Math.round(sumB / opaquePerimeterCount);

          let nearWhiteCornerCount = 0;
          let crSum = 0;
          let cgSum = 0;
          let cbSum = 0;
          let validCorners = 0;

          for (const cIdx of cornerCoords) {
            const p = cIdx * 4;
            if (data[p + 3] >= 24) {
              validCorners++;
              crSum += data[p];
              cgSum += data[p + 1];
              cbSum += data[p + 2];
              if (isNearWhite(data[p], data[p + 1], data[p + 2])) {
                nearWhiteCornerCount++;
              }
            }
          }

          if (validCorners > 0) {
            bgR = Math.round(crSum / validCorners);
            bgG = Math.round(cgSum / validCorners);
            bgB = Math.round(cbSum / validCorners);
          }

          const shouldStripBackground =
            forceCornerColor ||
            (nearWhiteCornerCount >= 2 && isNearWhite(bgR, bgG, bgB));

          if (shouldStripBackground) {
            const visited = new Uint8Array(w * h);
            const removed = new Uint8Array(w * h);
            const queue = new Int32Array(w * h);
            let head = 0;
            let tail = 0;

            const matchesBg = (idx: number): boolean => {
              const p = idx * 4;
              if (data[p + 3] < 24) return true;
              const dist = colorDistance(
                data[p],
                data[p + 1],
                data[p + 2],
                bgR,
                bgG,
                bgB
              );
              return dist <= tolerance;
            };

            for (const idx of perimeterIndices) {
              if (!visited[idx] && matchesBg(idx)) {
                visited[idx] = 1;
                queue[tail++] = idx;
              }
            }

            while (head < tail) {
              const curr = queue[head++];
              const p = curr * 4;
              data[p + 3] = 0;
              removed[curr] = 1;
              didModifyAlpha = true;

              const cx = curr % w;
              const cy = (curr - cx) / w;

              // 4-arah flood-fill agar tidak bocor menembus garis tipis emblem
              if (cx > 0) {
                const n = curr - 1;
                if (!visited[n] && matchesBg(n)) {
                  visited[n] = 1;
                  queue[tail++] = n;
                }
              }
              if (cx < w - 1) {
                const n = curr + 1;
                if (!visited[n] && matchesBg(n)) {
                  visited[n] = 1;
                  queue[tail++] = n;
                }
              }
              if (cy > 0) {
                const n = curr - w;
                if (!visited[n] && matchesBg(n)) {
                  visited[n] = 1;
                  queue[tail++] = n;
                }
              }
              if (cy < h - 1) {
                const n = curr + w;
                if (!visited[n] && matchesBg(n)) {
                  visited[n] = 1;
                  queue[tail++] = n;
                }
              }
            }

            // Anti-aliasing tepi agar tidak ada halo putih pada background gelap
            const softTolerance = tolerance * 1.65;
            const innerTolerance = tolerance * 0.6;
            for (let y = 0; y < h; y++) {
              for (let x = 0; x < w; x++) {
                const idx = y * w + x;
                if (removed[idx] || data[idx * 4 + 3] === 0) continue;

                let touchesRemoved = false;
                for (let dy = -1; dy <= 1 && !touchesRemoved; dy++) {
                  for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                      if (removed[ny * w + nx]) {
                        touchesRemoved = true;
                        break;
                      }
                    }
                  }
                }

                if (touchesRemoved) {
                  const p = idx * 4;
                  const dist = colorDistance(
                    data[p],
                    data[p + 1],
                    data[p + 2],
                    bgR,
                    bgG,
                    bgB
                  );
                  if (dist < softTolerance) {
                    const ratio = Math.max(
                      0,
                      Math.min(
                        1,
                        (dist - innerTolerance) / (softTolerance - innerTolerance)
                      )
                    );
                    data[p + 3] = Math.round(data[p + 3] * ratio);
                  }
                }
              }
            }

            ctx.putImageData(imageData, 0, 0);
          }
        }

        // Pangkas margin transparan berlebih agar logo tampil penuh & lebih besar
        let finalCanvas = canvas;
        let didTrim = false;

        if (trimPadding) {
          let minX = w;
          let minY = h;
          let maxX = -1;
          let maxY = -1;

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const alpha = data[(y * w + x) * 4 + 3];
              if (alpha > 14) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          if (maxX > minX && maxY > minY) {
            const cropW = maxX - minX + 1;
            const cropH = maxY - minY + 1;
            const hasMeaningfulMargin =
              minX > w * 0.04 ||
              minY > h * 0.04 ||
              maxX < w * 0.96 ||
              maxY < h * 0.96;

            if (hasMeaningfulMargin || didModifyAlpha) {
              const side = Math.max(cropW, cropH);
              const pad = Math.max(2, Math.round(side * 0.02));
              const outSize = side + pad * 2;
              const trimmed = document.createElement('canvas');
              trimmed.width = outSize;
              trimmed.height = outSize;
              const tCtx = trimmed.getContext('2d');
              if (tCtx) {
                const offsetX = Math.round((outSize - cropW) / 2);
                const offsetY = Math.round((outSize - cropH) / 2);
                tCtx.clearRect(0, 0, outSize, outSize);
                tCtx.drawImage(
                  canvas,
                  minX,
                  minY,
                  cropW,
                  cropH,
                  offsetX,
                  offsetY,
                  cropW,
                  cropH
                );
                finalCanvas = trimmed;
                didTrim = true;
              }
            }
          }
        }

        if (!didModifyAlpha && !didTrim) {
          if (useCache) processedLogoCache.set(src, src);
          resolve(src);
          return;
        }

        const resultUrl = finalCanvas.toDataURL('image/png');
        if (useCache) processedLogoCache.set(src, resultUrl);
        resolve(resultUrl);
      } catch {
        resolve(src);
      }
    };

    img.onerror = () => resolve(src);
    img.src = src;
  });
};
