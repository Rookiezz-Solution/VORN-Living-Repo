import React, { useMemo, useState } from 'react';
import api from '../services/api';

const getOrigin = (baseURL) => {
  try {
    if (!baseURL) return '';
    const u = new URL(baseURL);
    return `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ''}`;
  } catch (e) {
    void e;
    return '';
  }
};

const toAbsolute = (origin, url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const u = String(url);
  if (u.startsWith('/')) {
    if (u.startsWith('/uploads/') || u.startsWith('/uploads\\') || u.startsWith('/api/')) {
      return origin ? `${origin}${encodeURI(u)}` : encodeURI(u);
    }
    return encodeURI(u);
  }
  if (u.startsWith('uploads/') || u.startsWith('uploads\\')) {
    const normalized = `/${u.replace(/\\/g, '/')}`;
    return origin ? `${origin}${encodeURI(normalized)}` : encodeURI(normalized);
  }
  return encodeURI(u);
};

const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const isApiImageUrl = (v) => {
  const s = String(v || '');
  if (!s) return false;
  if (/^https?:\/\//i.test(s)) return true;
  if (s.startsWith('/uploads/') || s.startsWith('/uploads\\')) return true;
  if (s.startsWith('uploads/') || s.startsWith('uploads\\')) return true;
  return false;
};

const localPhotoFor = ({ alt, category }) => {
  const a = norm(alt);
  const c = norm(category);
  const s = `${a} ${c}`.trim();

  const has = (...words) => words.every(w => s.includes(w));
  const any = (...words) => words.some(w => s.includes(w));

  if (has('laptop', 'stand')) return '/iloveimg-converted (2)/FullSizeRender (2).jpg';
  if (has('bottle', 'organizer') || (s.includes('bottle') && any('rack', 'holder', 'organizer'))) return '/iloveimg-converted (3)/IMG_2789.jpg';
  if (has('kitchen', 'tissue') || (s.includes('tissue') && s.includes('kitchen'))) return '/iloveimg-converted (2)/FullSizeRender (14).jpg';
  if (has('bathroom', 'tissue') || (s.includes('tissue') && any('bath', 'bathroom', 'toilet', 'washroom'))) return '/Bathroom/Tissue Holder.png';
  if (s.includes('toothbrush')) return '/iloveimg-converted (3)/IMG_2823.jpg';
  if (has('corner', 'soap') || (s.includes('soap') && s.includes('corner'))) return '/iloveimg-converted (2)/FullSizeRender (10).jpg';
  if (has('spice', 'rack') || (s.includes('spice') && any('rack', 'organizer', 'holder'))) return '/iloveimg-converted (3)/IMG_2861.jpg';
  if (s.includes('tray')) return '/iloveimg-converted (2)/FullSizeRender (21).jpg';
  if (has('bathroom', 'shelf')) return '/iloveimg-converted (3)/IMG_2844.jpg';
  if (has('common', 'shelf') && s.includes('small')) return '/iloveimg-converted (2)/FullSizeRender (29).jpg';
  if (has('book', 'shelf') || (s.includes('book') && any('end', 'ends', 'bookend', 'bookends'))) return '/iloveimg-converted (3)/IMG_2804.jpg';
  if (s.includes('coaster')) return '/Kitchen/Coaster.png';
  if (s.includes('key') && any('stand', 'holder', 'rack')) return '/Living/Key rack.png';
  if (s.includes('hook')) return '/Bathroom/towel hook.png';

  return '';
};

const localFallbackFor = ({ alt, category }) => {
  const a = norm(alt);
  const c = norm(category);
  const s = `${a} ${c}`.trim();

  if (s.includes('toothbrush')) return '/Bathroom/Toothbrush holder.png';
  if (s.includes('soap')) return '/Bathroom/Corner soap holder.png';
  if (s.includes('towel') && (s.includes('hook') || s.includes('hanger'))) return '/Bathroom/towel hook.png';
  if (s.includes('tissue') && s.includes('kitchen')) return '/Kitchen/Kitchen tissue holder.png';
  if (s.includes('tissue')) return '/Bathroom/Tissue Holder.png';
  if (s.includes('bottle')) return '/Kitchen/Bottle rack.png';
  if (s.includes('spice')) return '/Kitchen/Spice rack.png';
  if (s.includes('tray')) return '/Kitchen/Tray.png';
  if (s.includes('coaster')) return '/Kitchen/Coaster.png';
  if (s.includes('book') && (s.includes('shelf') || s.includes('rack'))) return '/Living/Book Shelf.png';
  if (s.includes('key') && (s.includes('rack') || s.includes('holder'))) return '/Living/Key rack.png';
  if (s.includes('coat') && (s.includes('rack') || s.includes('stand'))) return '/Living/Coat rack.png';
  if (s.includes('laptop') && (s.includes('stand') || s.includes('holder'))) return '/Living/Laptop stand.png';
  if (s.includes('side table') || (s.includes('side') && s.includes('table'))) return '/Living/Side table.png';
  if (s.includes('bathroom')) return '/Bathroom/bathroom shelf.png';
  if (s.includes('kitchen')) return '/Kitchen/Spice rack.png';
  if (s.includes('living')) return '/Living/Book Shelf.png';

  return '';
};

const ProductImage = ({ src, alt, category, className, fallbackText, fallbackSrc, showFallbackBrand = true, apiOnly = false }) => {
  const [brokenSrc, setBrokenSrc] = useState('');
  const origin = useMemo(() => getOrigin(api?.defaults?.baseURL || import.meta.env.VITE_API_URL || ''), []);
  const desiredSrc = useMemo(() => {
    if (fallbackSrc) return fallbackSrc;
    if (apiOnly) {
      if (isApiImageUrl(src)) return src;
      if (src) return src;
      const photo = localPhotoFor({ alt, category });
      if (photo) return photo;
      const mapped = localFallbackFor({ alt, category });
      if (mapped) return mapped;
      return '';
    }
    if (src) return src;
    const photo = localPhotoFor({ alt, category });
    if (photo) return photo;
    const mapped = localFallbackFor({ alt, category });
    if (mapped) return mapped;
    return '';
  }, [alt, apiOnly, category, fallbackSrc, src]);
  const resolved = useMemo(() => toAbsolute(origin, desiredSrc), [origin, desiredSrc]);
  const broken = Boolean(resolved) && brokenSrc === resolved;

  if (!resolved || broken) {
    return (
      <div
        className={className}
        style={{
          background:
            'linear-gradient(135deg, rgba(84,90,103,0.92), rgba(17,24,39,0.92), rgba(191,164,135,0.18))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#D1D5DB'
        }}
      >
        <div style={{ textAlign: 'center', padding: '0 12px' }}>
          {showFallbackBrand ? (
            <div style={{ fontWeight: 800, letterSpacing: '.08em' }}>VORNLIVING</div>
          ) : null}
          {fallbackText ? (
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>{fallbackText}</div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <img
      key={resolved}
      src={resolved}
      alt={alt || ''}
      className={`${className || ''} rf-fade-in`}
      style={{ backgroundColor: 'rgba(209, 213, 219, 0.28)' }}
      loading="lazy"
      decoding="async"
      onError={() => setBrokenSrc(resolved)}
    />
  );
};

export default ProductImage;
