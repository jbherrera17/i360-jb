from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, numbers
from openpyxl.utils import get_column_letter

wb = Workbook()

BLUE = Font(color="0000FF")
BLACK_BOLD = Font(bold=True)
HEADER_FONT = Font(bold=True, color="FFFFFF", size=11)
TITLE_FONT = Font(bold=True, size=14, color="1A1A2E")
SECTION_FONT = Font(bold=True, size=12, color="16213E")
HEADER_FILL = PatternFill("solid", fgColor="1A1A2E")
SECTION_FILL = PatternFill("solid", fgColor="E8EAF6")
INPUT_FILL = PatternFill("solid", fgColor="FFF9C4")
TOTAL_FILL = PatternFill("solid", fgColor="C8E6C9")
CENTER = Alignment(horizontal="center", vertical="center")
LEFT = Alignment(horizontal="left", vertical="center")
THIN_BORDER = Border(
    left=Side(style="thin"), right=Side(style="thin"),
    top=Side(style="thin"), bottom=Side(style="thin")
)
USD = '#,##0'
USD_DEC = '#,##0.00'
PCT = '0.0%'
INT = '#,##0'

def style_range(ws, row, col_start, col_end, font=None, fill=None, alignment=None, number_format=None, border=None):
    for c in range(col_start, col_end + 1):
        cell = ws.cell(row=row, column=c)
        if font: cell.font = font
        if fill: cell.fill = fill
        if alignment: cell.alignment = alignment
        if number_format: cell.number_format = number_format
        if border: cell.border = border

months = ["Month 1","Month 2","Month 3","Month 4","Month 5","Month 6",
          "Month 7","Month 8","Month 9","Month 10","Month 11","Month 12"]

# ============================================================
# SHEET 1: Agency-Led Growth (Motion A)
# ============================================================
ws1 = wb.active
ws1.title = "Agency-Led Growth"
ws1.sheet_properties.tabColor = "1A1A2E"

r = 1
ws1.cell(r, 1, "MOTION A: AGENCY-LED GROWTH MODEL").font = TITLE_FONT
r = 2
ws1.cell(r, 1, "Insight 360 Go-to-Market — Month-by-Month Projections (Year 1)").font = Font(italic=True, color="666666")

# Assumptions section
r = 4
ws1.cell(r, 1, "ASSUMPTIONS").font = SECTION_FONT
ws1.merge_cells(start_row=r, start_column=1, end_row=r, end_column=3)
style_range(ws1, r, 1, 14, fill=SECTION_FILL)

assumptions_a = [
    ("Agency base price (monthly)", 499, USD),
    ("Avg integration add-ons per agency", 200, USD),
    ("Avg clients per agency (ramping)", "", ""),
    ("Avg revenue per client (monthly)", 3000, USD),
    ("Agency churn rate (monthly)", 0.02, PCT),
    ("New agencies per month (soft launch M1-2)", 5, INT),
    ("New agencies per month (post-launch M3-6)", 8, INT),
    ("New agencies per month (scale M7-12)", 12, INT),
    ("Certification revenue per new agency", 1500, USD),
    ("Implementation revenue per new agency", 8000, USD),
]

for i, (label, val, fmt) in enumerate(assumptions_a):
    row = r + 1 + i
    ws1.cell(row, 1, label).font = BLACK_BOLD
    ws1.cell(row, 1).alignment = LEFT
    if val != "":
        c = ws1.cell(row, 2, val)
        c.font = BLUE
        c.fill = INPUT_FILL
        if fmt: c.number_format = fmt

# Data table
r = 16
ws1.cell(r, 1, "MONTHLY PROJECTIONS").font = SECTION_FONT
style_range(ws1, r, 1, 14, fill=SECTION_FILL)

headers = ["Metric"] + months + ["TOTAL Y1"]
r = 17
for c, h in enumerate(headers, 1):
    cell = ws1.cell(r, c, h)
    cell.font = HEADER_FONT
    cell.fill = HEADER_FILL
    cell.alignment = CENTER
    cell.border = THIN_BORDER

metrics = [
    "New Agencies Signed",
    "Cumulative Agencies (net churn)",
    "Platform MRR (agencies)",
    "Integration Add-On MRR",
    "Total Platform MRR",
    "",
    "Avg Clients per Agency (ramping)",
    "Total Client Engagements",
    "Avg Client Revenue to Agency",
    "Total Agency Client Revenue (ecosystem)",
    "",
    "Certification Revenue",
    "Implementation Revenue",
    "Total Services Revenue",
    "",
    "i360 Recurring Revenue (MRR)",
    "i360 Services Revenue",
    "i360 Total Monthly Revenue",
    "i360 Cumulative Revenue",
]

