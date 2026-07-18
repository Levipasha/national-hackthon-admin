import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, Trash2, Image as ImageIcon, Star, FolderOpen, UploadCloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';

export default function Highlights() {
  const { token } = useAuth();
  const [albums, setAlbums] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', isPinned: false, coverImageUrl: '', images: [] });
  const [isUploading, setIsUploading] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchAlbums();
  }, []);

  const fetchAlbums = async () => {
    try {
      const res = await fetch(`${API}/api/highlights`);
      if (res.ok) setAlbums(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const uploadToCloudinary = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      // Mock upload
      return new Promise(resolve => setTimeout(() => resolve(`https://picsum.photos/seed/${file.name}/600/400`), 800));
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (res.ok) return data.secure_url;
    throw new Error(data.error?.message || 'Upload failed');
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setForm(f => ({ ...f, coverImageUrl: url }));
      showNotification('Cover image uploaded!');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setIsUploading(true);
    try {
      const urls = await Promise.all(files.map(f => uploadToCloudinary(f)));
      setForm(f => ({ ...f, images: [...f.images, ...urls] }));
      showNotification(`${urls.length} images uploaded!`);
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const removeGalleryImage = (index) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  };

  const handleAdd = async () => {
    if (!form.title || !form.coverImageUrl) {
      showNotification('Title and Cover Image are required', 'error');
      return;
    }
    try {
      const res = await fetch(`${API}/api/admin/highlights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        const newAlbum = await res.json();
        setAlbums(prev => [newAlbum, ...prev]);
        setForm({ title: '', description: '', isPinned: false, coverImageUrl: '', images: [] });
        setShowForm(false);
        showNotification('Album created successfully!');
      }
    } catch (e) {
      showNotification('Failed to create album', 'error');
    }
  };

  const togglePin = async (id, currentPin) => {
    try {
      await fetch(`${API}/api/admin/highlights/${id}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isPinned: !currentPin })
      });
      setAlbums(prev => prev.map(i => i.id === id ? { ...i, isPinned: !currentPin } : i));
    } catch (e) {
      showNotification('Failed to update pin', 'error');
    }
  };

  const remove = async (id) => { 
    if (window.confirm('Remove this album?')) {
      try {
        await fetch(`${API}/api/admin/highlights/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        setAlbums(prev => prev.filter(i => i.id !== id));
        showNotification('Album removed', 'error');
      } catch (e) {
        showNotification('Failed to remove album', 'error');
      }
    }
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} style={{ color: 'var(--text-muted)' }} />
            Highlights & Albums Manager
          </div>
          <div className="section-sub">Create photo albums and highlight galleries</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
          <Plus size={13} />Create Album
        </button>
      </div>

      {notification && (
        <div style={{
          padding: '10px 16px', marginBottom: 16, borderRadius: 8,
          background: notification.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          color: notification.type === 'success' ? '#16a34a' : '#dc2626',
          border: `1px solid ${notification.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          fontSize: 12, fontWeight: 600
        }}>
          {notification.msg}
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: 'var(--text-primary)' }}>New Highlight Album</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 16 }}>
              {/* Cover Image Upload */}
              <div style={{ width: '150px' }}>
                <label className="label">Cover Image *</label>
                <div style={{ width: '100%', height: 100, borderRadius: 8, background: 'var(--bg-elevated)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  {form.coverImageUrl ? (
                    <img src={form.coverImageUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      <ImageIcon size={20} style={{ margin: '0 auto' }} />
                      <div style={{ fontSize: 10, marginTop: 4 }}>Upload</div>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleCoverUpload} style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }} />
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="input-group">
                  <label className="label">Album Title *</label>
                  <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Day 1 - Hackathon Begins" />
                </div>
                <div className="input-group">
                  <label className="label">Description</label>
                  <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description of this album…" />
                </div>
              </div>
            </div>

            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Gallery Images ({form.images.length})</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {form.images.map((imgUrl, i) => (
                  <div key={i} style={{ width: 60, height: 60, borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                    <img src={imgUrl} alt={`gallery-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removeGalleryImage(i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
                
                {/* Multi Upload Button */}
                <div style={{ width: 60, height: 60, borderRadius: 6, background: 'var(--bg-elevated)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
                  <UploadCloud size={16} color="var(--text-muted)" />
                  <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }} />
                </div>
              </div>
            </div>

            <div className="input-group">
              <label className="label">Pin to top?</label>
              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                {['Yes', 'No'].map(v => (
                  <button key={v} type="button"
                    className={`btn btn-sm ${(v === 'Yes') === form.isPinned ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setForm(f => ({ ...f, isPinned: v === 'Yes' }))}>
                    {v === 'Yes' ? <Star size={11} /> : null}{v}
                  </button>
                ))}
              </div>
            </div>

          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleAdd} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Save Album'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {[...albums].sort((a, b) => b.isPinned - a.isPinned).map(item => (
          <div key={item.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
            {item.isPinned && (
              <div style={{ position: 'absolute', top: 10, left: 10, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(250,204,21,0.15)', color: '#facc15', border: '1px solid rgba(250,204,21,0.3)', zIndex: 10 }}>
                <Star size={9} style={{ display: 'inline', marginRight: 3 }} />PINNED
              </div>
            )}
            
            <div style={{ height: 140, margin: '-16px -16px 12px -16px', background: 'var(--bg-elevated)', position: 'relative' }}>
              {item.coverImageUrl ? (
                <img src={item.coverImageUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FolderOpen size={30} color="var(--text-muted)" />
                </div>
              )}
              <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>
                {item.images.length} images
              </div>
            </div>

            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 5 }}>{item.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>{item.description}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => togglePin(item.id, item.isPinned)}>
                <Star size={11} />{item.isPinned ? 'Unpin' : 'Pin'}
              </button>
              <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }} onClick={() => remove(item.id)}>
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
