import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminGetReview, adminDeleteReview } from '../../../services/api';

const extractPhotoUrl = (reviewBody) => {
  const body = String(reviewBody || '');
  const m = body.match(/PhotoURL:\s*(\S+)/i);
  return m ? m[1] : '';
};

const AdminReviewDetails = () => {
  const { id } = useParams();
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetReview(id);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  const removeReview = async () => {
    if (!data?.ReviewID) return;
    const ok = window.confirm('Delete this review?');
    if (!ok) return;
    setBusy(true);
    try {
      await adminDeleteReview(data.ReviewID);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'success', message: 'Review deleted' } }));
      window.location.href = '/admin/reviews';
    } catch (e) {
      void e;
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'error', message: 'Failed to delete review' } }));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="rf-card p-6 text-secondary">Loading…</div>;
  }

  if (!data) {
    return (
      <div className="rf-card p-6 text-secondary">
        <div className="font-semibold">Review not found</div>
        <Link to="/admin/reviews" className="link-underline text-primary">Back to Reviews</Link>
      </div>
    );
  }

  const photoUrl = extractPhotoUrl(data.ReviewBody);

  return (
    <div className="space-y-4 rf-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-bold text-secondary">Review #{data.ReviewID}</div>
          <div className="text-sm text-secondary/70">{data.ProductName} • {data.UserEmail || 'Guest'}</div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/reviews" className="border border-border px-4 py-2 rounded-xl bg-white hover:bg-gray-50 transition">
            Back
          </Link>
          <button className="border border-border px-4 py-2 rounded-xl bg-white hover:border-primary transition disabled:opacity-60" disabled={busy} onClick={removeReview}>
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rf-card p-5 lg:col-span-2">
          <div className="text-lg font-bold text-secondary">Content</div>
          <div className="mt-3 text-sm text-secondary/80 space-y-2">
            <div>Rating: <span className="font-semibold">{data.Rating}★</span></div>
            {data.ReviewTitle ? <div className="font-semibold text-secondary">{data.ReviewTitle}</div> : null}
            {data.ReviewBody ? <div className="whitespace-pre-wrap">{data.ReviewBody}</div> : null}
          </div>
        </div>
        <div className="rf-card p-5">
          <div className="text-lg font-bold text-secondary">Meta</div>
          <div className="mt-3 text-sm text-secondary/80 space-y-2">
            <div><span className="text-secondary/70">Verified purchase:</span> {data.IsVerifiedPurchase ? 'Yes' : 'No'}</div>
            <div><span className="text-secondary/70">Created:</span> {data.CreatedAt ? String(data.CreatedAt).slice(0, 19).replace('T', ' ') : '-'}</div>
          </div>
        </div>
      </div>

      {photoUrl ? (
        <div className="rf-card p-5">
          <div className="text-lg font-bold text-secondary">Photo</div>
          <div className="mt-3 border border-border rounded-2xl overflow-hidden bg-gray-50">
            <img src={photoUrl} alt="Review" className="w-full max-h-[520px] object-contain bg-white" />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminReviewDetails;