# New agencies per month: M1-2=5, M3-6=8, M7-12=12
new_agencies = [5, 5, 8, 8, 8, 8, 12, 12, 12, 12, 12, 12]
# Avg clients ramp: starts at 3, grows to ~20
avg_clients = [3, 5, 7, 9, 11, 13, 15, 16, 17, 18, 19, 20]

for i, metric in enumerate(metrics):
    row = r + 1 + i
    ws1.cell(row, 1, metric).font = BLACK_BOLD if metric else None
    ws1.cell(row, 1).border = THIN_BORDER

    if not metric:
        continue

    for m in range(12):
        col = m + 2
        cell = ws1.cell(row, col)
        cell.border = THIN_BORDER
        cell.alignment = CENTER

    # Total column
    ws1.cell(row, 14).border = THIN_BORDER
    ws1.cell(row, 14).alignment = CENTER

# Fill formulas row by row
base_row = 18

# Row 0: New Agencies Signed
for m in range(12):
    ws1.cell(base_row, m+2, new_agencies[m]).font = BLUE
    ws1.cell(base_row, m+2).number_format = INT
ws1.cell(base_row, 14, f'=SUM(B{base_row}:M{base_row})')
ws1.cell(base_row, 14).number_format = INT
style_range(ws1, base_row, 2, 14, border=THIN_BORDER)

# Row 1: Cumulative Agencies (net churn)
cr = base_row + 1
ws1.cell(cr, 2, f'=B{base_row}').number_format = INT
for m in range(1, 12):
    col = m + 2
    prev = get_column_letter(col - 1)
    cur = get_column_letter(col)
    ws1.cell(cr, col, f'=ROUND({prev}{cr}*(1-$B$9)+{cur}{base_row},0)').number_format = INT
ws1.cell(cr, 14, f'=M{cr}').number_format = INT
style_range(ws1, cr, 2, 14, border=THIN_BORDER)

# Row 2: Platform MRR
pr = base_row + 2
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws1.cell(pr, col, f'={cl}{cr}*$B$5').number_format = USD
ws1.cell(pr, 14, f'=SUM(B{pr}:M{pr})').number_format = USD
style_range(ws1, pr, 2, 14, border=THIN_BORDER)

# Row 3: Integration Add-On MRR
ir = base_row + 3
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws1.cell(ir, col, f'={cl}{cr}*$B$6').number_format = USD
ws1.cell(ir, 14, f'=SUM(B{ir}:M{ir})').number_format = USD
style_range(ws1, ir, 2, 14, border=THIN_BORDER)

# Row 4: Total Platform MRR
tr = base_row + 4
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws1.cell(tr, col, f'={cl}{pr}+{cl}{ir}').number_format = USD
style_range(ws1, tr, 2, 14, fill=TOTAL_FILL, border=THIN_BORDER)
ws1.cell(tr, 14, f'=SUM(B{tr}:M{tr})').number_format = USD

# Skip row (blank)
# Row 6: Avg Clients per Agency
acr = base_row + 6
for m in range(12):
    ws1.cell(acr, m+2, avg_clients[m]).font = BLUE
    ws1.cell(acr, m+2).number_format = INT
style_range(ws1, acr, 2, 14, border=THIN_BORDER)

# Row 7: Total Client Engagements
tcr = base_row + 7
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws1.cell(tcr, col, f'={cl}{cr}*{cl}{acr}').number_format = INT
ws1.cell(tcr, 14, f'=M{tcr}').number_format = INT
style_range(ws1, tcr, 2, 14, border=THIN_BORDER)

# Row 8: Avg Client Revenue to Agency
avr = base_row + 8
for m in range(12):
    ws1.cell(avr, m+2, f'=$B$8').number_format = USD
style_range(ws1, avr, 2, 14, border=THIN_BORDER)

# Row 9: Total Agency Client Revenue (ecosystem)
ecr = base_row + 9
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws1.cell(ecr, col, f'={cl}{tcr}*{cl}{avr}').number_format = USD
ws1.cell(ecr, 14, f'=SUM(B{ecr}:M{ecr})').number_format = USD
style_range(ws1, ecr, 2, 14, border=THIN_BORDER)

# Skip row
# Row 11: Certification Revenue
cer = base_row + 11
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws1.cell(cer, col, f'={cl}{base_row}*$B$13').number_format = USD
ws1.cell(cer, 14, f'=SUM(B{cer}:M{cer})').number_format = USD
style_range(ws1, cer, 2, 14, border=THIN_BORDER)

# Row 12: Implementation Revenue
imr = base_row + 12
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws1.cell(imr, col, f'={cl}{base_row}*$B$14').number_format = USD
ws1.cell(imr, 14, f'=SUM(B{imr}:M{imr})').number_format = USD
style_range(ws1, imr, 2, 14, border=THIN_BORDER)

