/**
 * Extract text from PDF file using unpdf (server-side compatible) This is being used in the upload route
 */
export async function parsePDF(buffer) {
  try {
    const { extractText } = await import("unpdf");

    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(buffer);

    // Extract text from PDF - returns { totalPages, text } where text is an array
    const result = await extractText(uint8Array);

    // text can be an array of strings (one per page) or a single string
    const text = Array.isArray(result.text)
      ? result.text.join("\n\n")
      : String(result.text || "");

    return text.trim();
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Extract text from Word documents (.docx, .doc)
 */
export async function parseWord(buffer) {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    throw new Error(`Failed to parse Word document: ${error.message}`);
  }
}

/**
 * Extract text from Excel spreadsheets (.xlsx, .xls)
 */
export async function parseExcel(buffer) {
  try {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    let text = "";

    workbook.worksheets.forEach((worksheet) => {
      text += `\n--- Sheet: ${worksheet.name} ---\n`;

      worksheet.eachRow((row) => {
        const rowValues = [];
        row.eachCell((cell) => {
          if (cell.value !== null && cell.value !== undefined) {
            rowValues.push(String(cell.value));
          }
        });
        if (rowValues.length > 0) {
          text += rowValues.join(" | ") + "\n";
        }
      });
    });

    return text.trim();
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}

/**
 * Extract text from PowerPoint presentations (.pptx)
 */
export async function parsePowerPoint(buffer) {
  try {
    const { parseOfficeAsync } = await import("officeparser");
    const data = await parseOfficeAsync(buffer);
    return data;
  } catch (error) {
    throw new Error(`Failed to parse PowerPoint: ${error.message}`);
  }
}

/**
 * Extract text from Markdown files (.md)
 */
export function parseMarkdown(buffer) {
  try {
    return buffer.toString("utf-8");
  } catch (error) {
    throw new Error(`Failed to parse Markdown: ${error.message}`);
  }
}

/**
 * Extract text from plain text files (.txt)
 */
export function parseText(buffer) {
  try {
    return buffer.toString("utf-8");
  } catch (error) {
    throw new Error(`Failed to parse text file: ${error.message}`);
  }
}

/**
 * Main document parser - routes to appropriate parser based on file type
 */
export async function parseDocument(buffer, fileName, mimeType) {
  const extension = fileName.toLowerCase().split(".").pop();

  switch (extension) {
    case "pdf":
      return await parsePDF(buffer);

    case "docx":
    case "doc":
      return await parseWord(buffer);

    case "xlsx":
    case "xls":
      return await parseExcel(buffer);

    case "pptx":
    case "ppt":
      return await parsePowerPoint(buffer);

    case "md":
      return parseMarkdown(buffer);

    case "txt":
      return parseText(buffer);

    default:
      throw new Error(
        `Unsupported file type: .${extension}. Supported types: PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), Markdown (.md), Text (.txt)`,
      );
  }
}

/**
 * Get supported file extensions
 */
export function getSupportedExtensions() {
  return [
    ".pdf",
    ".docx",
    ".doc",
    ".xlsx",
    ".xls",
    ".pptx",
    ".ppt",
    ".md",
    ".txt",
  ];
}

/**
 * Validate file size (in bytes)
 */
export function validateFileSize(fileSize, maxSizeInMB = 10) {
  const maxBytes = maxSizeInMB * 1024 * 1024;
  if (fileSize > maxBytes) {
    throw new Error(
      `File size exceeds maximum allowed size of ${maxSizeInMB}MB`,
    );
  }
  return true;
}
