import React, { useState, useMemo } from 'react';
import type { ExperimentRun, PackageMetadata } from '../../core/experiment/types';
import { exportSimXPack } from '../../core/simxpack/export';
import { importSimXPack, inspectSimXPack, type PackageInspectionResult } from '../../core/simxpack/import';
import { formatBytes } from '../../core/crypto/sha256';

interface PacksViewProps {
  experiments: ExperimentRun[];
  packages: PackageMetadata[];
  initialSelectedExpIds?: string[];
  onSavePackage: (meta: PackageMetadata, zipBytes: Uint8Array) => Promise<void>;
  onDeletePackage: (id: string) => Promise<void>;
  onExperimentsImported: (imported: ExperimentRun[]) => void;
  onDownloadPackage: (id: string) => void;
  onUploadPackageToCloud?: (pkg: PackageMetadata) => Promise<void>;
}

export const PacksView: React.FC<PacksViewProps> = ({
  experiments,
  packages,
  initialSelectedExpIds = [],
  onSavePackage,
  onDeletePackage,
  onExperimentsImported,
  onDownloadPackage,
  onUploadPackageToCloud,
}) => {
  // Export State
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedExpIds);
  const [collectionName, setCollectionName] = useState<string>('My Simulation Package');
  const [collectionDesc, setCollectionDesc] = useState<string>('Verified experiments from SimXSphere');
  const [includeCsv, setIncludeCsv] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [lastCompressionStats, setLastCompressionStats] = useState<{
    uncompressedBytes: number;
    compressedBytes: number;
    savedBytes: number;
    percentSaved: number;
    experimentCount: number;
  } | null>(null);

  // Filter State
  const [disciplineFilter, setDisciplineFilter] = useState<'all' | 'chemistry' | 'probability' | 'projectile'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Staged Import State (Package Inspector)
  const [pendingZipBytes, setPendingZipBytes] = useState<Uint8Array | null>(null);
  const [pendingFilename, setPendingFilename] = useState<string>('');
  const [inspectionResult, setInspectionResult] = useState<PackageInspectionResult | null>(null);
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [conflictStrategy, setConflictStrategy] = useState<'overwrite' | 'skip' | 'copy'>('copy');
  const [isCommittingImport, setIsCommittingImport] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Filter experiments
  const filteredExperiments = useMemo(() => {
    return experiments.filter((exp) => {
      const matchesType = disciplineFilter === 'all' || exp.type === disciplineFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [experiments, disciplineFilter, searchQuery]);

  // Estimated uncompressed size of selected experiments
  const estimatedUncompressedSize = useMemo(() => {
    const selected = experiments.filter((e) => selectedIds.includes(e.id));
    if (selected.length === 0) return 0;
    try {
      const jsonStr = JSON.stringify(selected);
      return new TextEncoder().encode(jsonStr).byteLength;
    } catch {
      return 0;
    }
  }, [experiments, selectedIds]);

  const toggleSelectExp = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const visibleIds = filteredExperiments.map((e) => e.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])).slice(0, 10));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleExport = async () => {
    if (selectedIds.length < 1 || selectedIds.length > 10) {
      setExportMessage('Please select between 1 and 10 experiments.');
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

      setLastCompressionStats({
        uncompressedBytes: result.stats.uncompressedBytes,
        compressedBytes: result.stats.compressedBytes,
        savedBytes: result.stats.savedBytes,
        percentSaved: result.stats.percentSaved,
        experimentCount: selectedExps.length,
      });

      setExportMessage(
        `✓ SimXPack successfully created and downloaded!`
      );
    } catch (err) {
      setExportMessage(`Export error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Staged File Selection -> Runs Inspector First
  const handleFileSelectForInspection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsInspecting(true);
    setImportStatus(null);
    setPendingFilename(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const zipBytes = new Uint8Array(buffer);
      setPendingZipBytes(zipBytes);

      // Inspect without committing
      const inspectRes = await inspectSimXPack(zipBytes);
      setInspectionResult(inspectRes);
    } catch (err) {
      setImportStatus({
        success: false,
        message: `Security validation error: ${err instanceof Error ? err.message : String(err)}`,
      });
      setPendingZipBytes(null);
      setInspectionResult(null);
    } finally {
      setIsInspecting(false);
      e.target.value = '';
    }
  };

  // Confirmed Import Commitment
  const handleCommitImport = async () => {
    if (!pendingZipBytes || !inspectionResult) return;

    setIsCommittingImport(true);
    try {
      const existingIds = experiments.map((exp) => exp.id);
      const importResult = await importSimXPack(pendingZipBytes, conflictStrategy, existingIds);

      // Save extracted experiments to state
      onExperimentsImported(importResult.experiments);

      // Save package metadata to local store
      await onSavePackage(importResult.metadata, pendingZipBytes);

      setImportStatus({
        success: true,
        message: `✓ Successfully verified and imported collection "${importResult.manifest.collection.name}" with ${importResult.experiments.length} experiments! All cryptographic checks passed.`,
      });

      // Clear staged inspector
      setPendingZipBytes(null);
      setInspectionResult(null);
      setPendingFilename('');
    } catch (err) {
      setImportStatus({
        success: false,
        message: `Import failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsCommittingImport(false);
    }
  };

  const handleCancelInspection = () => {
    setPendingZipBytes(null);
    setInspectionResult(null);
    setPendingFilename('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Banner */}
      <div className="lab-card" style={{ padding: 24, borderLeft: '4px solid var(--accent-cyan)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="badge badge-indigo">SimXPack v1</span>
              <span className="badge badge-emerald">SHA-256 Verified</span>
              <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                ☁️ AWS eu-north-1 Ready
              </span>
            </div>
            <h1 style={{ fontSize: 24, fontFamily: 'var(--font-display)', marginBottom: 6 }}>
              📦 SimXPack Studio & Cloud Packaging
            </h1>
            <p style={{ maxWidth: 850, fontSize: 14, color: 'var(--text-secondary)' }}>
              Package, compress, inspect, and export simulation experiments from <strong>Chemistry</strong>, <strong>Probability</strong>, and <strong>Physics</strong> into portable <code style={{ color: '#a5b4fc' }}>.simxpack.zip</code> archives. Powered by 10-step security verification and AWS Cloud storage.
            </p>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Storage Mode</span>
            <span className="lab-badge" style={{ background: 'var(--lab-surface-subtle)', padding: '4px 10px', fontSize: 13, fontWeight: 700 }}>
              🔒 Local-First (Offline Ready)
            </span>
          </div>
        </div>
      </div>

      {/* Main Studio Grid: Builder & Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24 }}>
        {/* ===================================================================
            1. PACKAGE BUILDER
            =================================================================== */}
        <div className="lab-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontFamily: 'var(--font-display)' }}>1. Package Builder</h2>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {selectedIds.length} of 10 selected
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Package Title</label>
                <input
                  type="text"
                  id="pack-collection-name-input"
                  className="form-input"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. Acid-Base Titration & Trajectory Suite"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description / Hypothesis</label>
                <textarea
                  id="pack-collection-desc-input"
                  className="form-input"
                  rows={2}
                  value={collectionDesc}
                  onChange={(e) => setCollectionDesc(e.target.value)}
                  maxLength={500}
                  style={{ resize: 'none' }}
                  placeholder="Describe the simulations included in this package..."
                />
              </div>

              {/* Module Filter Pills & Search */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Select Experiments</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="lab-btn lab-btn-secondary"
                      style={{ fontSize: 11, padding: '3px 8px' }}
                      onClick={handleSelectAllFiltered}
                    >
                      Select Visible
                    </button>
                    {selectedIds.length > 0 && (
                      <button
                        type="button"
                        className="lab-btn lab-btn-secondary"
                        style={{ fontSize: 11, padding: '3px 8px' }}
                        onClick={handleClearSelection}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`subnav-pill ${disciplineFilter === 'all' ? 'active' : ''}`}
                    style={{ fontSize: 12, padding: '4px 10px' }}
                    onClick={() => setDisciplineFilter('all')}
                  >
                    All ({experiments.length})
                  </button>
                  <button
                    type="button"
                    className={`subnav-pill ${disciplineFilter === 'chemistry' ? 'active' : ''}`}
                    style={{ fontSize: 12, padding: '4px 10px' }}
                    onClick={() => setDisciplineFilter('chemistry')}
                  >
                    🧪 Chemistry ({experiments.filter((e) => e.type === 'chemistry').length})
                  </button>
                  <button
                    type="button"
                    className={`subnav-pill ${disciplineFilter === 'probability' ? 'active' : ''}`}
                    style={{ fontSize: 12, padding: '4px 10px' }}
                    onClick={() => setDisciplineFilter('probability')}
                  >
                    🎲 Probability ({experiments.filter((e) => e.type === 'probability').length})
                  </button>
                  <button
                    type="button"
                    className={`subnav-pill ${disciplineFilter === 'projectile' ? 'active' : ''}`}
                    style={{ fontSize: 12, padding: '4px 10px' }}
                    onClick={() => setDisciplineFilter('projectile')}
                  >
                    🚀 Physics ({experiments.filter((e) => e.type === 'projectile').length})
                  </button>
                </div>

                <input
                  type="text"
                  className="form-input"
                  style={{ marginBottom: 10, fontSize: 12, padding: '6px 10px' }}
                  placeholder="🔍 Search experiments by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                {/* Experiments List Box */}
                {filteredExperiments.length === 0 ? (
                  <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: 18, borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                    {experiments.length === 0
                      ? 'No experiments saved yet. Run simulations in Chemistry, Probability, or Physics first!'
                      : 'No experiments match your search criteria.'}
                  </div>
                ) : (
                  <div style={{ maxHeight: 210, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
                    {filteredExperiments.map((exp) => {
                      const isChecked = selectedIds.includes(exp.id);
                      const icon = exp.type === 'chemistry' ? '🧪' : exp.type === 'probability' ? '🎲' : '🚀';
                      return (
                        <label
                          key={exp.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            borderRadius: 6,
                            background: isChecked ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                            border: `1.5px solid ${isChecked ? 'var(--accent-cyan)' : 'transparent'}`,
                            cursor: 'pointer',
                            fontSize: 13,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectExp(exp.id)}
                            style={{ accentColor: '#6366f1', width: 16, height: 16 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {icon} {exp.title}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {new Date(exp.createdAt).toLocaleDateString()} • {exp.description || 'Simulation run'}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
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
                  Include scientific CSV outcome tables in <code style={{ color: '#38bdf8' }}>csv/</code> directory
                </label>
              </div>

              {/* Pre-export Size Estimator */}
              {selectedIds.length > 0 && (
                <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '10px 14px', borderRadius: 8, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Estimated Payload: <strong>{formatBytes(estimatedUncompressedSize)}</strong></span>
                  <span style={{ color: '#34d399' }}>✓ DEFLATE Level 6 Compression</span>
                </div>
              )}

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
              className="lab-btn lab-btn-primary"
              style={{ width: '100%', padding: '12px 18px', fontSize: 14, fontWeight: 700 }}
              disabled={selectedIds.length < 1 || selectedIds.length > 10 || isExporting}
              onClick={handleExport}
            >
              {isExporting ? 'Compressing Archive...' : `📦 Build & Export SimXPack (${selectedIds.length} Experiment${selectedIds.length === 1 ? '' : 's'})`}
            </button>
          </div>
        </div>

        {/* ===================================================================
            2. COMPRESSION ANALYZER & INSPECTOR
            =================================================================== */}
        <div className="lab-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontFamily: 'var(--font-display)' }}>2. Compression Analyzer</h2>
              <span className="badge badge-indigo">DEFLATE Algorithm</span>
            </div>

            {/* Compression Metrics Panel */}
            {lastCompressionStats ? (
              <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: 10, padding: 18, marginBottom: 18 }}>
                <h3 style={{ fontSize: 14, color: 'var(--accent-cyan)', marginBottom: 12, fontWeight: 700 }}>
                  📊 Last Export Metrics ({lastCompressionStats.experimentCount} Experiments)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Raw Uncompressed:</span>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{formatBytes(lastCompressionStats.uncompressedBytes)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Compressed Archive:</span>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#34d399' }}>{formatBytes(lastCompressionStats.compressedBytes)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Bytes Saved:</span>
                    <div style={{ fontWeight: 700 }}>
                      {lastCompressionStats.savedBytes >= 0
                        ? `${formatBytes(lastCompressionStats.savedBytes)}`
                        : `+${formatBytes(Math.abs(lastCompressionStats.savedBytes))} overhead`}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Space Reduction:</span>
                    <div style={{ fontWeight: 700, color: lastCompressionStats.percentSaved >= 0 ? '#34d399' : '#f59e0b' }}>
                      {lastCompressionStats.percentSaved >= 0
                        ? `${lastCompressionStats.percentSaved.toFixed(1)}% reduction`
                        : `Tiny file (ZIP container headers)`}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: 18, borderRadius: 8, fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
                💡 Select experiments and click <strong>Build & Export</strong> to see real-time compression analysis, savings ratio, and byte reduction.
              </div>
            )}

            {/* Safe Staged Import Uploader */}
            <h2 style={{ fontSize: 18, fontFamily: 'var(--font-display)', marginBottom: 10 }}>3. Safe Staged Import & Inspector</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Select a <code style={{ color: '#a5b4fc' }}>.simxpack.zip</code> file to safely inspect its manifest, checksums, and contents <strong>before</strong> committing anything to storage.
            </p>

            <div style={{
              border: '2px dashed rgba(99, 102, 241, 0.4)',
              borderRadius: 12,
              padding: 24,
              textAlign: 'center',
              background: 'rgba(0, 0, 0, 0.2)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Select Package to Inspect</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                Enforces 10-step anti-tampering, Zip-Slip, and 5 MiB bomb defenses
              </div>
              <input
                type="file"
                id="import-pack-file-input"
                accept=".zip,.simxpack"
                onChange={handleFileSelectForInspection}
                disabled={isInspecting || isCommittingImport}
                style={{ fontSize: 13 }}
              />
            </div>

            {isInspecting && (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--accent-cyan)' }}>
                ⏳ Inspecting archive structure and computing cryptographic checksums...
              </div>
            )}

            {importStatus && (
              <div style={{
                marginTop: 14,
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
            🛡️ <strong>Safety Guarantee:</strong> Inspector renders all archive strings as sanitized text. No code, scripts, or HTML from archives are ever executed.
          </div>
        </div>
      </div>

      {/* ===================================================================
          STAGE 2: PACKAGE INSPECTOR MODAL / CARD (Triggered on File Upload)
          =================================================================== */}
      {inspectionResult && (
        <div className="lab-card" style={{ padding: 24, border: '2px solid var(--accent-cyan)', background: 'var(--lab-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>🔍</span>
              <div>
                <h3 style={{ fontSize: 18, fontFamily: 'var(--font-display)' }}>
                  Package Inspector: {pendingFilename}
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Pre-import inspection. Review contents below before confirming.
                </span>
              </div>
            </div>

            <span className={`badge ${inspectionResult.valid ? 'badge-emerald' : 'badge-danger'}`}>
              {inspectionResult.valid ? '✓ Passed 10-Step Security Check' : '✕ Security Rejection'}
            </span>
          </div>

          {/* Validation Errors */}
          {!inspectionResult.valid && (
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid #f43f5e', padding: 14, borderRadius: 8, color: '#fda4af', marginBottom: 16 }}>
              <strong>Rejection Reasons:</strong>
              <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                {inspectionResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Safe Manifest Details */}
          {inspectionResult.manifest && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16, background: 'rgba(0, 0, 0, 0.25)', padding: 16, borderRadius: 8, fontSize: 13 }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Collection Name:</span>
                <div style={{ fontWeight: 700 }}>{inspectionResult.manifest.collection.name}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Created Timestamp:</span>
                <div>{new Date(inspectionResult.manifest.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Schema Version:</span>
                <div>Format v{inspectionResult.manifest.formatVersion} (SimXPack)</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Total Entries:</span>
                <div>{inspectionResult.stats.entryCount} files ({formatBytes(inspectionResult.stats.uncompressedBytes)})</div>
              </div>
            </div>
          )}

          {/* Module Breakdown Badges */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {Object.entries(inspectionResult.moduleBreakdown).map(([mod, count]) => (
              <span key={mod} className="badge badge-indigo" style={{ fontSize: 12 }}>
                {mod === 'chemistry' ? '🧪' : mod === 'probability' ? '🎲' : '🚀'} {count} {mod.toUpperCase()}
              </span>
            ))}
            <span className="badge badge-emerald" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
              SHA-256: {inspectionResult.sha256Checksum.slice(0, 16)}...
            </span>
          </div>

          {/* Enclosed Experiments Table */}
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, marginBottom: 8, fontWeight: 700 }}>Enclosed Experiments:</h4>
            <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {inspectionResult.experiments.map((exp) => (
                <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: 13 }}>
                  <span>{exp.type === 'chemistry' ? '🧪' : exp.type === 'probability' ? '🎲' : '🚀'} {exp.title}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>ID: {exp.id}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Collision Resolution Selector */}
          <div className="form-group" style={{ marginBottom: 18 }}>
            <label className="form-label">Duplicate ID Resolution Strategy</label>
            <select
              id="conflict-strategy-select"
              className="form-select"
              value={conflictStrategy}
              onChange={(e) => setConflictStrategy(e.target.value as any)}
            >
              <option value="copy">Import as Copy (Assign new UUIDs, preserve local experiments)</option>
              <option value="overwrite">Overwrite (Replace existing local run if matching UUID)</option>
              <option value="skip">Skip (Keep local experiments, skip imported duplicate IDs)</option>
            </select>
          </div>

          {/* Action Confirmation Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              className="lab-btn lab-btn-secondary"
              onClick={handleCancelInspection}
              disabled={isCommittingImport}
            >
              Cancel
            </button>
            <button
              type="button"
              className="lab-btn lab-btn-primary"
              disabled={!inspectionResult.valid || isCommittingImport}
              onClick={handleCommitImport}
            >
              {isCommittingImport ? 'Importing Experiments...' : '✓ Confirm & Commit Import'}
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================
          3. PACKAGED COLLECTIONS HISTORY & CLOUD STATUS
          =================================================================== */}
      <div className="lab-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 18, fontFamily: 'var(--font-display)' }}>
              Packaged Collections ({packages.length})
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Stored packages ready for offline export or AWS Cloud sync
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge badge-emerald">AWS S3 & DynamoDB Active</span>
          </div>
        </div>

        {packages.length === 0 ? (
          <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: 32, borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
            <p style={{ fontSize: 14 }}>No SimXPack packages created yet.</p>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Select experiments in the Package Builder above and click "Build & Export SimXPack".
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="lab-card"
                style={{
                  padding: 18,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 14,
                  background: 'rgba(255, 255, 255, 0.02)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-indigo">SimXPack</span>
                    <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#34d399' }}>
                      {pkg.storageLocation === 'cloud' ? '☁️ AWS Cloud' : '💾 Local Storage'}
                    </span>
                    <h4 style={{ fontSize: 16, fontWeight: 700 }}>{pkg.name}</h4>
                  </div>
                  <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-secondary)' }}>
                    {pkg.description || 'No description provided'}
                  </p>
                  <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>🕒 {new Date(pkg.createdAt).toLocaleString()}</span>
                    <span>🧪 {pkg.experimentCount} Experiments</span>
                    <span>💾 {formatBytes(pkg.compressedBytes)}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>SHA: {pkg.sha256.slice(0, 12)}...</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="lab-btn lab-btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => onDownloadPackage(pkg.id)}
                  >
                    ⬇ Download ZIP
                  </button>
                  {onUploadPackageToCloud && pkg.storageLocation !== 'cloud' && (
                    <button
                      type="button"
                      className="lab-btn lab-btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => onUploadPackageToCloud(pkg)}
                      title="Backup package to Amazon S3 & DynamoDB"
                    >
                      ☁️ Backup to AWS
                    </button>
                  )}
                  <button
                    type="button"
                    className="lab-btn lab-btn-danger"
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