# Row 13: Total Services Revenue
tsr = base_row + 13
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws1.cell(tsr, col, f'={cl}{cer}+{cl}{imr}').number_format = USD
style_range(ws1, tsr, 2, 14, fill=TOTAL_FILL, border=THIN_BORDER)
ws1.cell(tsr, 14, f'=SUM(B{tsr}:M{tsr})').number_format = USD

# Skip row
# Row 15: i360 Recurring Revenue (MRR)
rr = base_row + 15
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws1.cell(rr, col, f'={cl}{tr}').number_format = USD
style_range(ws1, rr, 2, 14, border=THIN_BORDER)
ws1.cell(rr, 14, f'=SUM(B{rr}:M{rr})').number_format = USD

# Row 16: i360 Services Revenue
sr = base_row + 16
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws1.cell(sr, col, f'={cl}{tsr}').number_format = USD
style_range(ws1, sr, 2, 14, border=THIN_BORDER)
ws1.cell(sr, 14, f'=SUM(B{sr}:M{sr})').number_format = USD

# Row 17: i360 Total Monthly Revenue
tmr = base_row + 17
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws1.cell(tmr, col, f'={cl}{rr}+{cl}{sr}').number_format = USD
style_range(ws1, tmr, 2, 14, fill=TOTAL_FILL, border=THIN_BORDER)
ws1.cell(tmr, 14, f'=SUM(B{tmr}:M{tmr})').number_format = USD

# Row 18: Cumulative Revenue
cum = base_row + 18
ws1.cell(cum, 2, f'=B{tmr}').number_format = USD
for m in range(1, 12):
    col = m + 2
    prev = get_column_letter(col - 1)
    cl = get_column_letter(col)
    ws1.cell(cum, col, f'={prev}{cum}+{cl}{tmr}').number_format = USD
ws1.cell(cum, 14, f'=M{cum}').number_format = USD
style_range(ws1, cum, 2, 14, fill=TOTAL_FILL, border=THIN_BORDER)

# Column widths
ws1.column_dimensions['A'].width = 38
for c in range(2, 15):
    ws1.column_dimensions[get_column_letter(c)].width = 14

# ============================================================
# SHEET 2: Content-Led Growth (Motion B)
# ============================================================
ws2 = wb.create_sheet("Content-Led Growth")
ws2.sheet_properties.tabColor = "0D47A1"

r = 1
ws2.cell(r, 1, "MOTION B: CONTENT-LED GROWTH MODEL").font = TITLE_FONT
r = 2
ws2.cell(r, 1, "Self-Serve Starter + Business Tier Acquisition (Year 1)").font = Font(italic=True, color="666666")

r = 4
ws2.cell(r, 1, "ASSUMPTIONS").font = SECTION_FONT
style_range(ws2, r, 1, 14, fill=SECTION_FILL)

assumptions_b = [
    ("Starter monthly price", 299, USD),
    ("Business monthly price", 999, USD),
    ("Monthly website visitors (starting)", 2000, INT),
    ("Visitor growth rate (monthly)", 0.15, PCT),
    ("Trial conversion rate (visitor→trial)", 0.04, PCT),
    ("Trial→Starter conversion", 0.25, PCT),
    ("Starter→Business upgrade rate (monthly)", 0.08, PCT),
    ("Starter churn (monthly)", 0.05, PCT),
    ("Business churn (monthly)", 0.03, PCT),
    ("Content marketing spend (monthly)", 5000, USD),
    ("Paid acquisition spend (monthly, from M3)", 3000, USD),
]

for i, (label, val, fmt) in enumerate(assumptions_b):
    row = r + 1 + i
    ws2.cell(row, 1, label).font = BLACK_BOLD
    if val != "":
        c = ws2.cell(row, 2, val)
        c.font = BLUE
        c.fill = INPUT_FILL
        if fmt: c.number_format = fmt

r = 17
ws2.cell(r, 1, "MONTHLY PROJECTIONS").font = SECTION_FONT
style_range(ws2, r, 1, 14, fill=SECTION_FILL)

r = 18
headers2 = ["Metric"] + months + ["TOTAL Y1"]
for c, h in enumerate(headers2, 1):
    cell = ws2.cell(r, c, h)
    cell.font = HEADER_FONT
    cell.fill = HEADER_FILL
    cell.alignment = CENTER
    cell.border = THIN_BORDER

metrics_b = [
    "Website Visitors",
    "New Trials",
    "New Starter Customers",
    "Starter→Business Upgrades",
    "",
    "Cumulative Starter (net churn & upgrades)",
    "Cumulative Business (net churn)",
    "Total Customers",
    "",
    "Starter MRR",
    "Business MRR",
    "Total MRR",
    "",
    "Marketing Spend",
    "CAC (per new customer)",
    "MRR - Marketing Spend",
    "Cumulative Revenue",
    "Cumulative Marketing Spend",
]

