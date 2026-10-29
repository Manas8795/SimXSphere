import React, { useState, useRef } from 'react';
import type { ExperimentRun } from '../../../core/experiment/types';
import {
  parseAndValidateSinglePackage,
  MAX_SINGLE_PACKAGE_SIZE_BYTES,
} from '../../../core/simxpack/singlePackage';
import { importSimXPack } from '../../../core/simxpack/import';
import { safeRandomUUID } from '../../../core/crypto/uuid';

interface ImportDialogProps {
  existingExperiments: ExperimentRun[];
  onImportComplete: (experiments: ExperimentRun[], restoreTarget?: ExperimentRun) => void;
  onClose: () => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({
  existingExperiments,
  onImportComplete,
  onClose,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewPackage, setPreviewPackage] = useState<{
    type: 'single' | 'bundle';
    experiments: ExperimentRun[];
    filename: string;
    checksumValid?: boolean;
  } | null>(null);

  const [conflictChoice, setConflictChoice] = useState<'copy' | 'overwrite'>('copy');
  const [confirmOverwrite, setConfirmOverwrite] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setPreviewPackage(null);
    setConfirmOverwrite(false);

    // Size limit check
    if (file.size > MAX_SINGLE_PACKAGE_SIZE_BYTES) {
      setErrorMsg(`File exceeds maximum allowed limit of 5 MiB (got ${(file.size / 1024 / 1024).toFixed(2)} MiB)`);
      return;
    }

    try {
      if (file.name.endsWith('.zip') || file.name.endsWith('.simxpack.zip')) {
        // Zip archive bundle
        const arrayBuf = await file.arrayBuffer();
        const zipBytes = new Uint8Array(arrayBuf);
        const res = await importSimXPack(zipBytes, 'overwrite', existingExperiments.map((e) => e.id));
        setPreviewPackage({
          type: 'bundle',
          experiments: res.experiments,
          filename: file.name,
          checksumValid: true,
        });
      } else {
        // Single experiment JSON or .simxpack
        const text = await file.text();
        const res = await parseAndValidateSinglePackage(text);
        if (!res.valid || !res.package) {
          setErrorMsg(`Validation failed: ${res.errors.join('; ')}`);
          return;
        }

        setPreviewPackage({
          type: 'single',
          experiments: [res.package.experiment],
          filename: file.name,
          checksumValid: res.checksumValid,
        });
      }
    } catch (err) {
      setErrorMsg(`Could not read file: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // Reset input value so re-selecting the same file fires onChange cleanly
      e.target.value = '';
      processFile(file);
    }
  };

  const handleConfirmImport = (shouldRestore: boolean) => {
    if (!previewPackage || previewPackage.experiments.length === 0) return;

    const existingIds = new Set(existingExperiments.map((e) => e.id));
    const processed = previewPackage.experiments.map((exp) => {
      const isDuplicate = existingIds.has(exp.id);
      if (isDuplicate && conflictChoice === 'copy') {
        return {
          ...exp,
          id: safeRandomUUID(),
          title: `${exp.title} (Imported Copy)`,
          createdAt: new Date().toISOString(),
          metadata: {
            ...exp.metadata,
            importedFromId: exp.id,
          },
        };
      }
      return exp;
    });

    onImportComplete(processed, shouldRestore ? processed[0] : undefined);
    onClose();
  };

  const existingIds = new Set(existingExperiments.map((e) => e.id));
  const hasDuplicate = previewPackage?.experiments.some((e) => existingIds.has(e.id));

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
          maxWidth: '580px',
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
        aria-labelledby="import-dialog-title"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>📥</span>
            <h2 id="import-dialog-title" style={{ fontSize: 20, margin: 0, fontFamily: 'var(--font-display)' }}>
              Import Simulation Package
            </h2>
          </div>
          <button
            type="button"
            className="lab-btn lab-btn-ghost"
            style={{ fontSize: 18, padding: '4px 10px', borderRadius: '50%' }}
            onClick={onClose}
            aria-label="Close import dialog"
          >
            ✕
          </button>
        </div>

        {!previewPackage && (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: isDragging ? '2.5px dashed var(--accent, #6366f1)' : '2px dashed var(--wood-frame)',
                background: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'var(--lab-surface-subtle)',
                borderRadius: 12,
                padding: '36px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
              <strong style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>
                Drop a <code>.simxpack</code> or <code>.zip</code> file here
              </strong>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                or click to browse from your device (Max 5 MiB)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".simxpack,.json,.zip"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
              🔒 <strong>Safe Local Processing:</strong> Imported files are validated locally using strict schema rules. No files or private data are sent to any server.
            </p>
          </>
        )}

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#f87171',
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {previewPackage && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, marginBottom: 8, fontFamily: 'var(--font-display)', color: 'var(--text-secondary)' }}>
              Package Preview ({previewPackage.experiments.length} experiment{previewPackage.experiments.length > 1 ? 's' : ''})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '240px', overflowY: 'auto' }}>
              {previewPackage.experiments.map((exp) => (
                <div
                  key={exp.id}
                  style={{
                    background: 'var(--lab-surface-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="lab-badge" style={{ textTransform: 'capitalize' }}>
                      {exp.type}
                    </span>
                    <strong style={{ fontSize: 14 }}>{exp.title}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {exp.description}
                  </div>
                </div>
              ))}
            </div>

            {hasDuplicate && (
              <div
                style={{
                  background: 'var(--lab-surface-subtle)',
                  border: '1.5px solid var(--wood-frame)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  marginTop: 12,
                }}
              >
                <strong style={{ fontSize: 13, display: 'block', marginBottom: 6, color: '#fcd34d' }}>
                  ⚠️ Duplicate ID Detected: An identical experiment is already saved in your library.
                </strong>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap', marginBottom: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="conflictChoice"
                      value="copy"
                      checked={conflictChoice === 'copy'}
                      onChange={() => setConflictChoice('copy')}
                    />
                    Import as new copy (Recommended)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="conflictChoice"
                      value="overwrite"
                      checked={conflictChoice === 'overwrite'}
                      onChange={() => setConflictChoice('overwrite')}
                    />
                    Replace existing
                  </label>
                </div>

                {conflictChoice === 'overwrite' && (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#fca5a5', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={confirmOverwrite}
                        onChange={(e) => setConfirmOverwrite(e.target.checked)}
                      />
                      I confirm replacing my existing saved experiment with this imported version.
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
          <button type="button" className="lab-btn lab-btn-secondary" onClick={onClose}>
            Cancel
          </button>

          {previewPackage && (
            <>
              <button
                type="button"
                className="lab-btn lab-btn-secondary"
                disabled={hasDuplicate && conflictChoice === 'overwrite' && !confirmOverwrite}
                onClick={() => handleConfirmImport(false)}
                title={hasDuplicate && conflictChoice === 'overwrite' && !confirmOverwrite ? 'Confirm replace above before proceeding' : undefined}
              >
                📥 Add to Discoveries
              </button>
              <button
                type="button"
                className="lab-btn lab-btn-primary"
                disabled={hasDuplicate && conflictChoice === 'overwrite' && !confirmOverwrite}
                onClick={() => handleConfirmImport(true)}
                title={hasDuplicate && conflictChoice === 'overwrite' && !confirmOverwrite ? 'Confirm replace above before proceeding' : undefined}
              >
                ▶ Import & Open Simulation
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
