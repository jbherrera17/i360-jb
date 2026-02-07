---
name: xlsx
description: "Create, edit, and analyze Excel spreadsheets (.xlsx, .csv). Use when the user needs to: (1) Create new spreadsheets with formulas and formatting, (2) Read or analyze spreadsheet data, (3) Modify existing spreadsheets, (4) Build financial models or data reports, or (5) Export data to Excel format."
---

# Excel Spreadsheet Skill

Create, edit, and analyze Excel spreadsheets using Python with openpyxl and pandas.

## Requirements

**Python Libraries:**
```bash
pip install openpyxl pandas
```

**For Formula Recalculation (optional):**
- LibreOffice installed
- Use `recalc.py` script in this directory

## Core Principle: Use Formulas, Not Hardcoded Values

Always use Excel formulas instead of calculating values in Python. This keeps spreadsheets dynamic and updateable.

### Wrong - Hardcoding Values
```python
total = df['Sales'].sum()
sheet['B10'] = total  # Hardcodes 5000
```

### Correct - Using Formulas
```python
sheet['B10'] = '=SUM(B2:B9)'
```

## Creating Spreadsheets

### Basic Creation with openpyxl
```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

wb = Workbook()
sheet = wb.active
sheet.title = "Data"

# Add headers
headers = ['Name', 'Value', 'Category']
for col, header in enumerate(headers, 1):
    cell = sheet.cell(row=1, column=col, value=header)
    cell.font = Font(bold=True)
    cell.fill = PatternFill('solid', fgColor='366092')
    cell.font = Font(bold=True, color='FFFFFF')

# Add data
data = [
    ['Item A', 100, 'Type 1'],
    ['Item B', 200, 'Type 2'],
]
for row_idx, row_data in enumerate(data, 2):
    for col_idx, value in enumerate(row_data, 1):
        sheet.cell(row=row_idx, column=col_idx, value=value)

# Add formula
sheet['B5'] = '=SUM(B2:B4)'

# Column widths
sheet.column_dimensions['A'].width = 20
sheet.column_dimensions['B'].width = 15

wb.save('output.xlsx')
```

### With pandas (Data Export)
```python
import pandas as pd

df = pd.DataFrame({
    'Name': ['Item A', 'Item B', 'Item C'],
    'Value': [100, 200, 300],
    'Category': ['Type 1', 'Type 2', 'Type 1']
})

df.to_excel('output.xlsx', index=False, sheet_name='Data')
```

## Reading Spreadsheets

### With pandas
```python
import pandas as pd

# Read first sheet
df = pd.read_excel('file.xlsx')

# Read all sheets
all_sheets = pd.read_excel('file.xlsx', sheet_name=None)

# Read specific columns
df = pd.read_excel('file.xlsx', usecols=['A', 'C', 'E'])

# With data types
df = pd.read_excel('file.xlsx', dtype={'id': str})
```

### With openpyxl (Preserves Formulas)
```python
from openpyxl import load_workbook

# Read with formulas
wb = load_workbook('file.xlsx')
sheet = wb.active

# Read calculated values only
wb = load_workbook('file.xlsx', data_only=True)
```

## Editing Spreadsheets

```python
from openpyxl import load_workbook

wb = load_workbook('existing.xlsx')
sheet = wb.active

# Modify cells
sheet['A1'] = 'New Value'

# Insert/delete rows and columns
sheet.insert_rows(2)
sheet.delete_cols(3)

# Add new sheet
new_sheet = wb.create_sheet('NewSheet')
new_sheet['A1'] = 'Data'

wb.save('modified.xlsx')
```

## Formatting Reference

### Fonts
```python
from openpyxl.styles import Font

cell.font = Font(
    name='Calibri',
    size=11,
    bold=True,
    italic=False,
    color='FF0000'  # Red
)
```

### Fills
```python
from openpyxl.styles import PatternFill

cell.fill = PatternFill(
    fill_type='solid',
    fgColor='FFFF00'  # Yellow
)
```

### Alignment
```python
from openpyxl.styles import Alignment

cell.alignment = Alignment(
    horizontal='center',
    vertical='center',
    wrap_text=True
)
```

### Borders
```python
from openpyxl.styles import Border, Side

thin_border = Border(
    left=Side(style='thin'),
    right=Side(style='thin'),
    top=Side(style='thin'),
    bottom=Side(style='thin')
)
cell.border = thin_border
```

### Number Formats
```python
# Currency
cell.number_format = '$#,##0.00'

# Percentage
cell.number_format = '0.0%'

# Date
cell.number_format = 'YYYY-MM-DD'

# Accounting (negatives in parentheses)
cell.number_format = '$#,##0;($#,##0)'
```

## Financial Model Standards

### Color Coding
| Color | Use For |
|-------|---------|
| Blue text (0000FF) | Hardcoded inputs, assumptions |
| Black text (000000) | All formulas and calculations |
| Green text (008000) | Links to other worksheets |
| Yellow fill (FFFF00) | Cells needing attention |

### Number Formatting
- **Years**: Format as text ("2024" not "2,024")
- **Currency**: Include units in headers ("Revenue ($mm)")
- **Zeros**: Display as "-"
- **Negatives**: Use parentheses (123) not minus -123
- **Percentages**: Default 0.0%
- **Multiples**: Format as 0.0x

## Formula Recalculation

Formulas created by openpyxl are not calculated until opened in Excel. Use the `recalc.py` script with LibreOffice:

```bash
python recalc.py output.xlsx
```

Returns JSON with any formula errors found.

## Common Excel Formulas

```python
# Sum
sheet['B10'] = '=SUM(B2:B9)'

# Average
sheet['B11'] = '=AVERAGE(B2:B9)'

# Count
sheet['B12'] = '=COUNT(B2:B9)'

# If statement
sheet['C2'] = '=IF(B2>100,"High","Low")'

# VLookup
sheet['D2'] = '=VLOOKUP(A2,Sheet2!A:B,2,FALSE)'

# Percentage change
sheet['C3'] = '=(B3-B2)/B2'

# Cross-sheet reference
sheet['A1'] = '=Sheet2!A1'
```

## Error Prevention Checklist

- [ ] Verify cell references before applying formulas
- [ ] Check for division by zero in formulas
- [ ] Test formulas on 2-3 cells before applying broadly
- [ ] Ensure all referenced cells exist
- [ ] Use absolute references ($A$1) when copying formulas
- [ ] Handle empty cells appropriately

## Workflow

1. **Choose tool**: pandas for data analysis, openpyxl for formulas/formatting
2. **Create/Load**: New workbook or load existing
3. **Modify**: Add data, formulas, formatting
4. **Save**: Write to file
5. **Recalculate** (if using formulas): Run recalc.py
6. **Verify**: Check for formula errors