br = 19
for i, metric in enumerate(metrics_b):
    row = br + i
    ws2.cell(row, 1, metric).font = BLACK_BOLD if metric else None
    ws2.cell(row, 1).border = THIN_BORDER
    for m in range(12):
        ws2.cell(row, m+2).border = THIN_BORDER
        ws2.cell(row, m+2).alignment = CENTER
    ws2.cell(row, 14).border = THIN_BORDER
    ws2.cell(row, 14).alignment = CENTER

# Row 0: Website Visitors
vr = br
ws2.cell(vr, 2, f'=$B$7').number_format = INT
for m in range(1, 12):
    col = m + 2
    prev = get_column_letter(col - 1)
    ws2.cell(vr, col, f'=ROUND({prev}{vr}*(1+$B$8),0)').number_format = INT
ws2.cell(vr, 14, f'=SUM(B{vr}:M{vr})').number_format = INT
style_range(ws2, vr, 2, 14, border=THIN_BORDER)

# Row 1: New Trials
ntr = br + 1
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws2.cell(ntr, col, f'=ROUND({cl}{vr}*$B$9,0)').number_format = INT
ws2.cell(ntr, 14, f'=SUM(B{ntr}:M{ntr})').number_format = INT
style_range(ws2, ntr, 2, 14, border=THIN_BORDER)

# Row 2: New Starter Customers
nsr = br + 2
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws2.cell(nsr, col, f'=ROUND({cl}{ntr}*$B$10,0)').number_format = INT
ws2.cell(nsr, 14, f'=SUM(B{nsr}:M{nsr})').number_format = INT
style_range(ws2, nsr, 2, 14, border=THIN_BORDER)

# Row 3: Starter→Business Upgrades
upr = br + 3
ws2.cell(upr, 2, 0).number_format = INT
for m in range(1, 12):
    col = m + 2
    prev = get_column_letter(col - 1)
    # upgrades from previous month's cumulative starters
    csr = br + 5
    ws2.cell(upr, col, f'=ROUND({prev}{csr}*$B$11,0)').number_format = INT
ws2.cell(upr, 14, f'=SUM(B{upr}:M{upr})').number_format = INT
style_range(ws2, upr, 2, 14, border=THIN_BORDER)

# Skip row
# Row 5: Cumulative Starter (net churn & upgrades)
csr = br + 5
ws2.cell(csr, 2, f'=B{nsr}').number_format = INT
for m in range(1, 12):
    col = m + 2
    prev = get_column_letter(col - 1)
    cl = get_column_letter(col)
    ws2.cell(csr, col, f'=MAX(ROUND({prev}{csr}*(1-$B$12)-{cl}{upr}+{cl}{nsr},0),0)').number_format = INT
ws2.cell(csr, 14, f'=M{csr}').number_format = INT
style_range(ws2, csr, 2, 14, border=THIN_BORDER)

# Row 6: Cumulative Business
cbr = br + 6
ws2.cell(cbr, 2, f'=B{upr}').number_format = INT
for m in range(1, 12):
    col = m + 2
    prev = get_column_letter(col - 1)
    cl = get_column_letter(col)
    ws2.cell(cbr, col, f'=ROUND({prev}{cbr}*(1-$B$13)+{cl}{upr},0)').number_format = INT
ws2.cell(cbr, 14, f'=M{cbr}').number_format = INT
style_range(ws2, cbr, 2, 14, border=THIN_BORDER)

# Row 7: Total Customers
tcr2 = br + 7
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws2.cell(tcr2, col, f'={cl}{csr}+{cl}{cbr}').number_format = INT
style_range(ws2, tcr2, 2, 14, fill=TOTAL_FILL, border=THIN_BORDER)
ws2.cell(tcr2, 14, f'=M{tcr2}').number_format = INT

# Skip row
# Row 9: Starter MRR
smr = br + 9
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws2.cell(smr, col, f'={cl}{csr}*$B$5').number_format = USD
ws2.cell(smr, 14, f'=SUM(B{smr}:M{smr})').number_format = USD
style_range(ws2, smr, 2, 14, border=THIN_BORDER)

# Row 10: Business MRR
bmr = br + 10
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws2.cell(bmr, col, f'={cl}{cbr}*$B$6').number_format = USD
ws2.cell(bmr, 14, f'=SUM(B{bmr}:M{bmr})').number_format = USD
style_range(ws2, bmr, 2, 14, border=THIN_BORDER)

# Row 11: Total MRR
tmr2 = br + 11
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws2.cell(tmr2, col, f'={cl}{smr}+{cl}{bmr}').number_format = USD
style_range(ws2, tmr2, 2, 14, fill=TOTAL_FILL, border=THIN_BORDER)
ws2.cell(tmr2, 14, f'=SUM(B{tmr2}:M{tmr2})').number_format = USD

