import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AwsStorageAdapter } from '../../src/storage/awsAdapter';
import type { PackageMetadata } from '../../src/core/experiment/types';

describe('AWS Storage Adapter Mock Cloud Tests', () => {
  const mockApiBaseUrl = 'https://api.simxsphere.test';
  const mockToken = 'mock-jwt-token-12345';

  const mockMeta: PackageMetadata = {
    id: 'test-pkg-uuid-1',
    name: 'Cloud Test Pack',
    description: 'Testing mock cloud storage',
    createdAt: '2026-10-19T10:00:00.000Z',
    experimentCount: 2,
    experimentIds: ['exp-1', 'exp-2'],
    uncompressedBytes: 2048,
    compressedBytes: 1024,
    sha256: 'deadbeef1234567890abcdef',
    storageLocation: 'cloud',
  };

  const sampleZipBytes = new Uint8Array([80, 75, 3, 4, 0, 0, 0, 0]);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects initialization when apiBaseUrl is empty or missing', () => {
    expect(() => {
      new AwsStorageAdapter({
        apiBaseUrl: '',
        getIdToken: async () => null,
      });
    }).toThrow(/AWS API base URL is not configured/);
  });

  it('rejects requests when user is not authenticated', async () => {
    const unauthenticatedAdapter = new AwsStorageAdapter({
      apiBaseUrl: mockApiBaseUrl,
      getIdToken: async () => null, // No token
    });

    await expect(
      unauthenticatedAdapter.savePackage(mockMeta, sampleZipBytes)
    ).rejects.toThrow(/Authentication required/);
  });

  it('performs full 3-step presigned S3 direct upload workflow', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    // Step 1: POST /packages -> returns uploadUrl
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        uploadUrl: 'https://bucket.s3.amazonaws.com/packages/user-sub/test-pkg-uuid-1.zip?presigned=true',
        packageId: mockMeta.id,
      }),
    });

    // Step 2: Direct S3 PUT -> returns 200 OK
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    // Step 3: POST /packages/{id}/complete -> returns 200 OK
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Package finalized' }),
    });

    const adapter = new AwsStorageAdapter({
      apiBaseUrl: mockApiBaseUrl,
      getIdToken: async () => mockToken,
    });

    await adapter.savePackage(mockMeta, sampleZipBytes);

    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Verify headers for Step 1
    const [step1Url, step1Opts] = fetchMock.mock.calls[0];
    expect(step1Url).toBe(`${mockApiBaseUrl}/packages`);
    expect(step1Opts.method).toBe('POST');
    expect(step1Opts.headers.Authorization).toBe(`Bearer ${mockToken}`);

    // Verify Step 2 direct S3 upload
    const [step2Url, step2Opts] = fetchMock.mock.calls[1];
    expect(step2Url).toContain('bucket.s3.amazonaws.com');
    expect(step2Opts.method).toBe('PUT');

    // Verify Step 3 finalize
    const [step3Url, step3Opts] = fetchMock.mock.calls[2];
    expect(step3Url).toBe(`${mockApiBaseUrl}/packages/${mockMeta.id}/complete`);
    expect(step3Opts.method).toBe('POST');
  });

  it('requests presigned download URL for package export', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        downloadUrl: 'https://bucket.s3.amazonaws.com/packages/download.zip?sig=123',
      }),
    });

    const adapter = new AwsStorageAdapter({
      apiBaseUrl: mockApiBaseUrl,
      getIdToken: async () => mockToken,
    });

    const url = await adapter.getPackageDownloadUrl('test-pkg-uuid-1');
    expect(url).toBe('https://bucket.s3.amazonaws.com/packages/download.zip?sig=123');
  });
});
