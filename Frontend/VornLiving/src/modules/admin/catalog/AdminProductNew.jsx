import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { adminCreateProduct, adminUpdateProduct, adminGetProduct, getCategories, adminAddProductImages, adminAddProductVideos, adminAddProductHighlights, adminAddProductSpecifications, adminDeleteImage } from '../../../services/api';
import SelectDrop from '../../../components/SelectDrop';
import { Trash2 } from 'lucide-react';

const AdminProductNew = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('General');
  const [form, setForm] = useState({
    ProductName: '',
    ProductSlug: '',
    ShortDescription: '',
    FullDescription: '',
    CategoryID: '',
    ProductType: 'Simple',
    RegularPrice: '',
    SalePrice: '',
    SaleStartDate: '',
    SaleEndDate: '',
    CostPrice: '',
    CurrencySetting: 'INR',
    TaxClassID: '',
    IsTaxInclusive: false,
    SKU: '',
    Barcode: '',
    StockQuantity: '',
    LowStockThreshold: '',
    AllowBackorders: false,
    StockStatus: 'InStock',
    WeightKg: '',
    LengthCm: '',
    WidthCm: '',
    HeightCm: '',
    ShippingClassID: '',
    CountryOfOrigin: '',
    IsFreeShipping: false,
    IsReturnable: true,
    ReturnWindowDays: '',
    WarrantyPeriod: '',
    IsPreOrder: false,
    ExpectedDeliveryDate: '',
    SEOTitle: '',
    MetaDescription: '',
    CanonicalURL: '',
    FocusKeyword: '',
    Status: 'Published',
    Visibility: 'Public',
    PublishDate: new Date().toISOString().slice(0,16),
    IsFeatured: false,
    IsNewArrival: false,
    EnableReviews: true,
    VerifiedPurchaseOnly: true,
    ReviewModeration: 'Manual',
    highlights: [],
    specifications: [],
    images: [],
    videos: []
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState([]);
  const [imageUploads, setImageUploads] = useState([]);
  const [videoUploads, setVideoUploads] = useState([]);
  const [mainImageUpload, setMainImageUpload] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [confirmImageDelete, setConfirmImageDelete] = useState(null);

  const { id: editId } = useParams();
  const isEdit = !!editId;

  const origin = React.useMemo(() => {
    try {
      const base = api?.defaults?.baseURL || import.meta.env.VITE_API_URL || '';
      if (base) {
        const u = new URL(base);
        return `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ''}`;
      }
    } catch (e) { void e; }
    return '';
  }, []);
  const toAbsolute = (url) => {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    return origin ? `${origin}${url}` : url;
  };
  const toDateTimeLocal = (val) => {
    if (!val) return '';
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
  };
  const toDateLocal = (val) => {
    if (!val) return '';
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  };

  React.useEffect(() => {
    const loadMeta = async () => {
      try {
        const cats = await getCategories();
        setCategories(cats || []);
        if (editId) {
          const p = await adminGetProduct(editId);
          if (p) {
            const meta = Array.isArray(p.imagesMeta) ? p.imagesMeta : [];
            setExistingImages(
              meta
                .slice()
                .sort((a, b) => (Number(a.DisplayOrder || 0) - Number(b.DisplayOrder || 0)))
            );
            setForm(prev => ({
              ...prev,
              ProductName: p.ProductName || '',
              ProductSlug: p.ProductSlug || '',
              ShortDescription: p.ShortDescription || '',
              FullDescription: p.FullDescription || '',
              CategoryID: p.CategoryID ?? '',
              ProductType: p.ProductType || 'Simple',
              RegularPrice: p.RegularPrice ?? '',
              SalePrice: p.SalePrice ?? '',
              SaleStartDate: toDateTimeLocal(p.SaleStartDate),
              SaleEndDate: toDateTimeLocal(p.SaleEndDate),
              CostPrice: p.CostPrice ?? '',
              CurrencySetting: p.CurrencySetting || 'INR',
              TaxClassID: p.TaxClassID ?? '',
              IsTaxInclusive: !!p.IsTaxInclusive,
              SKU: p.SKU || '',
              Barcode: p.Barcode || '',
              StockQuantity: p.StockQuantity ?? '',
              LowStockThreshold: p.LowStockThreshold ?? '',
              AllowBackorders: !!p.AllowBackorders,
              StockStatus: p.StockStatus || 'InStock',
              WeightKg: p.WeightKg ?? '',
              LengthCm: p.LengthCm ?? '',
              WidthCm: p.WidthCm ?? '',
              HeightCm: p.HeightCm ?? '',
              ShippingClassID: p.ShippingClassID ?? '',
              CountryOfOrigin: p.CountryOfOrigin || '',
              IsFreeShipping: !!p.IsFreeShipping,
              IsReturnable: !!p.IsReturnable,
              ReturnWindowDays: p.ReturnWindowDays ?? '',
              WarrantyPeriod: p.WarrantyPeriod || '',
              IsPreOrder: !!p.IsPreOrder,
              ExpectedDeliveryDate: toDateLocal(p.ExpectedDeliveryDate),
              SEOTitle: p.SEOTitle || '',
              MetaDescription: p.MetaDescription || '',
              CanonicalURL: p.CanonicalURL || '',
              FocusKeyword: p.FocusKeyword || '',
              Status: p.Status || 'Published',
              Visibility: p.Visibility || 'Public',
              PublishDate: p.PublishDate ? toDateTimeLocal(p.PublishDate) : prev.PublishDate,
              highlights: Array.isArray(p.highlights) ? p.highlights : [],
              specifications: Array.isArray(p.specifications) ? p.specifications : [],
              images: [],
              videos: Array.isArray(p.videos) ? p.videos : []
            }));
            setImageUploads([]);
            setVideoUploads([]);
            setMainImageUpload(null);
          }
        } else {
          setExistingImages([]);
          setImageUploads([]);
          setVideoUploads([]);
          setMainImageUpload(null);
        }
      } catch (e) {
        console.error('Failed to load meta', e);
      }
    };
    loadMeta();
  }, [editId]);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const steps = ['General','Pricing','Inventory','Shipping','Policies','SEO','Media','Highlights','Specifications','Advanced','Publish'];
  const currentIndex = steps.indexOf(tab);

  const addHighlight = () => update('highlights', [...form.highlights, '']);
  const setHighlight = (idx, val) => {
    const arr = [...form.highlights];
    arr[idx] = val;
    update('highlights', arr);
  };
  const removeHighlight = (idx) => {
    const arr = form.highlights.filter((_, i) => i !== idx);
    update('highlights', arr);
  };
  const addSpec = () => update('specifications', [...form.specifications, { SpecKey: '', SpecValue: '' }]);
  const setSpec = (idx, key, val) => {
    const arr = [...form.specifications];
    arr[idx] = { ...arr[idx], [key]: val };
    update('specifications', arr);
  };
  const removeSpec = (idx) => update('specifications', form.specifications.filter((_, i) => i !== idx));

  const submit = async () => {
    setLoading(true);
    setMessage('');
    try {
      const required = [
        ['ProductName', 'Name'],
        ['ProductSlug', 'Slug'],
        ['CategoryID', 'Category'],
        ['ProductType', 'Product Type'],
        ['RegularPrice', 'Regular Price'],
        ['CurrencySetting', 'Currency']
      ];
      for (const [k, label] of required) {
        if (!form[k] || String(form[k]).trim() === '') {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'error', message: `${label} is required` } }));
          setLoading(false);
          return;
        }
      }
      const payload = {
        ProductName: form.ProductName,
        ProductSlug: form.ProductSlug,
        ShortDescription: form.ShortDescription,
        FullDescription: form.FullDescription,
        ProductType: form.ProductType,
        CategoryID: form.CategoryID,
        RegularPrice: form.RegularPrice,
        SalePrice: form.SalePrice,
        SaleStartDate: form.SaleStartDate || null,
        SaleEndDate: form.SaleEndDate || null,
        CurrencySetting: form.CurrencySetting,
        TaxClassID: form.TaxClassID || null,
        IsTaxInclusive: form.IsTaxInclusive,
        CostPrice: form.CostPrice,
        SKU: form.SKU,
        Barcode: form.Barcode,
        StockQuantity: form.StockQuantity,
        LowStockThreshold: form.LowStockThreshold,
        AllowBackorders: form.AllowBackorders,
        StockStatus: form.StockStatus,
        WeightKg: form.WeightKg || 0,
        LengthCm: form.LengthCm || 0,
        WidthCm: form.WidthCm || 0,
        HeightCm: form.HeightCm || 0,
        ShippingClassID: form.ShippingClassID || null,
        CountryOfOrigin: form.CountryOfOrigin || null,
        IsFreeShipping: form.IsFreeShipping,
        IsReturnable: form.IsReturnable,
        ReturnWindowDays: form.ReturnWindowDays || 0,
        WarrantyPeriod: form.WarrantyPeriod || null,
        IsPreOrder: form.IsPreOrder,
        ExpectedDeliveryDate: form.ExpectedDeliveryDate || null,
        SEOTitle: form.SEOTitle || null,
        MetaDescription: form.MetaDescription || null,
        CanonicalURL: form.CanonicalURL || null,
        FocusKeyword: form.FocusKeyword || null,
        Status: form.Status,
        Visibility: form.Visibility,
        PublishDate: form.PublishDate || null,
        IsFeatured: form.IsFeatured,
        IsNewArrival: form.IsNewArrival,
        EnableReviews: form.EnableReviews,
        VerifiedPurchaseOnly: form.VerifiedPurchaseOnly,
        ReviewModeration: form.ReviewModeration
      };
      const p = isEdit ? await adminUpdateProduct(editId, payload) : await adminCreateProduct(payload);
      // Upload order: Main image -> gallery uploads -> gallery URLs -> videos
      let orderCursor = 1;
      const targetId = isEdit ? editId : p.ProductID;
      if (mainImageUpload) {
        const { adminUploadProductImages } = await import('../../../services/api');
        await adminUploadProductImages(targetId, [mainImageUpload], orderCursor);
        orderCursor += 1;
      }
      if (Array.isArray(imageUploads) && imageUploads.length) {
        const { adminUploadProductImages } = await import('../../../services/api');
        await adminUploadProductImages(targetId, imageUploads, orderCursor);
        orderCursor += imageUploads.length;
      }
      if (Array.isArray(form.images) && form.images.length) {
        await adminAddProductImages(targetId, form.images, orderCursor);
        orderCursor += form.images.length;
      }
      if (Array.isArray(form.videos) && form.videos.length) {
        await adminAddProductVideos(targetId, form.videos);
      }
      if (Array.isArray(videoUploads) && videoUploads.length) {
        const { adminUploadProductVideos } = await import('../../../services/api');
        await adminUploadProductVideos(targetId, videoUploads);
      }
      if (Array.isArray(form.highlights) && form.highlights.length) {
        await adminAddProductHighlights(targetId, form.highlights.filter(Boolean), isEdit);
      } else if (isEdit) {
        await adminAddProductHighlights(targetId, [], true);
      }
      if (Array.isArray(form.specifications) && form.specifications.length) {
        await adminAddProductSpecifications(targetId, form.specifications.filter(s => s.SpecKey && s.SpecValue), isEdit);
      } else if (isEdit) {
        await adminAddProductSpecifications(targetId, [], true);
      }
      navigate('/admin/catalog/products');
    } catch (e) {
      setMessage(e.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{isEdit ? 'Update Product' : 'New Product'}</h1>
      {message && <div className="text-primary">{message}</div>}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <aside className="md:col-span-1">
          <div className="bg-white border border-border rounded-2xl p-2">
            {steps.map(name => (
              <button
                key={name}
                className={`w-full text-left px-3 py-2 rounded-xl ${tab===name ? 'bg-primary text-secondary' : 'hover:bg-primary/10'}`}
                onClick={() => setTab(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </aside>
        <section className="md:col-span-3">
          <div className="bg-section-gradient border border-border rounded-2xl p-6">
            {tab === 'General' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.ProductName} onChange={e => update('ProductName', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slug</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.ProductSlug} onChange={e => update('ProductSlug', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <SelectDrop
                    value={form.CategoryID}
                    onChange={(val) => update('CategoryID', val)}
                    options={(categories || []).map(c => ({ value: c.CategoryID, label: c.CategoryName }))}
                    placeholder="Select"
                  />
                </div>
                {/* <div>
                  <label className="block text-sm font-medium mb-1">Material</label>
                  <select
                    className="w-full border border-border rounded-xl px-3 py-2 bg-white"
                    value={getSpecValue('Material')}
                    onChange={(e) => setSpecValue('Material', e.target.value)}
                  >
                    <option value="">All / Not set</option>
                    <option value="Wood">Wood</option>
                    <option value="Glass">Glass</option>
                    <option value="Metal">Metal</option>
                  </select>
                  <div className="text-xs text-secondary/60 mt-1">Used by the customer Shop filter.</div>
                </div> */}
                <div>
                  <label className="block text-sm font-medium mb-1">Product Type</label>
                  <SelectDrop
                    value={form.ProductType}
                    onChange={(val) => update('ProductType', val)}
                    options={[{ value: 'Simple', label: 'Simple' }, { value: 'Variable', label: 'Variable' }]}
                    placeholder="Select"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Short Description</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.ShortDescription} onChange={e => update('ShortDescription', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Full Description (HTML)</label>
                  <textarea className="w-full border border-border rounded-xl px-3 py-2 bg-white h-32" value={form.FullDescription} onChange={e => update('FullDescription', e.target.value)} />
                </div>
              </div>
            )}
            {tab === 'Pricing' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Regular Price</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.RegularPrice} onChange={e => update('RegularPrice', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sale Price</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.SalePrice} onChange={e => update('SalePrice', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sale Start</label>
                  <input type="datetime-local" className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.SaleStartDate} onChange={e => update('SaleStartDate', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sale End</label>
                  <input type="datetime-local" className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.SaleEndDate} onChange={e => update('SaleEndDate', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cost Price</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.CostPrice} onChange={e => update('CostPrice', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Currency</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.CurrencySetting} onChange={e => update('CurrencySetting', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tax Class ID</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.TaxClassID} onChange={e => update('TaxClassID', e.target.value)} placeholder="e.g., 1 for Standard" />
                </div>
                <div className="md:col-span-2">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={form.IsTaxInclusive} onChange={e => update('IsTaxInclusive', e.target.checked)} />
                    <span>Tax Inclusive</span>
                  </label>
                </div>
              </div>
            )}
            {tab === 'Inventory' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">SKU</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.SKU} onChange={e => update('SKU', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Barcode</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.Barcode} onChange={e => update('Barcode', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Quantity</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.StockQuantity} onChange={e => update('StockQuantity', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Low Stock Threshold</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.LowStockThreshold} onChange={e => update('LowStockThreshold', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Status</label>
                  <select className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.StockStatus} onChange={e => update('StockStatus', e.target.value)}>
                    <option value="InStock">In Stock</option>
                    <option value="OutOfStock">Out of Stock</option>
                    <option value="Backorder">On Backorder</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={form.AllowBackorders} onChange={e => update('AllowBackorders', e.target.checked)} />
                    <span>Allow Backorders</span>
                  </label>
                </div>
              </div>
            )}
            {tab === 'Shipping' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.WeightKg} onChange={e => update('WeightKg', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Length (cm)</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.LengthCm} onChange={e => update('LengthCm', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Width (cm)</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.WidthCm} onChange={e => update('WidthCm', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Height (cm)</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.HeightCm} onChange={e => update('HeightCm', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Shipping Class ID</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.ShippingClassID} onChange={e => update('ShippingClassID', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Country of Origin</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.CountryOfOrigin} onChange={e => update('CountryOfOrigin', e.target.value)} />
                </div>
                <div className="md:col-span-3">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={form.IsFreeShipping} onChange={e => update('IsFreeShipping', e.target.checked)} />
                    <span>Free Shipping</span>
                  </label>
                </div>
              </div>
            )}
            {tab === 'Policies' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={form.IsReturnable} onChange={e => update('IsReturnable', e.target.checked)} />
                    <span>Returnable</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Return Window (days)</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.ReturnWindowDays} onChange={e => update('ReturnWindowDays', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Warranty Period</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.WarrantyPeriod} onChange={e => update('WarrantyPeriod', e.target.value)} />
                </div>
                <div className="md:col-span-3">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={form.IsPreOrder} onChange={e => update('IsPreOrder', e.target.checked)} />
                    <span>Pre-Order</span>
                  </label>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium mb-1">Expected Delivery Date</label>
                  <input type="date" className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.ExpectedDeliveryDate} onChange={e => update('ExpectedDeliveryDate', e.target.value)} />
                </div>
              </div>
            )}
            {tab === 'SEO' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">SEO Title</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.SEOTitle} onChange={e => update('SEOTitle', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Meta Description</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.MetaDescription} onChange={e => update('MetaDescription', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Canonical URL</label>
                  <input className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.CanonicalURL} onChange={e => update('CanonicalURL', e.target.value)} />
                </div>
              </div>
            )}
            {tab === 'Media' && (
              <div className="space-y-4">
                {isEdit && existingImages.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium mb-1">Existing Images</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {existingImages.map((img) => (
                        <div key={img.ImageID || img.ImageURL} className="border border-border rounded-xl p-2 bg-white relative">
                          <img src={toAbsolute(img.ImageURL)} alt="" className="w-full h-24 object-cover rounded-md" />
                          <button
                            className="absolute right-2 top-2 p-2 rounded-xl border border-red-300 text-red-600 bg-white disabled:opacity-50"
                            onClick={() => setConfirmImageDelete({ imageId: img.ImageID, imageUrl: img.ImageURL })}
                            disabled={!img.ImageID}
                            title={!img.ImageID ? 'Cannot delete (missing ImageID)' : 'Delete'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">Main Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => setMainImageUpload(ev.target.result);
                      reader.readAsDataURL(file);
                    }}
                    className="border border-border rounded-xl px-3 py-2 bg-white w-full"
                  />
                  {mainImageUpload && (
                    <div className="border border-border rounded-xl p-2 bg-white relative">
                      <img src={mainImageUpload} alt="" className="w-full h-28 object-cover rounded-md" />
                      <button className="absolute right-2 top-2 p-2 rounded-xl border border-red-300 text-red-600 bg-white" onClick={() => setMainImageUpload(null)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">Add New Image URL</label>
                  <div className="flex gap-2">
                    <input id="imageUrlInput" className="flex-1 border border-border rounded-xl px-3 py-2 bg-white" placeholder="https://..." />
                    <button
                      className="border border-border px-3 py-2 rounded-xl"
                      onClick={() => {
                        const el = document.getElementById('imageUrlInput');
                        const url = el?.value?.trim();
                        if (url) update('images', [...form.images, url]);
                        if (el) el.value = '';
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium mb-1">Upload Images</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        files.forEach(file => {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setImageUploads(prev => [...prev, ev.target.result]);
                          };
                          reader.readAsDataURL(file);
                        });
                      }}
                      className="border border-border rounded-xl px-3 py-2 bg-white w-full"
                    />
                    {imageUploads.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {imageUploads.map((b64, idx) => (
                          <div key={idx} className="border border-border rounded-xl p-2 bg-white relative">
                            <img src={b64} alt="" className="w-full h-24 object-cover rounded-md" />
                            <button className="absolute right-2 top-2 p-2 rounded-xl border border-red-300 text-red-600 bg-white" onClick={() => {
                              setImageUploads(imageUploads.filter((_, i) => i !== idx));
                            }} title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {form.images.map((url, idx) => (
                      <div key={idx} className="border border-border rounded-xl p-2 bg-white">
                        <img src={toAbsolute(url)} alt="" className="w-full h-24 object-cover rounded-md" />
                        <div className="flex justify-between mt-2">
                          <button className="px-2 py-1 border border-border rounded-xl" onClick={() => {
                            if (idx > 0) {
                              const arr = [...form.images];
                              [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]];
                              update('images', arr);
                            }
                          }}>Up</button>
                          <button className="px-2 py-1 border border-border rounded-xl" onClick={() => {
                            if (idx < form.images.length - 1) {
                              const arr = [...form.images];
                              [arr[idx+1], arr[idx]] = [arr[idx], arr[idx+1]];
                              update('images', arr);
                            }
                          }}>Down</button>
                          <button className="px-2 py-1 border border-red-300 text-red-600 rounded-xl" onClick={() => {
                            update('images', form.images.filter((_, i) => i !== idx));
                          }}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">Add Video URL</label>
                  <div className="flex gap-2">
                    <input id="videoUrlInput" className="flex-1 border border-border rounded-xl px-3 py-2 bg-white" placeholder="https://..." />
                    <button
                      className="border border-border px-3 py-2 rounded-xl"
                      onClick={() => {
                        const el = document.getElementById('videoUrlInput');
                        const url = el?.value?.trim();
                        if (url) update('videos', [...form.videos, url]);
                        if (el) el.value = '';
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.videos.map((url, idx) => (
                      <div key={idx} className="flex items-center justify-between border border-border rounded-xl p-2 bg-white">
                        <div className="truncate max-w-[70%]">{url}</div>
                        <button className="px-2 py-1 border border-red-300 text-red-600 rounded-xl" onClick={() => {
                          update('videos', form.videos.filter((_, i) => i !== idx));
                        }}>Delete</button>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium mb-1">Upload Videos</label>
                    <input
                      type="file"
                      accept="video/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        files.forEach(file => {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setVideoUploads(prev => [...prev, ev.target.result]);
                          };
                          reader.readAsDataURL(file);
                        });
                      }}
                      className="border border-border rounded-xl px-3 py-2 bg-white w-full"
                    />
                    {videoUploads.length > 0 && (
                      <div className="space-y-2">
                        {videoUploads.map((b64, idx) => (
                          <div key={idx} className="flex items-center justify-between border border-border rounded-xl p-2 bg-white">
                            <div className="truncate max-w-[70%]">Video {idx+1}</div>
                            <button className="p-2 rounded-xl border border-red-300 text-red-600 bg-white" onClick={() => {
                              setVideoUploads(videoUploads.filter((_, i) => i !== idx));
                            }} title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {tab === 'Highlights' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-secondary">Add bullet points</div>
                  <button className="border border-border px-3 py-1 rounded-xl" onClick={addHighlight}>Add</button>
                </div>
                {form.highlights.map((h, i) => (
                  <div key={i} className="relative">
                    <input className="w-full border border-border rounded-xl px-3 py-2 bg-white pr-10" value={h} onChange={e => setHighlight(i, e.target.value)} />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl border border-red-300 text-red-600 bg-white" onClick={() => removeHighlight(i)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {tab === 'Specifications' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-secondary">Add key/value specs</div>
                  <button className="border border-border px-3 py-1 rounded-xl" onClick={addSpec}>Add</button>
                </div>
                {form.specifications.map((s, i) => (
                  <div key={i} className="relative grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                    <input className="border border-border rounded-xl px-3 py-2 bg-white" placeholder="Key" value={s.SpecKey} onChange={e => setSpec(i, 'SpecKey', e.target.value)} />
                    <input className="md:col-span-2 border border-border rounded-xl px-3 py-2 bg-white pr-10" placeholder="Value" value={s.SpecValue} onChange={e => setSpec(i, 'SpecValue', e.target.value)} />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl border border-red-300 text-red-600 bg-white" onClick={() => removeSpec(i)} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {tab === 'Advanced' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Publish Date</label>
                  <input type="datetime-local" className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.PublishDate} onChange={e => update('PublishDate', e.target.value)} />
                </div>
                <div className="md:col-span-2 flex gap-4">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={form.IsFeatured} onChange={e => update('IsFeatured', e.target.checked)} />
                    <span>Featured</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={form.IsNewArrival} onChange={e => update('IsNewArrival', e.target.checked)} />
                    <span>New Arrival</span>
                  </label>
                </div>
              </div>
            )}
            {tab === 'Publish' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.Status} onChange={e => update('Status', e.target.value)}>
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Visibility</label>
                  <select className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.Visibility} onChange={e => update('Visibility', e.target.value)}>
                    <option value="Private">Private</option>
                    <option value="Public">Public</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={form.EnableReviews} onChange={e => update('EnableReviews', e.target.checked)} />
                    <span>Enable Reviews</span>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={form.VerifiedPurchaseOnly} onChange={e => update('VerifiedPurchaseOnly', e.target.checked)} />
                    <span>Verified Purchase Only</span>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Review Moderation</label>
                  <select className="w-full border border-border rounded-xl px-3 py-2 bg-white" value={form.ReviewModeration} onChange={e => update('ReviewModeration', e.target.value)}>
                    <option value="Auto">Auto</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              {currentIndex > 0 && (
                <button className="border border-border px-4 py-2 rounded-xl" onClick={() => setTab(steps[currentIndex - 1])}>Back</button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="border border-border px-4 py-2 rounded-xl" onClick={() => navigate('/admin/catalog/products')}>Cancel</button>
              {currentIndex < steps.length - 1 ? (
                <button className="rf-btn-primary px-4 py-2" onClick={() => setTab(steps[currentIndex + 1])}>Next</button>
              ) : (
                <button className="rf-btn-primary px-4 py-2" onClick={submit} disabled={loading}>{loading ? 'Saving...' : (isEdit ? 'Update Product' : 'Create Product')}</button>
              )}
            </div>
          </div>
        </section>
      </div>
      {confirmImageDelete && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40">
          <div className="rf-card w-full max-w-md p-6 shadow-xl">
            <div className="text-lg font-bold text-secondary mb-2">Delete Image</div>
            <div className="text-sm text-gray-600">Are you sure you want to delete this image? This will remove it from the database.</div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="border border-border px-4 py-2 rounded-xl bg-white hover:bg-gray-50 transition" onClick={() => setConfirmImageDelete(null)}>
                Cancel
              </button>
              <button
                className="rf-btn-secondary px-4 py-2 transition"
                onClick={async () => {
                  const target = confirmImageDelete;
                  setConfirmImageDelete(null);
                  if (!target?.imageId) return;
                  try {
                    await adminDeleteImage(target.imageId);
                    setExistingImages(prev => prev.filter(x => x.ImageID !== target.imageId));
                    window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'success', message: 'Image deleted' } }));
                  } catch (e) {
                    window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'error', message: e.response?.data?.message || 'Failed to delete image' } }));
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProductNew;