# Skip row
# Row 13: Marketing Spend
msr = br + 13
for m in range(12):
    col = m + 2
    if m < 2:
        ws2.cell(msr, col, f'=$B$14').number_format = USD
    else:
        ws2.cell(msr, col, f'=$B$14+$B$15').number_format = USD
ws2.cell(msr, 14, f'=SUM(B{msr}:M{msr})').number_format = USD
style_range(ws2, msr, 2, 14, border=THIN_BORDER)

# Row 14: CAC
cacr = br + 14
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws2.cell(cacr, col, f'=IF({cl}{nsr}+{cl}{upr}>0,{cl}{msr}/({cl}{nsr}+{cl}{upr}),0)').number_format = USD
ws2.cell(cacr, 14, f'=IF(N{nsr}+N{upr}>0,N{msr}/(N{nsr}+N{upr}),0)').number_format = USD
style_range(ws2, cacr, 2, 14, border=THIN_BORDER)

# Row 15: MRR - Marketing
nmr = br + 15
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws2.cell(nmr, col, f'={cl}{tmr2}-{cl}{msr}').number_format = USD
style_range(ws2, nmr, 2, 14, border=THIN_BORDER)
ws2.cell(nmr, 14, f'=SUM(B{nmr}:M{nmr})').number_format = USD

# Row 16: Cumulative Revenue
cumr2 = br + 16
ws2.cell(cumr2, 2, f'=B{tmr2}').number_format = USD
for m in range(1, 12):
    col = m + 2
    prev = get_column_letter(col - 1)
    cl = get_column_letter(col)
    ws2.cell(cumr2, col, f'={prev}{cumr2}+{cl}{tmr2}').number_format = USD
ws2.cell(cumr2, 14, f'=M{cumr2}').number_format = USD
style_range(ws2, cumr2, 2, 14, fill=TOTAL_FILL, border=THIN_BORDER)

# Row 17: Cumulative Marketing Spend
cmsr = br + 17
ws2.cell(cmsr, 2, f'=B{msr}').number_format = USD
for m in range(1, 12):
    col = m + 2
    prev = get_column_letter(col - 1)
    cl = get_column_letter(col)
    ws2.cell(cmsr, col, f'={prev}{cmsr}+{cl}{msr}').number_format = USD
ws2.cell(cmsr, 14, f'=M{cmsr}').number_format = USD
style_range(ws2, cmsr, 2, 14, border=THIN_BORDER)

ws2.column_dimensions['A'].width = 42
for c in range(2, 15):
    ws2.column_dimensions[get_column_letter(c)].width = 14

# ============================================================
# SHEET 3: Partner-Enabled Enterprise (Motion C)
# ============================================================
ws3 = wb.create_sheet("Partner-Enabled Enterprise")
ws3.sheet_properties.tabColor = "1B5E20"

r = 1
ws3.cell(r, 1, "MOTION C: PARTNER-ENABLED ENTERPRISE GROWTH MODEL").font = TITLE_FONT
r = 2
ws3.cell(r, 1, "Partner Channel + Enterprise Direct (Year 1)").font = Font(italic=True, color="666666")

r = 4
ws3.cell(r, 1, "ASSUMPTIONS").font = SECTION_FONT
style_range(ws3, r, 1, 14, fill=SECTION_FILL)

assumptions_c = [
    ("Enterprise avg monthly deal value", 3500, USD),
    ("Partner-sourced avg monthly deal value", 1667, USD),
    ("New partners signed per month (M1-3)", 3, INT),
    ("New partners signed per month (M4-12)", 5, INT),
    ("Deals per active partner per quarter", 1, "0.0"),
    ("Enterprise direct deals per month (M4+)", 1, INT),
    ("Partner margin (% of deal)", 0.28, PCT),
    ("i360 net revenue (% of partner deal)", 0.72, PCT),
    ("Enterprise churn (monthly)", 0.015, PCT),
    ("Partner churn (monthly)", 0.04, PCT),
    ("Partner enablement cost per partner", 2000, USD),
    ("Enterprise sales cost per deal", 5000, USD),
]

for i, (label, val, fmt) in enumerate(assumptions_c):
    row = r + 1 + i
    ws3.cell(row, 1, label).font = BLACK_BOLD
    if val != "":
        c = ws3.cell(row, 2, val)
        c.font = BLUE
        c.fill = INPUT_FILL
        if fmt: c.number_format = fmt

r = 18
ws3.cell(r, 1, "MONTHLY PROJECTIONS").font = SECTION_FONT
style_range(ws3, r, 1, 14, fill=SECTION_FILL)

