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
    if (u.startsWith('/uploads/') || u.startsWith('/uploads\\') || u.startsWith('/images/') || u.startsWith('/images\\') || u.startsWith('/api/')) {
      return origin ? `${origin}${encodeURI(u)}` : encodeURI(u);
    }
    return encodeURI(u);
  }
  if (u.startsWith('uploads/') || u.startsWith('uploads\\') || u.startsWith('images/') || u.startsWith('images\\')) {
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
  if (s.startsWith('/uploads/') || s.startsWith('/uploads\\') || s.startsWith('/images/') || s.startsWith('/images\\')) return true;
  if (s.startsWith('uploads/') || s.startsWith('uploads\\') || s.startsWith('images/') || s.startsWith('images\\')) return true;
  return false;
};

const localPhotoFor = ({ alt, category }) => {
  const a = norm(alt);
  const c = norm(category);
  const s = `${a} ${c}`.trim();

  const has = (...words) => words.every(w => s.includes(w));
  const any = (...words) => words.some(w => s.includes(w));

  if (has('laptop', 'stand')) return '/Living/Laptop stand.png';
  if (has('bottle') && any('stand', 'rack', 'holder', 'organizer')) return '/Kitchen/Bottle rack.png';
  if (has('kitchen', 'tissue') || (s.includes('tissue') && s.includes('kitchen'))) return '/Kitchen/Kitchen tissue holder.png';
  if (has('bathroom', 'tissue') || (s.includes('tissue') && any('bath', 'bathroom', 'toilet', 'washroom'))) return '/Bathroom/Tissue Holder.png';
  if (s.includes('toothbrush')) return '/Bathroom/Toothbrush holder.png';
  if (has('corner', 'soap') || (s.includes('soap') && s.includes('corner'))) return '/Bathroom/Corner soap holder.png';
  if (has('spice', 'rack') || (s.includes('spice') && any('rack', 'organizer', 'holder'))) return '/Kitchen/Spice rack.png';
  if (s.includes('tray')) return '/Kitchen/Tray.png';
  if (has('bathroom', 'shelf') || (s.includes('bathroom') && s.includes('shelf'))) return '/Bathroom/bathroom shelf.png';
  if (has('book', 'shelf') || (s.includes('book') && any('end', 'ends', 'bookend', 'bookends'))) return '/Living/Book Shelf.png';
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
  if (s.includes('towel') && (s.includes('hook') || s.includes('hanger') || s.includes('rack'))) return '/Bathroom/towel hook.png';
  if (s.includes('tissue') && s.includes('kitchen')) return '/Kitchen/Kitchen tissue holder.png';
  if (s.includes('tissue')) return '/Bathroom/Tissue Holder.png';
  if (s.includes('bottle')) return '/Kitchen/Bottle rack.png';
  if (s.includes('spice')) return '/Kitchen/Spice rack.png';
  if (s.includes('tray')) return '/Kitchen/Tray.png';
  if (s.includes('coaster')) return '/Kitchen/Coaster.png';
  if (s.includes('book') && (s.includes('shelf') || s.includes('rack'))) return '/Living/Book Shelf.png';
  if (s.includes('key') && (s.includes('rack') || s.includes('holder') || s.includes('stand'))) return '/Living/Key rack.png';
  if (s.includes('coat') && (s.includes('rack') || s.includes('stand'))) return '/Living/Coat rack.png';
  if (s.includes('laptop') && (s.includes('stand') || s.includes('holder'))) return '/Living/Laptop stand.png';
  if (s.includes('side') && (s.includes('table') || s.includes('stand'))) return '/Living/Side table.png';
  if (s.includes('bathroom') || s.includes('shelf')) return '/Bathroom/bathroom shelf.png';
  if (s.includes('kitchen')) return '/Kitchen/Spice rack.png';
  if (s.includes('living')) return '/Living/Book Shelf.png';

  return '';
};

const ProductImage = ({ src, alt, category, className, fallbackText, fallbackSrc, showFallbackBrand = true, apiOnly = false }) => {
  const [brokenSrc, setBrokenSrc] = useState('');
  const origin = useMemo(() => getOrigin(api?.defaults?.baseURL || import.meta.env.VITE_API_URL || ''), []);
  
  const local = useMemo(() => {
    const photo = localPhotoFor({ alt, category });
    if (photo) return photo;
    const mapped = localFallbackFor({ alt, category });
    if (mapped) return mapped;
    return '';
  }, [alt, category]);

  const desiredSrc = useMemo(() => {
    if (fallbackSrc) return fallbackSrc;
    // Prioritize admin-uploaded src if it exists
    if (src) return src;
    // If apiOnly is true and no src, we still try local fallback unless it's strictly for server images
    return local;
  }, [fallbackSrc, src, local]);

  const resolved = useMemo(() => toAbsolute(origin, desiredSrc), [origin, desiredSrc]);
  const isBroken = Boolean(resolved) && brokenSrc === resolved;

  // Final URL logic: if broken or missing, try local. If that's also broken, show grey placeholder.
  const finalResolved = useMemo(() => {
    if ((!resolved || isBroken) && local && resolved !== toAbsolute(origin, local)) {
        return toAbsolute(origin, local);
    }
    return resolved;
  }, [isBroken, local, origin, resolved]);

  const finalBroken = Boolean(finalResolved) && brokenSrc === finalResolved;

  // Show grey placeholder if no image or all attempts failed
  if (!finalResolved || finalBroken) {
    return (
      <div
        className={className}
        style={{
          background: '#1f2937', // Neutral grey (Tailwind gray-800)
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#4b5563' // gray-600
        }}
      >
        <div style={{ textAlign: 'center', padding: '0 12px' }}>
          {showFallbackBrand ? (
            <div style={{ fontWeight: 800, letterSpacing: '.08em', fontSize: '10px', opacity: 0.5 }}>VORNLIVING</div>
          ) : null}
          {fallbackText ? (
            <div style={{ marginTop: 4, fontSize: 10, opacity: 0.4 }}>{fallbackText}</div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <img
      key={finalResolved}
      src={finalResolved}
      alt={alt || ''}
      className={`${className || ''} rf-fade-in`}
      style={{ backgroundColor: 'rgba(31, 41, 55, 0.1)' }}
      loading="lazy"
      decoding="async"
      onError={() => setBrokenSrc(finalResolved)}
    />
  );
};

export default ProductImage;
