import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QRCodeSVG({ value, size = 200, className = '' }) {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!value) return undefined;

    QRCode.toString(value, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 4,
      width: size,
      color: { dark: '#111111', light: '#FFFFFF' },
    }).then(result => {
      if (!cancelled) setSvg(result);
    }).catch(() => {
      if (!cancelled) setSvg('');
    });

    return () => { cancelled = true; };
  }, [value, size]);

  return (
    <div
      className={className}
      role="img"
      aria-label="Código QR para consultar el estado del pedido"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