r = 19
for c, h in enumerate(headers, 1):
    cell = ws3.cell(r, c, h)
    cell.font = HEADER_FONT
    cell.fill = HEADER_FILL
    cell.alignment = CENTER
    cell.border = THIN_BORDER

metrics_c = [
    "New Partners Signed",
    "Cumulative Active Partners",
    "New Partner-Sourced Deals",
    "New Enterprise Direct Deals",
    "Total New Deals",
    "",
    "Cumulative Partner Customers (net churn)",
    "Cumulative Enterprise Customers (net churn)",
    "Total Active Customers",
    "",
    "Partner-Sourced MRR (i360 net)",
    "Enterprise Direct MRR",
    "Total MRR",
    "",
    "Partner Enablement Costs",
    "Enterprise Sales Costs",
    "Total Channel Costs",
    "Net MRR (after channel costs)",
    "Cumulative Revenue",
]

cr = 20
for i, metric in enumerate(metrics_c):
    row = cr + i
    ws3.cell(row, 1, metric).font = BLACK_BOLD if metric else None
    ws3.cell(row, 1).border = THIN_BORDER
    for m in range(12):
        ws3.cell(row, m+2).border = THIN_BORDER
        ws3.cell(row, m+2).alignment = CENTER
    ws3.cell(row, 14).border = THIN_BORDER
    ws3.cell(row, 14).alignment = CENTER

# New Partners: M1-3=3, M4+=5
new_partners = [3, 3, 3, 5, 5, 5, 5, 5, 5, 5, 5, 5]
# Enterprise direct: 0 for M1-3, then 1/mo
ent_direct = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2]

# Row 0: New Partners
npr = cr
for m in range(12):
    ws3.cell(npr, m+2, new_partners[m]).font = BLUE
    ws3.cell(npr, m+2).number_format = INT
ws3.cell(npr, 14, f'=SUM(B{npr}:M{npr})').number_format = INT
style_range(ws3, npr, 2, 14, border=THIN_BORDER)

# Row 1: Cumulative Active Partners
capr = cr + 1
ws3.cell(capr, 2, f'=B{npr}').number_format = INT
for m in range(1, 12):
    col = m + 2
    prev = get_column_letter(col - 1)
    cl = get_column_letter(col)
    ws3.cell(capr, col, f'=ROUND({prev}{capr}*(1-$B$14)+{cl}{npr},0)').number_format = INT
ws3.cell(capr, 14, f'=M{capr}').number_format = INT
style_range(ws3, capr, 2, 14, border=THIN_BORDER)

# Row 2: New Partner-Sourced Deals (deals per partner per quarter / 3 = monthly)
npdr = cr + 2
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws3.cell(npdr, col, f'=ROUND({cl}{capr}*$B$9/3,0)').number_format = INT
ws3.cell(npdr, 14, f'=SUM(B{npdr}:M{npdr})').number_format = INT
style_range(ws3, npdr, 2, 14, border=THIN_BORDER)

# Row 3: New Enterprise Direct Deals
nedr = cr + 3
for m in range(12):
    ws3.cell(nedr, m+2, ent_direct[m]).font = BLUE
    ws3.cell(nedr, m+2).number_format = INT
ws3.cell(nedr, 14, f'=SUM(B{nedr}:M{nedr})').number_format = INT
style_range(ws3, nedr, 2, 14, border=THIN_BORDER)

# Row 4: Total New Deals
tndr = cr + 4
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws3.cell(tndr, col, f'={cl}{npdr}+{cl}{nedr}').number_format = INT
style_range(ws3, tndr, 2, 14, fill=TOTAL_FILL, border=THIN_BORDER)
ws3.cell(tndr, 14, f'=SUM(B{tndr}:M{tndr})').number_format = INT

# Skip
# Row 6: Cumulative Partner Customers
cpcr = cr + 6
ws3.cell(cpcr, 2, f'=B{npdr}').number_format = INT
for m in range(1, 12):
    col = m + 2
    prev = get_column_letter(col - 1)
    cl = get_column_letter(col)
    ws3.cell(cpcr, col, f'=ROUND({prev}{cpcr}*(1-$B$13)+{cl}{npdr},0)').number_format = INT
ws3.cell(cpcr, 14, f'=M{cpcr}').number_format = INT
style_range(ws3, cpcr, 2, 14, border=THIN_BORDER)

# Row 7: Cumulative Enterprise Customers
cecr = cr + 7
ws3.cell(cecr, 2, f'=B{nedr}').number_format = INT
for m in range(1, 12):
    col = m + 2
    prev = get_column_letter(col - 1)
    cl = get_column_letter(col)
    ws3.cell(cecr, col, f'=ROUND({prev}{cecr}*(1-$B$13)+{cl}{nedr},0)').number_format = INT
