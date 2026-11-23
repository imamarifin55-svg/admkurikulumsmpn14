import React, { useEffect, useState } from 'react';
import {
  getCachedProcessedLogo,
  processLogoTransparency
} from '../utils/logoProcessor';

interface SchoolLogoImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

/**
 * Menampilkan logo sekolah tanpa background putih/kotak dan memaksimalkan ukuran emblem.
 */
export const SchoolLogoImg: React.FC<SchoolLogoImgProps> = ({
  src,
  alt,
  className = '',
  ...rest
}) => {
  const [resolvedSrc, setResolvedSrc] = useState<string>(
    () => getCachedProcessedLogo(src) || src
  );

  useEffect(() => {
    let active = true;
    const cached = getCachedProcessedLogo(src);
    if (cached) {
      setResolvedSrc(cached);
      return;
    }

    setResolvedSrc(src);
    processLogoTransparency(src).then((cleaned) => {
      if (active && cleaned) {
        setResolvedSrc(cleaned);
      }
    });

    return () => {
      active = false;
    };
  }, [src]);

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      className={`bg-transparent ${className}`.trim()}
      {...rest}
    />
  );
};
