/**
 * AwsStorageAdapter
 * Client-side adapter for AWS Cloud Mode.
 * Communicates exclusively with the API Gateway HTTP API and S3 via presigned URLs.
 * STRICT SECURITY RULE: No AWS SDKs, credentials, or secret keys in client-side code!
 */

import type { StorageAdapter, StoragePackageItem } from './StorageAdapter';
import type { ExperimentRun, PackageMetadata } from '../core/experiment/types';

export interface AwsAdapterConfig {
  apiBaseUrl: string;
  getIdToken: () => Promise<string | null>;
}

export class AwsStorageAdapter implements StorageAdapter {
  readonly mode = 'cloud' as const;

  private apiBaseUrl: string;
  private getIdToken: () => Promise<string | null>;

  constructor(config: AwsAdapterConfig) {
    this.apiBaseUrl = config.apiBaseUrl.replace(/\/+$/, '');
    this.getIdToken = config.getIdToken;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getIdToken();
    if (!token) {
      throw new Error('Authentication required for AWS Cloud Mode (missing JWT token)');
    }
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // --- Experiment Operations ---
  // In our cloud architecture, experiments are stored locally in the browser,
  // while packages (SimXPacks) are backed up to DynamoDB and S3.

  async saveExperiment(_experiment: ExperimentRun): Promise<void> {
    // Cloud mode syncs whole SimXPack packages rather than raw individual runs.
  }

  async listExperiments(): Promise<ExperimentRun[]> {
    return [];
  }

  async getExperiment(_id: string): Promise<ExperimentRun | null> {
    return null;
  }

  async deleteExperiment(_id: string): Promise<void> {
    // Handled locally
  }

  async clearAllExperiments(): Promise<void> {
    // Handled locally
  }

  // --- Package (SimXPack) Cloud Operations ---

  async savePackage(metadata: PackageMetadata, zipBytes: Uint8Array): Promise<void> {
    const headers = await this.getAuthHeaders();

    // Step 1: Request presigned upload URL from Lambda
    const initRes = await fetch(`${this.apiBaseUrl}/packages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: metadata.id,
        name: metadata.name,
        description: metadata.description,
        experimentCount: metadata.experimentCount,
        experimentIds: metadata.experimentIds,
        uncompressedBytes: metadata.uncompressedBytes,
        compressedBytes: metadata.compressedBytes,
        sha256: metadata.sha256,
      }),
    });

    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({}));
      throw new Error(err.message || `Failed to initiate cloud package: HTTP ${initRes.status}`);
    }

    const { uploadUrl } = await initRes.json();

    // Step 2: Upload ZIP payload directly to private S3 bucket via presigned URL
    // (Bypasses API Gateway and Lambda compute completely, incurring $0.00 bandwidth penalty)
    const s3Res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/zip',
      },
      body: zipBytes as unknown as BodyInit,
    });

    if (!s3Res.ok) {
      throw new Error(`Direct S3 upload failed with status HTTP ${s3Res.status}`);
    }

    // Step 3: Notify Lambda that upload completed successfully
    const completeRes = await fetch(`${this.apiBaseUrl}/packages/${metadata.id}/complete`, {
      method: 'POST',
      headers,
    });

    if (!completeRes.ok) {
      throw new Error(`Failed to finalize package: HTTP ${completeRes.status}`);
    }
  }

  async listPackages(): Promise<PackageMetadata[]> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${this.apiBaseUrl}/packages`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch cloud packages: HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.packages || [];
  }

  async getPackage(id: string): Promise<StoragePackageItem | null> {
    const downloadUrl = await this.getPackageDownloadUrl(id);
    if (!downloadUrl) return null;

    const res = await fetch(downloadUrl);
    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    const zipBytes = new Uint8Array(buffer);

    const packages = await this.listPackages();
    const meta = packages.find((p) => p.id === id);
    if (!meta) return null;

    return {
      metadata: meta,
      zipBytes,
    };
  }

  async getPackageDownloadUrl(id: string): Promise<string | null> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${this.apiBaseUrl}/packages/${id}/download-url`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.downloadUrl || null;
  }

  async deletePackage(id: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${this.apiBaseUrl}/packages/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) {
      throw new Error(`Failed to delete cloud package: HTTP ${res.status}`);
    }
  }
}
