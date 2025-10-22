# Automatic Legal Metadata Extraction

## Overview
The system now automatically extracts and stores legal metadata when PDFs are uploaded through the UI.

## How It Works

### 1. **Upload Flow**
```
User uploads PDF → Collector processes → Server embeds → Metadata extracted automatically
```

### 2. **Extraction Process**
When a PDF is uploaded:
1. Document is processed and vectorized
2. **Automatically** extracts legal metadata in the background
3. Saves to `legal_judgment_metadata` table in PostgreSQL
4. Non-blocking - doesn't slow down upload

### 3. **Metadata Sources (Priority Order)**

#### **A. Embedded PDF Metadata** (Highest Priority)
If your PDF has embedded metadata, it will be extracted automatically:

```
Supported Fields:
- Title / CaseTitle
- CaseNumber / Case Number
- Court / Court Name
- CourtLevel / Court Level
- Jurisdiction
- Petitioner
- Respondent
- CaseType / Case Type
- JudgmentDate / Judgment Date
- FilingDate / Filing Date
- Judges (comma-separated)
- Keywords (comma-separated)
- ActsCited / Acts Cited (comma-separated)
- SectionsCited / Sections Cited (comma-separated)
- ArticlesCited / Articles Cited (comma-separated)
- DecisionType / Decision Type
- Outcome
```

#### **B. Filename Patterns** (Fallback)
Extracts from filename structure:
- Case parties: `PETITIONER-VS-RESPONDENT`
- Case number: `W.P.(C) No. 1022/1989`
- Date: `(DD-MM-YYYY)`
- Case type: From case number prefix

#### **C. Text Content** (Additional)
Extracts from first 5000 characters:
- Court name
- Sections cited (e.g., "Section 14")
- Articles cited (e.g., "Article 21")
- Acts mentioned

### 4. **Adding Metadata to PDFs**

#### **Using Adobe Acrobat:**
1. File → Properties → Custom
2. Add fields like:
   - `CaseNumber`: W.P.(C) No. 1022/1989
   - `Court`: Supreme Court of India
   - `JudgmentDate`: 2024-01-15
   - `Petitioner`: John Doe
   - `Respondent`: State of XYZ

#### **Using Python (exiftool/PyPDF2):**
```python
from PyPDF2 import PdfReader, PdfWriter

reader = PdfReader("input.pdf")
writer = PdfWriter()

# Copy pages
for page in reader.pages:
    writer.add_page(page)

# Add metadata
writer.add_metadata({
    '/Title': 'Case Title',
    '/CaseNumber': 'W.P.(C) No. 1022/1989',
    '/Court': 'Supreme Court of India',
    '/JudgmentDate': '2024-01-15',
    '/Petitioner': 'John Doe',
    '/Respondent': 'State of XYZ',
    '/Keywords': 'constitutional, fundamental rights'
})

with open("output.pdf", "wb") as f:
    writer.write(f)
```

## Database Schema

Metadata is stored in `legal_judgment_metadata` table with:
- Case identification (number, title, type)
- Court information (name, level, jurisdiction)
- Parties (petitioner, respondent)
- Judges (array)
- Dates (filing, judgment)
- Legal citations (acts, sections, articles)
- Decision details (type, outcome)
- Full-text search indexes

## Benefits

1. **Automatic**: No manual data entry required
2. **Fast**: Non-blocking background extraction
3. **Hybrid Search**: Combines vector similarity with metadata filters
4. **Flexible**: Works with embedded metadata, filenames, or text
5. **Scalable**: Indexed for fast querying

## Usage in Hybrid Search

Once metadata is extracted, you can:
- Filter by date ranges
- Search by court names
- Filter by case types
- Search by judges
- Filter by legal provisions (sections, articles)

## Verification

Check if metadata was extracted:
```sql
SELECT case_title, court_name, judgment_date, case_type 
FROM legal_judgment_metadata 
WHERE doc_id = 'your-doc-id';
```

## Troubleshooting

If metadata is not extracted:
1. Check server logs for `[LegalMetadataHook]` messages
2. Verify PDF file is accessible in collector/hotdir
3. Check if metadata already exists (won't re-extract)
4. Manually run: `node server/scripts/extractPdfMetadata.js`

## Future Enhancements

- AI-powered metadata extraction for complex documents
- Batch re-extraction for updated PDFs
- Metadata validation and correction
- Citation network analysis
