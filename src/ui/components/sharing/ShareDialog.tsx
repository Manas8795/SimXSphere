import React, { useState } from 'react';
import type { ExperimentRun } from '../../../core/experiment/types';
import {
  createSingleSimXPackage,
  shareSimXPackage,
  triggerFileDownload,
  type SimXSinglePackage,
} from '../../../core/simxpack/singlePackage';

interface ShareDialogProps {
  experiment: ExperimentRun;
  onClose: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ experiment, onClose }) => {
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const [packageData, setPackageData] = useState<{
    pkg: SimXSinglePackage;
    filename: string;
    jsonString: string;
  } | null>(null);

  React.useEffect(() => {
    createSingleSimXPackage(experiment).then((res) => {
      setPackageData({
        pkg: res.package,
        filename: res.filename,
        jsonString: res.jsonString,
      });
    }).catch((err) => {
      setShareFeedback(`Export error: ${err instanceof Error ? err.message : String(err)}`);
    });
  }, [experiment]);

  const handleDownload = () => {
    if (!packageData) return;
    triggerFileDownload(packageData.filename, packageData.jsonString);
    setShareFeedback(`✓ Downloaded ${packageData.filename}`);
  };

  const handleSystemShare = async () => {
    if (!packageData) return;
    setIsSharing(true);
    setShareFeedback(null);
    try {
      const res = await shareSimXPackage(packageData.pkg, packageData.filename);
      if (res.success) {
        if (res.method === 'native') {
          setShareFeedback('✓ Shared via system sheet');
        } else {
          setShareFeedback(`✓ Downloaded ${packageData.filename} (send this file to your colleague)`);
        }
      } else if (res.error) {
        setShareFeedback(res.error);
      }
    } catch (err) {
      setShareFeedback(`Share failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyJson = async () => {
    if (!packageData) return;
    try {
      await navigator.clipboard.writeText(packageData.jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setShareFeedback('Could not copy to clipboard');
    }
  };

  const tagLabel =
    experiment.type === 'chemistry'
      ? (experiment.parameters.mode === 'workplane' ? 'Synthesis' : 'Aqueous')
      : experiment.type === 'probability'
      ? 'Probability'
      : 'Physics';

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="lab-card"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--lab-surface)',
          border: '2px solid var(--wood-frame)',
          borderRadius: '14px',
          padding: '24px',
          boxShadow: '0 20px 45px rgba(0,0,0,0.5)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🔗</span>
            <h2 id="share-dialog-title" style={{ fontSize: 20, margin: 0, fontFamily: 'var(--font-display)' }}>
              Share Experiment File
            </h2>
          </div>
          <button
            type="button"
            className="lab-btn lab-btn-ghost"
            style={{ fontSize: 18, padding: '4px 10px', borderRadius: '50%' }}
            onClick={onClose}
            aria-label="Close share dialog"
          >
            ✕
          </button>
        </div>

        {/* Informational callout per Section 7 */}
        <div
          style={{
            background: 'var(--lab-surface-subtle)',
            border: '1.5px solid var(--wood-frame)',
            borderRadius: 8,
            padding: '12px 14px',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
            marginBottom: 16,
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>File-Based Sharing:</strong>
          <p style={{ margin: '4px 0 0' }}>
            Sharing is currently file-based. Download your portable <code>.simxpack</code> file and send it using your preferred app (email, messaging, or local network). The recipient can import the file into SimXSphere on any device or browser without needing an account.
          </p>
        </div>

        {/* Experiment Preview Card */}
        <div
          style={{
            background: 'var(--lab-surface-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span className="lab-badge">{tagLabel}</span>
            <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>{experiment.title}</strong>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 6px' }}>
            {experiment.description}
          </p>
          {packageData && (
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              Package: <code>{packageData.filename}</code> • SHA-256: <code>{packageData.pkg.provenance.checksum.slice(0, 12)}…</code>
            </div>
          )}
        </div>

        {/* Privacy Note */}
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 16px' }}>
          🔒 <strong>Privacy Guarantee:</strong> This export contains strictly simulation inputs and equations. No account tokens, credentials, browser histories, or AI chats are included.
        </p>

        {shareFeedback && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              background: shareFeedback.startsWith('✓') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: shareFeedback.startsWith('✓') ? '#4ade80' : '#f87171',
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {shareFeedback}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="lab-btn lab-btn-secondary"
            onClick={handleCopyJson}
            disabled={!packageData}
          >
            {copied ? '✓ Copied JSON' : '📋 Copy JSON'}
          </button>

          <button
            type="button"
            className="lab-btn lab-btn-secondary"
            onClick={handleSystemShare}
            disabled={!packageData || isSharing}
          >
            {isSharing ? 'Sharing...' : '📱 Share File...'}
          </button>

          <button
            type="button"
            className="lab-btn lab-btn-primary"
            onClick={handleDownload}
            disabled={!packageData}
          >
            💾 Download .simxpack
          </button>
        </div>
      </div>
    </div>
  );
};
