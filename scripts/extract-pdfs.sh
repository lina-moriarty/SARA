#!/bin/bash
# Extract all PDFs to markdown text files
# Uses pdftotext (poppler-utils)

SOURCES_DIR="$(cd "$(dirname "$0")/../sources" && pwd)"

extract_pdf() {
  local pdf_path="$1"
  local output_dir="$2"
  local filename=$(basename "$pdf_path" .pdf)
  local output_path="$output_dir/${filename}.md"
  
  echo "Extracting: $filename"
  
  # Extract with layout preservation
  pdftotext -layout "$pdf_path" - 2>/dev/null | \
    # Remove excessive blank lines
    sed '/^[[:space:]]*$/N;/^\n$/d' | \
    # Remove page numbers (standalone numbers on a line)
    sed '/^[[:space:]]*[0-9]\{1,3\}[[:space:]]*$/d' > "$output_path"
  
  local lines=$(wc -l < "$output_path")
  echo "  → $output_path ($lines lines)"
}

# Create output directories
mkdir -p "$SOURCES_DIR/text/examenes"
mkdir -p "$SOURCES_DIR/text/parte-general"
mkdir -p "$SOURCES_DIR/text/parte-especifica"

echo "=== Extracting past exams ==="
for pdf in "$SOURCES_DIR/examenes/"*.pdf; do
  [ -f "$pdf" ] && extract_pdf "$pdf" "$SOURCES_DIR/text/examenes"
done

echo ""
echo "=== Extracting parte general ==="
for pdf in "$SOURCES_DIR/parte-general/"*.pdf; do
  [ -f "$pdf" ] && extract_pdf "$pdf" "$SOURCES_DIR/text/parte-general"
done

echo ""
echo "=== Extracting parte específica ==="
for pdf in "$SOURCES_DIR/parte-especifica/"*.pdf; do
  [ -f "$pdf" ] && extract_pdf "$pdf" "$SOURCES_DIR/text/parte-especifica"
done

echo ""
echo "=== Done ==="
echo "Total text files:"
find "$SOURCES_DIR/text" -name "*.md" | wc -l
