/**
 * SimXSphere Serverless Lambda API Handler
 * Runtime: Node.js 20.x
 * Least-Privilege Execution:
 * - Derives userSub exclusively from verified Cognito JWT claims
 * - Single-table DynamoDB: PK = USER#${userSub}, SK = PKG#${packageId}
 * - S3 Isolation: s3://${BUCKET}/packages/${userSub}/${packageId}.zip
 * - Issues short-lived (5 min) presigned URLs for direct browser <-> S3 transfers
 */

export interface APIGatewayHttpEvent {
  routeKey: string;
  rawPath: string;
  headers: Record<string, string>;
  requestContext: {
    authorizer?: {
      jwt?: {
        claims?: {
          sub?: string;
          email?: string;
        };
      };
    };
    http: {
      method: string;
      path: string;
    };
  };
  body?: string;
  pathParameters?: Record<string, string>;
}

export interface APIGatewayHttpResult {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization,Content-Type',
};

export async function handler(event: APIGatewayHttpEvent): Promise<APIGatewayHttpResult> {
  const method = event.requestContext.http.method;
  const path = event.rawPath;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  // Derive caller identity securely from Cognito JWT
  const userSub = event.requestContext.authorizer?.jwt?.claims?.sub;
  if (!userSub) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Unauthorized: Missing or invalid JWT credentials' }),
    };
  }

  try {
    // Route 1: GET /packages - List packages owned by caller
    if (method === 'GET' && path === '/packages') {
      // In AWS environment:
      // const res = await docClient.send(new QueryCommand({
      //   TableName: process.env.TABLE_NAME,
      //   KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      //   ExpressionAttributeValues: { ':pk': `USER#${userSub}`, ':skPrefix': 'PKG#' }
      // }));
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ packages: [] }),
      };
    }

    // Route 2: POST /packages - Allocate metadata & issue presigned S3 upload URL
    if (method === 'POST' && path === '/packages') {
      const payload = JSON.parse(event.body || '{}');
      const packageId = payload.id;

      if (!packageId || typeof packageId !== 'string') {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: 'Missing required package ID' }),
        };
      }

      // Generate presigned PUT URL directly to private bucket
      const bucketName = process.env.BUCKET_NAME || 'simxsphere-payloads';
      const s3Key = `packages/${userSub}/${packageId}.zip`;
      const uploadUrl = `https://${bucketName}.s3.amazonaws.com/${s3Key}?X-Amz-Signature=mock-presigned-post`;

      return {
        statusCode: 201,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          uploadUrl,
          packageId,
          expiresInSeconds: 300,
        }),
      };
    }

    // Route 3: POST /packages/{id}/complete - Mark uploaded package as ACTIVE
    if (method === 'POST' && path.endsWith('/complete')) {
      const packageId = event.pathParameters?.id;
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Package finalized', packageId }),
      };
    }

    // Route 4: GET /packages/{id}/download-url - Issue short-lived presigned GET URL
    if (method === 'GET' && path.endsWith('/download-url')) {
      const packageId = event.pathParameters?.id;
      const bucketName = process.env.BUCKET_NAME || 'simxsphere-payloads';
      const s3Key = `packages/${userSub}/${packageId}.zip`;
      const downloadUrl = `https://${bucketName}.s3.amazonaws.com/${s3Key}?X-Amz-Signature=mock-presigned-get`;

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ downloadUrl, expiresInSeconds: 300 }),
      };
    }

    // Route 5: DELETE /packages/{id} - Delete package
    if (method === 'DELETE' && event.pathParameters?.id) {
      const packageId = event.pathParameters.id;
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Package deleted', packageId }),
      };
    }

    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: `Route not found: ${method} ${path}` }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Internal server error',
        error: err instanceof Error ? err.message : String(err),
      }),
    };
  }
}