ws3.cell(cecr, 14, f'=M{cecr}').number_format = INT
style_range(ws3, cecr, 2, 14, border=THIN_BORDER)

# Row 8: Total Active Customers
tacr = cr + 8
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws3.cell(tacr, col, f'={cl}{cpcr}+{cl}{cecr}').number_format = INT
style_range(ws3, tacr, 2, 14, fill=TOTAL_FILL, border=THIN_BORDER)
ws3.cell(tacr, 14, f'=M{tacr}').number_format = INT

# Skip
# Row 10: Partner-Sourced MRR (i360 net)
psmr = cr + 10
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws3.cell(psmr, col, f'={cl}{cpcr}*$B$6*$B$12').number_format = USD
ws3.cell(psmr, 14, f'=SUM(B{psmr}:M{psmr})').number_format = USD
style_range(ws3, psmr, 2, 14, border=THIN_BORDER)

# Row 11: Enterprise Direct MRR
edmr = cr + 11
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws3.cell(edmr, col, f'={cl}{cecr}*$B$5').number_format = USD
ws3.cell(edmr, 14, f'=SUM(B{edmr}:M{edmr})').number_format = USD
style_range(ws3, edmr, 2, 14, border=THIN_BORDER)

# Row 12: Total MRR
tmr3 = cr + 12
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws3.cell(tmr3, col, f'={cl}{psmr}+{cl}{edmr}').number_format = USD
style_range(ws3, tmr3, 2, 14, fill=TOTAL_FILL, border=THIN_BORDER)
ws3.cell(tmr3, 14, f'=SUM(B{tmr3}:M{tmr3})').number_format = USD

# Skip
# Row 14: Partner Enablement Costs
pecr = cr + 14
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws3.cell(pecr, col, f'={cl}{npr}*$B$15').number_format = USD
ws3.cell(pecr, 14, f'=SUM(B{pecr}:M{pecr})').number_format = USD
style_range(ws3, pecr, 2, 14, border=THIN_BORDER)

# Row 15: Enterprise Sales Costs
escr = cr + 15
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws3.cell(escr, col, f'={cl}{nedr}*$B$16').number_format = USD
ws3.cell(escr, 14, f'=SUM(B{escr}:M{escr})').number_format = USD
style_range(ws3, escr, 2, 14, border=THIN_BORDER)

# Row 16: Total Channel Costs
tccr = cr + 16
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws3.cell(tccr, col, f'={cl}{pecr}+{cl}{escr}').number_format = USD
style_range(ws3, tccr, 2, 14, border=THIN_BORDER)
ws3.cell(tccr, 14, f'=SUM(B{tccr}:M{tccr})').number_format = USD

# Row 17: Net MRR
netmr = cr + 17
for m in range(12):
    col = m + 2
    cl = get_column_letter(col)
    ws3.cell(netmr, col, f'={cl}{tmr3}-{cl}{tccr}').number_format = USD
style_range(ws3, netmr, 2, 14, border=THIN_BORDER)
ws3.cell(netmr, 14, f'=SUM(B{netmr}:M{netmr})').number_format = USD

# Row 18: Cumulative Revenue
cumr3 = cr + 18
ws3.cell(cumr3, 2, f'=B{tmr3}').number_format = USD
for m in range(1, 12):
    col = m + 2
    prev = get_column_letter(col - 1)
    cl = get_column_letter(col)
    ws3.cell(cumr3, col, f'={prev}{cumr3}+{cl}{tmr3}').number_format = USD
ws3.cell(cumr3, 14, f'=M{cumr3}').number_format = USD
style_range(ws3, cumr3, 2, 14, fill=TOTAL_FILL, border=THIN_BORDER)

ws3.column_dimensions['A'].width = 44
for c in range(2, 15):
    ws3.column_dimensions[get_column_letter(c)].width = 14

# ============================================================
# SHEET 4: Combined Summary
# ============================================================
ws4 = wb.create_sheet("Combined Summary")
ws4.sheet_properties.tabColor = "E65100"

r = 1
ws4.cell(r, 1, "COMBINED GTM REVENUE SUMMARY").font = TITLE_FONT
r = 2
ws4.cell(r, 1, "All Three Motions — Year 1 Month-by-Month").font = Font(italic=True, color="666666")

r = 4
for c, h in enumerate(headers, 1):
    cell = ws4.cell(r, c, h)
    cell.font = HEADER_FONT
    cell.fill = HEADER_FILL
    cell.alignment = CENTER
    cell.border = THIN_BORDER

