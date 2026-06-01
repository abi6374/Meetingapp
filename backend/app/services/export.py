import io
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def export_pdf(mom_text: str) -> bytes:
    """Generate a Premium Enterprise-grade PDF using ReportLab Platypus."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
        
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf, 
            pagesize=A4,
            rightMargin=50, leftMargin=50,
            topMargin=50, bottomMargin=50
        )
        
        styles = getSampleStyleSheet()
        
        # Custom Styles
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor("#1e293b"),
            alignment=TA_CENTER,
            spaceAfter=30
        )
        
        heading_style = ParagraphStyle(
            'HeadingStyle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor("#334155"),
            spaceBefore=20,
            spaceAfter=10,
            borderPadding=5,
            borderColor=colors.HexColor("#e2e8f0"),
            borderWidth=1,
            borderRadius=4
        )
        
        normal_style = ParagraphStyle(
            'NormalStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor("#475569"),
            spaceAfter=6,
            leading=14
        )
        
        meta_style = ParagraphStyle(
            'MetaStyle',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor("#94a3b8"),
            alignment=TA_CENTER
        )

        elements = []
        
        # Cover Page
        elements.append(Spacer(1, 100))
        elements.append(Paragraph("MeetingMind Intelligence", title_style))
        elements.append(Spacer(1, 20))
        elements.append(Paragraph("EXECUTIVE MEETING REPORT", ParagraphStyle('SubTitle', parent=title_style, fontSize=16, textColor=colors.HexColor("#64748b"))))
        elements.append(Spacer(1, 100))
        elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", meta_style))
        elements.append(PageBreak())

        # Content Parsing (Basic markdown-to-pdf conversion)
        lines = mom_text.splitlines()
        
        table_data = []
        in_table = False

        for line in lines:
            line = line.strip()
            if not line:
                elements.append(Spacer(1, 5))
                continue
                
            # Handle markdown tables (very basic parsing)
            if line.startswith('|'):
                in_table = True
                if "---" not in line: # Skip separator row
                    row = [cell.strip() for cell in line.split('|')[1:-1]]
                    if row:
                        # Wrap text in Paragraphs for table cells
                        table_data.append([Paragraph(cell, normal_style) for cell in row])
                continue
            else:
                if in_table and len(table_data) > 0:
                    # Render Table
                    t = Table(table_data, colWidths=[30, 200, 100, 100])
                    t.setStyle(TableStyle([
                        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
                        ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor("#1e293b")),
                        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                        ('BOTTOMPADDING', (0,0), (-1,0), 12),
                        ('TOPPADDING', (0,0), (-1,0), 12),
                        ('BACKGROUND', (0,1), (-1,-1), colors.white),
                        ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
                        ('VALIGN', (0,0), (-1,-1), 'TOP'),
                    ]))
                    elements.append(t)
                    elements.append(Spacer(1, 10))
                    table_data = []
                    in_table = False

            if line.startswith('# '):
                elements.append(Paragraph(line.replace('# ', ''), title_style))
            elif line.startswith('## '):
                elements.append(Paragraph(line.replace('## ', ''), heading_style))
            elif line.startswith('**'):
                elements.append(Paragraph(line, normal_style))
            elif line.startswith('- ') or line.startswith('* '):
                elements.append(Paragraph(f"• {line[2:]}", normal_style))
            else:
                elements.append(Paragraph(line, normal_style))

        # Catch trailing table
        if in_table and len(table_data) > 0:
             t = Table(table_data)
             t.setStyle(TableStyle([
                ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
             ]))
             elements.append(t)

        def add_footer(canvas, doc):
            canvas.saveState()
            canvas.setFont('Helvetica', 8)
            canvas.setStrokeColor(colors.HexColor("#e2e8f0"))
            canvas.line(50, 40, A4[0]-50, 40)
            canvas.drawString(50, 30, f"MeetingMind Intelligence Report")
            canvas.drawRightString(A4[0]-50, 30, f"Page {doc.page}")
            canvas.restoreState()

        doc.build(elements, onFirstPage=add_footer, onLaterPages=add_footer)
        return buf.getvalue()
    except Exception as e:
        logger.error(f"Premium PDF export failed: {e}")
        # Fallback to simple PDF if Platypus fails
        return _fallback_export_pdf(mom_text)

def _fallback_export_pdf(mom_text: str) -> bytes:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        c.drawString(20, 800, "Meeting Intelligence Report")
        t = c.beginText(20, 780)
        for line in mom_text.splitlines():
            t.textLine(line)
        c.drawText(t)
        c.showPage()
        c.save()
        return buf.getvalue()
    except Exception as e:
        logger.error(f"Fallback PDF export failed: {e}")
        return b""

def export_docx(mom_text: str) -> bytes:
    try:
        from docx import Document
        doc = Document()
        doc.add_heading("Meeting Intelligence Report", 0)
        for line in mom_text.splitlines():
            doc.add_paragraph(line)
        buf = io.BytesIO()
        doc.save(buf)
        return buf.getvalue()
    except Exception as e:
        logger.error(f"DOCX export failed: {e}")
        return b""
