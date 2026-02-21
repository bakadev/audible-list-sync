import { NextRequest, NextResponse } from "next/server";
import { verifySyncToken, extractBearerToken } from "@/lib/jwt";
import prisma from "@/lib/prisma";
import { processSyncImport, ImportTitle } from "@/lib/sync-import";

// Maximum payload size: 50MB
const MAX_PAYLOAD_SIZE = 50 * 1024 * 1024;

// CORS headers for browser extension
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allow all origins for development
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400", // 24 hours
};

interface ImportPayload {
  titles: ImportTitle[];
}

// Handle preflight OPTIONS request
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Helper to add CORS headers to responses
function jsonWithCors(data: any, options: { status?: number } = {}) {
  return NextResponse.json(data, {
    status: options.status,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    // T031: JWT validation - extract token from Authorization header
    const authHeader = request.headers.get("authorization");
    const token = extractBearerToken(authHeader);

    if (!token) {
      return jsonWithCors(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    // Verify JWT signature and expiry
    let payload;
    try {
      payload = verifySyncToken(token);
    } catch {
      return jsonWithCors({ error: "Invalid or expired token" }, { status: 401 });
    }

    const userId = payload.sub;
    const jti = payload.jti;

    // T032: Single-use token check
    const syncToken = await prisma.syncToken.findUnique({
      where: { jti },
    });

    if (!syncToken) {
      return jsonWithCors({ error: "Token not found" }, { status: 401 });
    }

    if (syncToken.used) {
      return jsonWithCors({ error: "Token already used" }, { status: 401 });
    }

    if (syncToken.userId !== userId) {
      return jsonWithCors({ error: "Token user mismatch" }, { status: 401 });
    }

    // T033: Payload validation
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      return jsonWithCors({ error: "Payload too large (max 50MB)" }, { status: 400 });
    }

    let body: ImportPayload;
    try {
      body = await request.json();
    } catch {
      return jsonWithCors({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Validate payload structure
    if (!body.titles || !Array.isArray(body.titles)) {
      return jsonWithCors({ error: "Missing or invalid titles array" }, { status: 400 });
    }

    // Validate each title has required fields
    for (let i = 0; i < body.titles.length; i++) {
      const title = body.titles[i];
      if (!title.asin || typeof title.asin !== "string") {
        return jsonWithCors(
          { error: `Title at index ${i} missing required field: asin` },
          { status: 400 }
        );
      }
      if (!title.title || typeof title.title !== "string") {
        return jsonWithCors(
          { error: `Title at index ${i} missing required field: title` },
          { status: 400 }
        );
      }
      if (!Array.isArray(title.authors)) {
        return jsonWithCors(
          { error: `Title at index ${i} missing required field: authors (array)` },
          { status: 400 }
        );
      }
      if (!title.source || !["LIBRARY", "WISHLIST"].includes(title.source)) {
        return jsonWithCors(
          { error: `Title at index ${i} missing or invalid source (must be LIBRARY or WISHLIST)` },
          { status: 400 }
        );
      }
      if (!title.dateAdded) {
        return jsonWithCors(
          { error: `Title at index ${i} missing required field: dateAdded` },
          { status: 400 }
        );
      }
    }

    // Mark token as used immediately
    await prisma.syncToken.update({
      where: { jti },
      data: { used: true },
    });

    // Process the import (stores only user-specific data, metadata served by Audnexus)
    const result = await processSyncImport(userId, body.titles);

    // T037: Log sync history
    await prisma.syncHistory.create({
      data: {
        userId,
        titlesImported: result.imported,
        newToCatalog: result.newToCatalog,
        libraryCount: result.libraryCount,
        wishlistCount: result.wishlistCount,
        warnings: result.warnings,
        success: result.warnings.length === 0,
        syncedAt: new Date(),
      },
    });

    // T038: Return success response
    return jsonWithCors({
      success: true,
      imported: result.imported,
      newToCatalog: result.newToCatalog,
      libraryCount: result.libraryCount,
      wishlistCount: result.wishlistCount,
      warnings: result.warnings,
    });
  } catch (error) {
    // T039: Error handling
    console.error("Import error:", error);

    if (error instanceof Error) {
      if (error.message.includes("Payload") || error.message.includes("Invalid")) {
        return jsonWithCors({ error: error.message }, { status: 400 });
      }

      if (error.message.includes("Token") || error.message.includes("Unauthorized")) {
        return jsonWithCors({ error: error.message }, { status: 401 });
      }
    }

    return jsonWithCors({ error: "Internal server error during import" }, { status: 500 });
  }
}