summary_metrics = [
    "Motion A: Agency MRR",
    "Motion B: Content-Led MRR",
    "Motion C: Partner/Enterprise MRR",
    "TOTAL MRR (all motions)",
    "",
    "Motion A: Agency Services Revenue",
    "Motion B: Marketing Spend",
    "Motion C: Channel Costs",
    "",
    "Motion A: Cumulative Revenue",
    "Motion B: Cumulative Revenue",
    "Motion C: Cumulative Revenue",
    "TOTAL CUMULATIVE REVENUE",
    "",
    "Motion A: Agencies (cumulative)",
    "Motion B: Total Customers",
    "Motion C: Total Customers",
    "TOTAL CUSTOMERS",
]

sr = 5
for i, metric in enumerate(summary_metrics):
    row = sr + i
    ws4.cell(row, 1, metric).font = BLACK_BOLD if metric else None
    ws4.cell(row, 1).border = THIN_BORDER
    for m in range(12):
        ws4.cell(row, m+2).border = THIN_BORDER
        ws4.cell(row, m+2).alignment = CENTER
    ws4.cell(row, 14).border = THIN_BORDER
    ws4.cell(row, 14).alignment = CENTER

# References to other sheets
# Motion A MRR = 'Agency-Led Growth'!tr (base_row+4 = row 22)
a_mrr_row = tr  # 22
b_mrr_row = tmr2
c_mrr_row = tmr3
a_svc_row = tsr
b_mkt_row = msr
c_cost_row = tccr
a_cum_row = cum
b_cum_row = cumr2
c_cum_row = cumr3
a_cust_row = cr  # cumulative agencies row 19
b_cust_row = tcr2
c_cust_row = tacr

ref_rows = [
    (0, f"'Agency-Led Growth'!", a_mrr_row, USD),
    (1, f"'Content-Led Growth'!", b_mrr_row, USD),
    (2, f"'Partner-Enabled Enterprise'!", c_mrr_row, USD),
    (3, None, None, USD),  # total
    (5, f"'Agency-Led Growth'!", a_svc_row, USD),
    (6, f"'Content-Led Growth'!", b_mkt_row, USD),
    (7, f"'Partner-Enabled Enterprise'!", c_cost_row, USD),
    (9, f"'Agency-Led Growth'!", a_cum_row, USD),
    (10, f"'Content-Led Growth'!", b_cum_row, USD),
    (11, f"'Partner-Enabled Enterprise'!", c_cum_row, USD),
    (12, None, None, USD),  # total cumulative
    (14, f"'Agency-Led Growth'!", 19, INT),  # cumulative agencies
    (15, f"'Content-Led Growth'!", b_cust_row, INT),
    (16, f"'Partner-Enabled Enterprise'!", c_cust_row, INT),
    (17, None, None, INT),  # total customers
]

for offset, sheet_ref, ref_row, fmt in ref_rows:
    row = sr + offset
    if sheet_ref:
        for m in range(12):
            col = m + 2
            cl = get_column_letter(col)
            ws4.cell(row, col, f'={sheet_ref}{cl}{ref_row}').number_format = fmt
        ws4.cell(row, 14, f'={sheet_ref}N{ref_row}').number_format = fmt
    elif offset == 3:  # Total MRR
        for m in range(12):
            col = m + 2
            cl = get_column_letter(col)
            ws4.cell(row, col, f'={cl}{sr}+{cl}{sr+1}+{cl}{sr+2}').number_format = fmt
        ws4.cell(row, 14, f'=N{sr}+N{sr+1}+N{sr+2}').number_format = fmt
        style_range(ws4, row, 2, 14, fill=TOTAL_FILL, border=THIN_BORDER)
    elif offset == 12:  # Total Cumulative
        for m in range(12):
            col = m + 2
            cl = get_column_letter(col)
            ws4.cell(row, col, f'={cl}{sr+9}+{cl}{sr+10}+{cl}{sr+11}').number_format = fmt
        ws4.cell(row, 14, f'=N{sr+9}+N{sr+10}+N{sr+11}').number_format = fmt
        style_range(ws4, row, 2, 14, fill=TOTAL_FILL, border=THIN_BORDER)
    elif offset == 17:  # Total Customers
        for m in range(12):
            col = m + 2
            cl = get_column_letter(col)
            ws4.cell(row, col, f'={cl}{sr+14}+{cl}{sr+15}+{cl}{sr+16}').number_format = fmt
        ws4.cell(row, 14, f'=N{sr+14}+N{sr+15}+N{sr+16}').number_format = fmt
        style_range(ws4, row, 2, 14, fill=TOTAL_FILL, border=THIN_BORDER)

ws4.column_dimensions['A'].width = 40
for c in range(2, 15):
    ws4.column_dimensions[get_column_letter(c)].width = 14

# Save
output_path = "/Users/jbh17/Documents/AIDevelopment/insight-360/documentation/i360-gtm-growth-model.xlsx"
wb.save(output_path)
print(f"Saved to {output_path}")
