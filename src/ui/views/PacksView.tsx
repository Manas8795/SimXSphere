import React, { useState } from 'react';
import type { ExperimentRun, PackageMetadata } from '../../core/experiment/types';
import { exportSimXPack } from '../../core/simxpack/export';
import { importSimXPack } from '../../core/simxpack/import';
import { formatBytes } from '../../core/crypto/sha256';

interface PacksViewProps {
  experiments: ExperimentRun[];
  packages: PackageMetadata[];
  initialSelectedExpIds?: string[];
  onSavePackage: (meta: PackageMetadata, zipBytes: Uint8Array) => Promise<void>;
  onDeletePackage: (id: string) => Promise<void>;
  onExperimentsImported: (imported: ExperimentRun[]) => void;
  onDownloadPackage: (id: string) => void;
}

export const PacksView: React.FC<PacksViewProps> = ({
  experiments,
  packages,
  initialSelectedExpIds = [],
  onSavePackage,
  onDeletePackage,
  onExperimentsImported,
  onDownloadPackage,
}) => {
  // Export State
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedExpIds);
  const [collectionName, setCollectionName] = useState<string>('Lab Demonstration Suite');
  const [collectionDesc, setCollectionDesc] = useState<string>('Exported from SimXSphere');
  const [includeCsv, setIncludeCsv] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Import State
  const [conflictStrategy, setConflictStrategy] = useState<'overwrite' | 'skip' | 'copy'>('copy');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);

  const toggleSelectExp = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExport = async () => {
    if (selectedIds.length < 2 || selectedIds.length > 4) {
      setExportMessage('Please select between 2 and 4 experiments.');
      return;
    }

    setIsExporting(true);
    setExportMessage(null);

    try {
      const selectedExps = experiments.filter((e) => selectedIds.includes(e.id));
      const result = await exportSimXPack(selectedExps, {
        collection: {
          name: collectionName,
          description: collectionDesc,
        },
        includeCsv,
      });

      // Save to storage
      await onSavePackage(result.metadata, result.zipBytes);

      // Trigger browser download
      const blob = new Blob([result.zipBytes as unknown as BlobPart], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${collectionName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.simxpack.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setExportMessage(
        `✓ SimXPack created! Uncompressed: ${formatBytes(result.stats.uncompressedBytes)} → Compressed: ${formatBytes(result.stats.compressedBytes)} (${result.stats.percentSaved.toFixed(1)}% reduction)`
      );
    } catch (err) {
      setExportMessage(`Export error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);

    try {
      const buffer = await file.arrayBuffer();
      const zipBytes = new Uint8Array(buffer);
      const existingIds = experiments.map((exp) => exp.id);

      const importResult = await importSimXPack(zipBytes, conflictStrategy, existingIds);

      // Save extracted experiments to state
      onExperimentsImported(importResult.experiments);

      // Save package metadata to local store
      await onSavePackage(importResult.metadata, zipBytes);

      setImportStatus({
        success: true,
        message: `✓ Successfully verified and imported collection "${importResult.manifest.collection.name}" with ${importResult.experiments.length} experiments! All SHA-256 checksums passed.`,
      });
    } catch (err) {
      setImportStatus({
        success: false,
        message: `Security Import Rejected: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overview Banner */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className="badge badge-indigo">SimXPack Format v1</span>
          <span className="badge badge-emerald">SHA-256 Tamper Evident</span>
        </div>
        <h1 style={{ fontSize: 24, marginBottom: 6 }}>SimXPack Studio</h1>
        <p style={{ maxWidth: 800 }}>
          SimXPack bundles <strong>2 to 4 experiments</strong> into a standardized, portable ZIP archive with an internal <code style={{ color: '#a5b4fc' }}>manifest.json</code> and SHA-256 cryptographic digests. Every imported archive undergoes our 10-step security pipeline protecting against Zip-Slip, decompression bombs, and file tampering.
        </p>
      </div>

      {/* Export & Import Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
        {/* Export Panel */}
        <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 16 }}>Bundle & Export SimXPack</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Collection Name</label>
                <input
                  type="text"
                  id="pack-collection-name-input"
                  className="form-input"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  maxLength={80}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description / Purpose</label>
                <textarea
                  id="pack-collection-desc-input"
                  className="form-input"
                  rows={2}
                  value={collectionDesc}
                  onChange={(e) => setCollectionDesc(e.target.value)}
                  maxLength={500}
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="include-csv-checkbox"
                  checked={includeCsv}
                  onChange={(e) => setIncludeCsv(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#6366f1' }}
                />
                <label htmlFor="include-csv-checkbox" style={{ fontSize: 13, cursor: 'pointer' }}>
                  Include CSV outcome tables in <code style={{ color: '#38bdf8' }}>csv/</code> folder
                </label>
              </div>

              {/* Experiment Selector */}
              <div>
                <div className="form-label" style={{ marginBottom: 6 }}>
                  <span>Select Experiments (2 to 4 required)</span>
                  <strong style={{ color: selectedIds.length >= 2 && selectedIds.length <= 4 ? '#34d399' : '#f59e0b' }}>
                    {selectedIds.length} / 4 Selected
                  </strong>
                </div>

                {experiments.length === 0 ? (
                  <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: 16, borderRadius: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                    No experiments available to bundle. Run some simulations in Probability or Projectile tabs first.
                  </div>
                ) : (
                  <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {experiments.map((exp) => {
                      const isChecked = selectedIds.includes(exp.id);
                      return (
                        <label
                          key={exp.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            borderRadius: 6,
                            background: isChecked ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid',
                            borderColor: isChecked ? 'rgba(99, 102, 241, 0.4)' : 'transparent',
                            cursor: 'pointer',
                            fontSize: 13,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectExp(exp.id)}
                            style={{ accentColor: '#6366f1' }}
                          />
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {exp.type === 'probability' ? '🎲' : '🚀'} {exp.title}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {exportMessage && (
                <div style={{
                  padding: 10,
                  borderRadius: 6,
                  fontSize: 12,
                  background: exportMessage.startsWith('✓') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                  color: exportMessage.startsWith('✓') ? '#34d399' : '#fda4af',
                }}>
                  {exportMessage}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              id="export-pack-btn"
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px 18px' }}
              disabled={selectedIds.length < 2 || selectedIds.length > 4 || isExporting}
              onClick={handleExport}
            >
              {isExporting ? 'Generating ZIP...' : `📦 Export SimXPack (${selectedIds.length} Experiments)`}
            </button>
          </div>
        </div>

        {/* Import Panel */}
        <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18 }}>Security-Hardened Import</h2>
              <span className="badge badge-emerald">10-Step Defense</span>
            </div>

            <p style={{ fontSize: 13, marginBottom: 16 }}>
              Upload any <code style={{ color: '#a5b4fc' }}>.simxpack.zip</code> file. The pipeline checks path allowlists, verifies all file hashes, validates schema version 1, and guards against Zip-Slip attacks.
            </p>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Collision Resolution Strategy</label>
              <select
                id="conflict-strategy-select"
                className="form-select"
                value={conflictStrategy}
                onChange={(e) => setConflictStrategy(e.target.value as any)}
              >
                <option value="copy">Import as Copy (Assign new UUID, preserve importedFromId)</option>
                <option value="overwrite">Overwrite (Replace local run if identical UUID exists)</option>
                <option value="skip">Skip (Keep existing local experiment)</option>
              </select>
            </div>

            <div style={{
              border: '2px dashed rgba(99, 102, 241, 0.4)',
              borderRadius: 12,
              padding: 28,
              textAlign: 'center',
              background: 'rgba(0, 0, 0, 0.2)',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📥</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Select .simxpack.zip Archive</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
                Maximum size: 5 MiB | Decompression limit: 5 MiB
              </div>
              <input
                type="file"
                id="import-pack-file-input"
                accept=".zip,.simxpack"
                onChange={handleFileImport}
                disabled={isImporting}
                style={{ fontSize: 13 }}
              />
            </div>

            {importStatus && (
              <div style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 8,
                fontSize: 13,
                background: importStatus.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                color: importStatus.success ? '#34d399' : '#fda4af',
                border: `1px solid ${importStatus.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
              }}>
                {importStatus.message}
              </div>
            )}
          </div>

          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: 12, borderRadius: 8, fontSize: 11, color: 'var(--text-muted)', marginTop: 20 }}>
            🛡️ <strong>Security Controls:</strong> Path allowlist, max 20 entries, ratio limit 100:1, SHA-256 manifest check, canonical JSON schema verification.
          </div>
        </div>
      </div>

      {/* Created & Imported Packages History */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 18, marginBottom: 16 }}>Packaged Collections ({packages.length})</h3>

        {packages.length === 0 ? (
          <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: 32, borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
            <p style={{ fontSize: 14 }}>No SimXPack packages in storage yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="glass-panel"
                style={{
                  padding: 18,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 14,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-indigo">SimXPack</span>
                    <h4 style={{ fontSize: 16 }}>{pkg.name}</h4>
                  </div>
                  <p style={{ fontSize: 13, marginTop: 4 }}>{pkg.description || 'No description'}</p>
                  <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>🕒 {new Date(pkg.createdAt).toLocaleString()}</span>
                    <span>🧪 {pkg.experimentCount} Experiments</span>
                    <span>💾 {formatBytes(pkg.compressedBytes)}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>SHA: {pkg.sha256.slice(0, 12)}...</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => onDownloadPackage(pkg.id)}
                  >
                    ⬇ Download ZIP
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => onDeletePackage(pkg.id)}
                  >
                    ✕ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
