import { NextResponse } from "next/server";
import { parseDocument } from "@studybot/utils";
import {
  getSupportedExtensions,
  MAX_FILE_SIZE_MB,
  MAX_TEXT_LENGTH,
} from "@studybot/utils";

const SUPPORTED_EXTENSIONS = getSupportedExtensions();

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > MAX_FILE_SIZE_MB) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE_MB}MB. Current size: ${fileSizeInMB.toFixed(2)}MB`,
        },
        { status: 413 },
      );
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    const hasValidExtension = SUPPORTED_EXTENSIONS.some((ext) =>
      fileName.endsWith(ext),
    );

    if (!hasValidExtension) {
      return NextResponse.json(
        {
          error: `Unsupported file type. Supported formats: ${SUPPORTED_EXTENSIONS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Client sends file as formData; read it as buffer because libraries expect buffers for binary processing
    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    console.log(
      `Processing file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`,
    );

    // Parse document
    let extractedText;
    try {
      extractedText = await parseDocument(buffer, file.name, file.type);
    } catch (parseError) {
      console.error("Document parsing error details:", {
        fileName: file.name,
        fileType: file.type,
        error: parseError.message,
        stack: parseError.stack,
      });
      return NextResponse.json(
        {
          error: `Failed to extract text from document: ${parseError.message}`,
        },
        { status: 400 },
      );
    }

    // Check if document has any content
    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        {
          error:
            "The document appears to be empty or contains no extractable text.",
        },
        { status: 400 },
      );
    }

    // Truncate if too long (to prevent exceeding token limits)
    let wasTruncated = false;
    if (extractedText.length > MAX_TEXT_LENGTH) {
      extractedText =
        extractedText.substring(0, MAX_TEXT_LENGTH) +
        `\n\n[Document truncated - showing first ${MAX_TEXT_LENGTH} characters of ${extractedText.length} total]`;
      wasTruncated = true;
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileType: file.type || "unknown",
      fileSize: file.size,
      extractedText,
      characterCount: extractedText.length,
      wasTruncated,
      message: `Successfully extracted text from ${file.name}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: `Server error: ${error.message}`,
      },
      { status: 500 },
    );
  }
}
