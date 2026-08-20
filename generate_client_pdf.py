#!/usr/bin/env python3
"""Generate a client-facing Pharmacy Platform feature brochure PDF."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, inch
from reportlab.lib.colors import Color, HexColor, white, black
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    Flowable,
    NextPageTemplate,
    PageBreak,
    ListFlowable,
    ListItem,
)
from reportlab.pdfgen import canvas

# ── Fonts ──────────────────────────────────────────────────────────────────
FONT_DIR = "/usr/share/fonts/truetype/inter-zorin-os"
pdfmetrics.registerFont(TTFont("Inter", f"{FONT_DIR}/Inter-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Inter-Medium", f"{FONT_DIR}/Inter-Medium.ttf"))
pdfmetrics.registerFont(TTFont("Inter-SemiBold", f"{FONT_DIR}/Inter-SemiBold.ttf"))
pdfmetrics.registerFont(TTFont("Inter-Bold", f"{FONT_DIR}/Inter-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Inter-Light", f"{FONT_DIR}/Inter-Light.ttf"))
pdfmetrics.registerFont(TTFont("Inter-ExtraBold", f"{FONT_DIR}/Inter-ExtraBold.ttf"))

# ── Palette (healthcare / trust) ────────────────────────────────────────────
NAVY = HexColor("#0B3D5C")
TEAL = HexColor("#0D7377")
TEAL_LIGHT = HexColor("#14919B")
MINT = HexColor("#E6F4F4")
MINT_DEEP = HexColor("#D0EBEB")
SOFT_BG = HexColor("#F7FAFB")
WARM_GRAY = HexColor("#5A6A73")
BODY = HexColor("#243038")
LIGHT_LINE = HexColor("#D5E0E6")
ACCENT = HexColor("#E8A838")  # warm gold accent
WHITE = white
CARD_BORDER = HexColor("#C8D9E0")

PAGE_W, PAGE_H = A4
MARGIN_L = 18 * mm
MARGIN_R = 18 * mm
MARGIN_T = 22 * mm
MARGIN_B = 18 * mm
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R

OUTPUT = "Pharmacy_Platform_Feature_Guide.pdf"


# ── Custom flowables ────────────────────────────────────────────────────────
class HRule(Flowable):
    def __init__(self, width=None, color=LIGHT_LINE, thickness=0.6, space_before=4, space_after=8):
        super().__init__()
        self._width = width
        self.color = color
        self.thickness = thickness
        self.spaceBefore = space_before
        self.spaceAfter = space_after

    def wrap(self, availWidth, availHeight):
        self.width = self._width or availWidth
        return self.width, self.thickness + self.spaceBefore + self.spaceAfter

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        y = self.spaceAfter
        self.canv.line(0, y, self.width, y)


class AccentBar(Flowable):
    """Left accent bar + title used as section opener."""

    def __init__(self, title, subtitle=None, width=None):
        super().__init__()
        self.title = title
        self.subtitle = subtitle
        self._width = width

    def wrap(self, availWidth, availHeight):
        self.width = self._width or availWidth
        self.height = 28 if not self.subtitle else 42
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(TEAL)
        c.roundRect(0, 4, 4, self.height - 8, 2, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont("Inter-Bold", 15)
        c.drawString(12, self.height - 16, self.title)
        if self.subtitle:
            c.setFillColor(WARM_GRAY)
            c.setFont("Inter", 9)
            c.drawString(12, 6, self.subtitle)


class FeatureCard(Flowable):
    """Rounded card with title + body text."""

    def __init__(self, title, body, width=None, min_height=0, icon_char=None):
        super().__init__()
        self.title = title
        self.body = body
        self._width = width
        self.min_height = min_height
        self.icon_char = icon_char
        self._body_para = None
        self._title_para = None

    def wrap(self, availWidth, availHeight):
        self.width = self._width or availWidth
        pad = 10
        inner_w = self.width - 2 * pad - 4

        title_style = ParagraphStyle(
            "cardTitle",
            fontName="Inter-SemiBold",
            fontSize=10,
            textColor=NAVY,
            leading=13,
        )
        body_style = ParagraphStyle(
            "cardBody",
            fontName="Inter",
            fontSize=8.5,
            textColor=BODY,
            leading=11.5,
        )
        self._title_para = Paragraph(self.title, title_style)
        self._body_para = Paragraph(self.body, body_style)
        tw, th = self._title_para.wrap(inner_w, 200)
        bw, bh = self._body_para.wrap(inner_w, 400)
        self.height = max(self.min_height, pad + th + 4 + bh + pad + 2)
        return self.width, self.height

    def draw(self):
        c = self.canv
        # card background
        c.setFillColor(SOFT_BG)
        c.setStrokeColor(CARD_BORDER)
        c.setLineWidth(0.6)
        c.roundRect(0, 0, self.width, self.height, 6, fill=1, stroke=1)
        # left teal strip
        c.setFillColor(TEAL)
        c.roundRect(0, 0, 3.5, self.height, 1.5, fill=1, stroke=0)

        pad = 10
        inner_w = self.width - 2 * pad - 4
        y = self.height - pad
        tw, th = self._title_para.wrap(inner_w, 200)
        self._title_para.drawOn(c, pad + 2, y - th)
        y -= th + 4
        bw, bh = self._body_para.wrap(inner_w, 400)
        self._body_para.drawOn(c, pad + 2, y - bh)


class StatPill(Flowable):
    def __init__(self, value, label, width=None):
        super().__init__()
        self.value = value
        self.label = label
        self._width = width

    def wrap(self, availWidth, availHeight):
        self.width = self._width or availWidth
        self.height = 48
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(MINT)
        c.roundRect(0, 0, self.width, self.height, 8, fill=1, stroke=0)
        c.setFillColor(TEAL)
        c.setFont("Inter-Bold", 16)
        c.drawCentredString(self.width / 2, 26, self.value)
        c.setFillColor(WARM_GRAY)
        c.setFont("Inter", 7.5)
        c.drawCentredString(self.width / 2, 10, self.label)


class JourneyStep(Flowable):
    """Horizontal journey steps as numbered chips."""

    def __init__(self, steps, width=None):
        super().__init__()
        self.steps = steps
        self._width = width

    def wrap(self, availWidth, availHeight):
        self.width = self._width or availWidth
        # estimate rows
        self.height = 18 + len(self.steps) * 22
        return self.width, self.height

    def draw(self):
        c = self.canv
        y = self.height - 14
        for i, step in enumerate(self.steps):
            # number circle
            c.setFillColor(TEAL)
            c.circle(10, y + 3, 8, fill=1, stroke=0)
            c.setFillColor(WHITE)
            c.setFont("Inter-Bold", 8)
            c.drawCentredString(10, y, str(i + 1))
            # connector
            if i < len(self.steps) - 1:
                c.setStrokeColor(MINT_DEEP)
                c.setLineWidth(1.5)
                c.line(10, y - 6, 10, y - 14)
            # text
            c.setFillColor(BODY)
            c.setFont("Inter", 9)
            c.drawString(26, y, step)
            y -= 22


class BulletBlock(Flowable):
    """Two-column bullet list with teal dots."""

    def __init__(self, items, columns=2, width=None):
        super().__init__()
        self.items = items
        self.columns = columns
        self._width = width
        self._paras = []

    def wrap(self, availWidth, availHeight):
        self.width = self._width or availWidth
        col_w = (self.width - 8 * (self.columns - 1)) / self.columns
        style = ParagraphStyle(
            "bulletItem",
            fontName="Inter",
            fontSize=8.5,
            textColor=BODY,
            leading=11.5,
            leftIndent=10,
        )
        self._paras = []
        heights = []
        for item in self.items:
            p = Paragraph(item, style)
            w, h = p.wrap(col_w - 4, 200)
            self._paras.append((p, h, col_w))
            heights.append(h)

        # layout into columns row-wise
        n = len(self.items)
        rows = (n + self.columns - 1) // self.columns
        # distribute items column-first for better reading
        col_items = [[] for _ in range(self.columns)]
        for i, item_data in enumerate(self._paras):
            col_items[i % self.columns].append(item_data)

        # Actually use row-wise for balance
        self._layout = []
        row_h = []
        for r in range(rows):
            row = []
            max_h = 0
            for col in range(self.columns):
                idx = r * self.columns + col
                if idx < n:
                    p, h, cw = self._paras[idx]
                    row.append((p, h, cw, col))
                    max_h = max(max_h, h)
            self._layout.append((row, max_h))
            row_h.append(max_h + 4)

        self.height = sum(row_h) + 4
        self._col_w = col_w
        return self.width, self.height

    def draw(self):
        c = self.canv
        y = self.height - 2
        for row, max_h in self._layout:
            for p, h, cw, col in row:
                x = col * (self._col_w + 8)
                # dot
                c.setFillColor(TEAL)
                c.circle(x + 3, y - 5, 2.2, fill=1, stroke=0)
                p.drawOn(c, x + 2, y - h)
            y -= max_h + 4


class CalloutBox(Flowable):
    def __init__(self, title, body, width=None, tone="info"):
        super().__init__()
        self.title = title
        self.body = body
        self._width = width
        self.tone = tone

    def wrap(self, availWidth, availHeight):
        self.width = self._width or availWidth
        title_style = ParagraphStyle(
            "calloutTitle",
            fontName="Inter-SemiBold",
            fontSize=9.5,
            textColor=NAVY,
            leading=12,
        )
        body_style = ParagraphStyle(
            "calloutBody",
            fontName="Inter",
            fontSize=8.5,
            textColor=BODY,
            leading=11.5,
        )
        self._tp = Paragraph(self.title, title_style)
        self._bp = Paragraph(self.body, body_style)
        tw, th = self._tp.wrap(self.width - 24, 100)
        bw, bh = self._bp.wrap(self.width - 24, 300)
        self.height = 14 + th + 4 + bh + 12
        self._th = th
        self._bh = bh
        return self.width, self.height

    def draw(self):
        c = self.canv
        bg = MINT if self.tone == "info" else HexColor("#FFF8E8")
        border = TEAL if self.tone == "info" else ACCENT
        c.setFillColor(bg)
        c.setStrokeColor(border)
        c.setLineWidth(0.8)
        c.roundRect(0, 0, self.width, self.height, 6, fill=1, stroke=1)
        c.setFillColor(border)
        c.rect(0, 0, 4, self.height, fill=1, stroke=0)
        self._tp.drawOn(c, 14, self.height - 10 - self._th)
        self._bp.drawOn(c, 14, self.height - 10 - self._th - 4 - self._bh)


class SectionBadge(Flowable):
    def __init__(self, text):
        super().__init__()
        self.text = text

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        self.height = 18
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.setFont("Inter-SemiBold", 7.5)
        tw = c.stringWidth(self.text.upper(), "Inter-SemiBold", 7.5)
        bw = tw + 16
        c.setFillColor(TEAL)
        c.roundRect(0, 2, bw, 14, 7, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.drawString(8, 5.5, self.text.upper())


# ── Page chrome ─────────────────────────────────────────────────────────────
def draw_header_footer(canvas_obj, doc):
    page = canvas_obj.getPageNumber()
    if page == 1:
        return  # cover has its own design

    canvas_obj.saveState()
    # top thin bar
    canvas_obj.setFillColor(TEAL)
    canvas_obj.rect(0, PAGE_H - 3.5, PAGE_W, 3.5, fill=1, stroke=0)

    # header label
    canvas_obj.setFillColor(WARM_GRAY)
    canvas_obj.setFont("Inter", 7.5)
    canvas_obj.drawString(MARGIN_L, PAGE_H - 12, "Pharmacy Digital Platform")
    canvas_obj.drawRightString(PAGE_W - MARGIN_R, PAGE_H - 12, "Product Feature Guide")

    # footer
    canvas_obj.setStrokeColor(LIGHT_LINE)
    canvas_obj.setLineWidth(0.5)
    canvas_obj.line(MARGIN_L, 12 * mm, PAGE_W - MARGIN_R, 12 * mm)
    canvas_obj.setFillColor(WARM_GRAY)
    canvas_obj.setFont("Inter", 7.5)
    canvas_obj.drawString(MARGIN_L, 7.5 * mm, "Confidential — For client review")
    canvas_obj.drawRightString(PAGE_W - MARGIN_R, 7.5 * mm, f"{page}")
    canvas_obj.restoreState()


def draw_cover(canvas_obj, doc):
    canvas_obj.saveState()
    # full navy background
    canvas_obj.setFillColor(NAVY)
    canvas_obj.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    # decorative teal arc / band at bottom
    canvas_obj.setFillColor(TEAL)
    canvas_obj.rect(0, 0, PAGE_W, 48 * mm, fill=1, stroke=0)

    # subtle mint accent strip
    canvas_obj.setFillColor(TEAL_LIGHT)
    canvas_obj.rect(0, 48 * mm, PAGE_W, 3, fill=1, stroke=0)

    # decorative circles (abstract medical / modern)
    canvas_obj.setFillColor(HexColor("#0E4A6A"))
    canvas_obj.circle(PAGE_W - 30, PAGE_H - 40, 90, fill=1, stroke=0)
    canvas_obj.setFillColor(HexColor("#0C455F"))
    canvas_obj.circle(40, PAGE_H - 180, 60, fill=1, stroke=0)

    # top badge
    canvas_obj.setFillColor(TEAL)
    canvas_obj.roundRect(MARGIN_L, PAGE_H - 35 * mm, 52 * mm, 7 * mm, 3.5, fill=1, stroke=0)
    canvas_obj.setFillColor(WHITE)
    canvas_obj.setFont("Inter-SemiBold", 8)
    canvas_obj.drawCentredString(MARGIN_L + 26 * mm, PAGE_H - 32.5 * mm, "PRODUCT OVERVIEW")

    # main title
    canvas_obj.setFillColor(WHITE)
    canvas_obj.setFont("Inter-ExtraBold", 28)
    canvas_obj.drawString(MARGIN_L, PAGE_H - 60 * mm, "Your Complete")
    canvas_obj.drawString(MARGIN_L, PAGE_H - 72 * mm, "Pharmacy Digital")
    canvas_obj.drawString(MARGIN_L, PAGE_H - 84 * mm, "Platform")

    # gold accent line
    canvas_obj.setStrokeColor(ACCENT)
    canvas_obj.setLineWidth(2.5)
    canvas_obj.line(MARGIN_L, PAGE_H - 90 * mm, MARGIN_L + 40 * mm, PAGE_H - 90 * mm)

    # subtitle
    canvas_obj.setFillColor(HexColor("#B8D4E0"))
    canvas_obj.setFont("Inter", 11)
    y = PAGE_H - 102 * mm
    lines = [
        "A connected system for your website, customer care,",
        "prescriptions, inventory, payments, and team operations —",
        "designed so every part of the pharmacy works together.",
    ]
    for line in lines:
        canvas_obj.drawString(MARGIN_L, y, line)
        y -= 5.5 * mm

    # value pillars on cover
    pillars = [
        ("Patients", "Self-service, refills,\nadherence & care"),
        ("Caregivers", "Family support with\npermission controls"),
        ("Your Team", "Operations, stock,\nCRM & fulfilment"),
        ("Growth", "Loyalty, campaigns\n& modern payments"),
    ]
    box_w = 38 * mm
    gap = 4 * mm
    start_x = MARGIN_L
    box_y = 58 * mm
    for i, (title, desc) in enumerate(pillars):
        x = start_x + i * (box_w + gap)
        canvas_obj.setFillColor(HexColor("#0A354F"))
        canvas_obj.roundRect(x, box_y, box_w, 28 * mm, 4, fill=1, stroke=0)
        canvas_obj.setFillColor(ACCENT)
        canvas_obj.circle(x + 6 * mm, box_y + 21 * mm, 2.2, fill=1, stroke=0)
        canvas_obj.setFillColor(WHITE)
        canvas_obj.setFont("Inter-SemiBold", 9)
        canvas_obj.drawString(x + 4 * mm, box_y + 14 * mm, title)
        canvas_obj.setFillColor(HexColor("#9BB8C8"))
        canvas_obj.setFont("Inter", 7)
        for j, dline in enumerate(desc.split("\n")):
            canvas_obj.drawString(x + 4 * mm, box_y + 8 * mm - j * 3.2 * mm, dline)

    # bottom band text
    canvas_obj.setFillColor(WHITE)
    canvas_obj.setFont("Inter-Medium", 9)
    canvas_obj.drawString(MARGIN_L, 28 * mm, "Feature Guide for Pharmacy Partners")
    canvas_obj.setFont("Inter", 8)
    canvas_obj.setFillColor(HexColor("#A8D0D4"))
    canvas_obj.drawString(MARGIN_L, 20 * mm, "Prepared for client evaluation  ·  Business-oriented overview")
    canvas_obj.setFillColor(WHITE)
    canvas_obj.setFont("Inter", 8)
    canvas_obj.drawRightString(PAGE_W - MARGIN_R, 20 * mm, "Confidential")

    canvas_obj.restoreState()


# ── Styles ──────────────────────────────────────────────────────────────────
def styles():
    s = {}
    s["h1"] = ParagraphStyle(
        "h1",
        fontName="Inter-Bold",
        fontSize=16,
        textColor=NAVY,
        leading=20,
        spaceAfter=6,
        spaceBefore=2,
    )
    s["h2"] = ParagraphStyle(
        "h2",
        fontName="Inter-SemiBold",
        fontSize=11.5,
        textColor=TEAL,
        leading=15,
        spaceBefore=10,
        spaceAfter=4,
    )
    s["h3"] = ParagraphStyle(
        "h3",
        fontName="Inter-SemiBold",
        fontSize=10,
        textColor=NAVY,
        leading=13,
        spaceBefore=8,
        spaceAfter=3,
    )
    s["body"] = ParagraphStyle(
        "body",
        fontName="Inter",
        fontSize=9,
        textColor=BODY,
        leading=12.5,
        spaceAfter=6,
        alignment=TA_JUSTIFY,
    )
    s["body_left"] = ParagraphStyle(
        "body_left",
        fontName="Inter",
        fontSize=9,
        textColor=BODY,
        leading=12.5,
        spaceAfter=6,
        alignment=TA_LEFT,
    )
    s["lead"] = ParagraphStyle(
        "lead",
        fontName="Inter",
        fontSize=10.5,
        textColor=BODY,
        leading=15,
        spaceAfter=10,
        alignment=TA_JUSTIFY,
    )
    s["small"] = ParagraphStyle(
        "small",
        fontName="Inter",
        fontSize=8,
        textColor=WARM_GRAY,
        leading=11,
        spaceAfter=4,
    )
    s["toc_item"] = ParagraphStyle(
        "toc_item",
        fontName="Inter",
        fontSize=9.5,
        textColor=BODY,
        leading=16,
    )
    s["toc_num"] = ParagraphStyle(
        "toc_num",
        fontName="Inter-SemiBold",
        fontSize=9.5,
        textColor=TEAL,
        leading=16,
    )
    s["center"] = ParagraphStyle(
        "center",
        fontName="Inter",
        fontSize=9,
        textColor=BODY,
        leading=12,
        alignment=TA_CENTER,
    )
    s["caption"] = ParagraphStyle(
        "caption",
        fontName="Inter-Medium",
        fontSize=8,
        textColor=WARM_GRAY,
        leading=10,
        spaceAfter=6,
    )
    s["footer_note"] = ParagraphStyle(
        "footer_note",
        fontName="Inter",
        fontSize=8,
        textColor=WARM_GRAY,
        leading=11,
        alignment=TA_CENTER,
    )
    return s


def two_col_cards(left_title, left_body, right_title, right_body, gap=6):
    half = (CONTENT_W - gap) / 2
    left = FeatureCard(left_title, left_body, width=half)
    right = FeatureCard(right_title, right_body, width=half)
    # force same height
    left.wrap(half, 500)
    right.wrap(half, 500)
    mh = max(left.height, right.height)
    left.min_height = mh
    right.min_height = mh
    t = Table([[left, right]], colWidths=[half, half])
    t.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (0, 0), gap / 2),
                ("LEFTPADDING", (1, 0), (1, 0), gap / 2),
            ]
        )
    )
    return t


def three_col_cards(items, gap=5):
    """items: list of (title, body) length 3"""
    w = (CONTENT_W - 2 * gap) / 3
    cards = [FeatureCard(t, b, width=w) for t, b in items]
    heights = []
    for c in cards:
        c.wrap(w, 500)
        heights.append(c.height)
    mh = max(heights)
    for c in cards:
        c.min_height = mh
    t = Table([cards], colWidths=[w, w, w])
    t.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    # add gaps via spacer approach - use padding
    t.setStyle(
        TableStyle(
            [
                ("RIGHTPADDING", (0, 0), (0, 0), gap),
                ("LEFTPADDING", (1, 0), (1, 0), gap / 2),
                ("RIGHTPADDING", (1, 0), (1, 0), gap / 2),
                ("LEFTPADDING", (2, 0), (2, 0), gap),
            ]
        )
    )
    return t


def four_stats(stats):
    """stats: list of (value, label)"""
    gap = 5
    w = (CONTENT_W - 3 * gap) / 4
    pills = [StatPill(v, l, width=w) for v, l in stats]
    t = Table([pills], colWidths=[w] * 4)
    t.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), gap),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (3, 0), (3, 0), 0),
            ]
        )
    )
    return t


def simple_table(headers, rows, col_widths=None):
    header_style = ParagraphStyle(
        "th", fontName="Inter-SemiBold", fontSize=8, textColor=WHITE, leading=11
    )
    cell_style = ParagraphStyle(
        "td", fontName="Inter", fontSize=8, textColor=BODY, leading=11
    )
    data = [[Paragraph(h, header_style) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), cell_style) for c in row])

    if col_widths is None:
        col_widths = [CONTENT_W / len(headers)] * len(headers)

    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), TEAL),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("BACKGROUND", (0, 1), (-1, -1), WHITE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, MINT]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("BOX", (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, LIGHT_LINE),
        ("LINEBELOW", (0, 0), (-1, 0), 0, TEAL),
    ]
    t.setStyle(TableStyle(style_cmds))
    return t


def section_gap():
    """Visual breathing room between major sections on the same page."""
    return Spacer(1, 14)


def soft_break(story, *flowables):
    """Keep a section together when possible; allow natural page flow."""
    story.append(KeepTogether(list(flowables)))


# ── Document content ────────────────────────────────────────────────────────
def build_story():
    S = styles()
    story = []

    # Cover → body
    story.append(NextPageTemplate("body"))
    story.append(PageBreak())

    # ── Introduction ──
    story.append(SectionBadge("Introduction"))
    story.append(Spacer(1, 6))
    story.append(Paragraph("A digital pharmacy that works as one system", S["h1"]))
    story.append(
        Paragraph(
            "This platform is more than a website. It is a full operating system for modern "
            "pharmacy care — connecting how patients find you, how they manage medicines, how "
            "families support loved ones, and how your staff runs day-to-day operations.",
            S["lead"],
        )
    )
    story.append(
        Paragraph(
            "Every major part is designed to talk to the others: a public refill request becomes "
            "a real workflow for your team; a prescription can drive stock movement when you "
            "dispense; loyalty, messaging, and reminders keep patients engaged after they leave "
            "the counter.",
            S["body"],
        )
    )

    story.append(Spacer(1, 4))
    story.append(four_stats([
        ("4", "Connected portals"),
        ("End-to-end", "Care & commerce"),
        ("AI-assisted", "Patient guidance"),
        ("M-Pesa ready", "Local payments"),
    ]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Who this platform serves", S["h2"]))
    story.append(three_col_cards([
        (
            "Your customers",
            "Browse medicines, request refills, place orders, pay securely, track adherence, "
            "earn loyalty rewards, and message the pharmacy — from phone or desktop.",
        ),
        (
            "Caregivers & family",
            "Invite trusted helpers to view medications, confirm daily doses, request refills, "
            "and receive pickup alerts — only with permissions you control.",
        ),
        (
            "Pharmacy staff",
            "Run inventory, prescriptions, refills, orders, CRM, campaigns, services, and "
            "escalations from one staff console built for daily pharmacy work.",
        ),
    ]))
    story.append(Spacer(1, 8))

    story.append(
        CalloutBox(
            "What makes this different",
            "Many pharmacy sites stop at marketing pages. This platform connects public discovery "
            "to real operational records — inventory, prescriptions, payments, adherence, and "
            "customer history — so digital activity becomes pharmacy work you can fulfil and track.",
        )
    )
    story.append(Spacer(1, 8))

    # Compact contents map to fill intro page productively
    story.append(Paragraph("Inside this guide", S["h2"]))
    toc_rows = [
        ["01", "Public website & first impressions", "07", "Orders, payments & M-Pesa"],
        ["02", "Customer portal — self-service care", "08", "CRM, messaging & growth"],
        ["03", "Medication adherence & reminders", "09", "AI assistant & symptom guidance"],
        ["04", "Caregiver platform", "10", "Security, roles & trust"],
        ["05", "Staff & admin operations", "11", "Capability overview"],
        ["06", "Medicines, inventory & stock", "12", "Why partners choose this platform"],
    ]
    toc_num = ParagraphStyle("tocn", fontName="Inter-Bold", fontSize=8.5, textColor=TEAL, leading=12)
    toc_lab = ParagraphStyle("tocl", fontName="Inter", fontSize=8.5, textColor=BODY, leading=12)
    toc_data = []
    for a, b, c, d in toc_rows:
        toc_data.append([
            Paragraph(a, toc_num), Paragraph(b, toc_lab),
            Paragraph(c, toc_num), Paragraph(d, toc_lab),
        ])
    toc_table = Table(toc_data, colWidths=[12 * mm, CONTENT_W / 2 - 14 * mm, 12 * mm, CONTENT_W / 2 - 14 * mm])
    toc_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("BACKGROUND", (0, 0), (-1, -1), SOFT_BG),
        ("BOX", (0, 0), (-1, -1), 0.5, CARD_BORDER),
        ("LINEBELOW", (0, 0), (-1, -2), 0.3, LIGHT_LINE),
    ]))
    story.append(toc_table)

    # ── 1. Public ──
    story.append(PageBreak())
    story.append(AccentBar("1. Public website & first impressions", "How patients discover and engage with your pharmacy"))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            "Your public presence is professional, informative, and action-oriented. Visitors can "
            "learn about the pharmacy, explore medicines and services, get help from an AI assistant, "
            "and start refill or order requests — even before they create an account.",
            S["body"],
        )
    )
    story.append(Paragraph("Core public pages", S["h2"]))
    story.append(two_col_cards(
        "Home, About & Trust",
        "Brand story, service highlights, opening hours, contact details, community presence, "
        "and clear paths into refills, services, and the health library.",
        "Medicine catalogue",
        "Live catalogue backed by your pharmacy inventory — not just static marketing content. "
        "Patients see availability, pricing, categories, strengths, forms, indications, and related options.",
    ))
    story.append(Spacer(1, 5))
    story.append(two_col_cards(
        "Health library",
        "Readable health articles with related reading. Approved content can also power the "
        "pharmacy AI assistant, so answers stay aligned with your knowledge.",
        "Services & booking",
        "Present pharmacy services with benefits, eligibility, duration, and pricing — and accept "
        "online bookings that flow into staff workflows.",
    ))
    story.append(Spacer(1, 5))
    story.append(two_col_cards(
        "Delivery, FAQ & Contact",
        "Clear delivery information, enquiry forms, FAQ support, careers applications, plus "
        "privacy and terms pages for professional trust.",
        "Image medicine search",
        "Patients can upload a photo of a medicine pack. AI reads the pack details and matches "
        "them to your public catalogue — helpful when names are hard to spell or remember.",
    ))
    story.append(Spacer(1, 6))
    story.append(
        CalloutBox(
            "Guest-friendly care",
            "Patients who are not logged in can still request a refill or place an order with "
            "contact details. The experience gently encourages account creation for richer "
            "ongoing care — without blocking urgent needs.",
        )
    )

    story.append(section_gap())
    story.append(AccentBar("2. Customer portal — self-service care", "Logged-in experience for ongoing pharmacy relationships"))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            "Once registered, customers get a personal space for prescriptions, refills, orders, "
            "payments, medication reminders, caregivers, loyalty, messages, and preferences. "
            "This turns occasional visitors into managed, long-term patients.",
            S["body"],
        )
    )
    story.append(Paragraph("What customers can do", S["h2"]))
    story.append(BulletBlock([
        "Complete onboarding with profile, contact, and preference details",
        "View active prescriptions, dosage, and refills remaining",
        "Request refills for pickup or delivery with preferred timing",
        "Place and track orders from the portal",
        "Pay for priced refills and orders via M-Pesa",
        "Track medication adherence and dose history",
        "Receive and manage dose reminders",
        "Invite and manage caregivers with permissions",
        "Earn and redeem loyalty points and coupons",
        "Message the pharmacy and receive notifications",
        "Set email, SMS, WhatsApp, and marketing preferences",
        "Share feedback, reviews, and suggestions",
    ], columns=2))
    story.append(Spacer(1, 6))
    soft_break(
        story,
        Paragraph("Refill journey (customer view)", S["h3"]),
        JourneyStep([
            "Submit a refill from the portal (or guest form)",
            "Pharmacy reviews and approves the request",
            "Medicine is prepared for pickup or delivery",
            "Customer is notified when ready",
            "Payment is completed where required (including M-Pesa)",
            "Collection or delivery closes the loop",
        ]),
        Spacer(1, 4),
        Paragraph(
            "Refill statuses move clearly through the pharmacy: submitted → under review → approved → "
            "preparing → ready for pickup → collected (or cancelled). Requests can originate from "
            "the website, portal, AI assistant, phone, WhatsApp, or staff entry.",
            S["small"],
        ),
    )

    # ── 3 + 4 (flow after portal; no forced blank page) ──
    story.append(section_gap())
    story.append(AccentBar("3. Medication adherence & reminders", "Helping patients stay on treatment — day after day"))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            "Adherence is one of the platform’s standout capabilities. Prescriptions can carry "
            "structured dose schedules. The system generates daily dose reminders, records whether "
            "doses were taken, missed, or late, and can escalate when patients fall behind.",
            S["body"],
        )
    )
    story.append(three_col_cards([
        (
            "Smart schedules",
            "Turn dosage instructions into structured times and quantities. Generate today’s doses "
            "and upcoming reminders automatically.",
        ),
        (
            "Dose logging",
            "Record taken, missed, late, or open doses — by the patient or an authorised caregiver — "
            "with timestamps and notes.",
        ),
        (
            "Progress & streaks",
            "Show adherence rates, taken/missed counts, and current streaks so patients and staff "
            "can see progress clearly.",
        ),
    ]))
    story.append(Spacer(1, 6))
    story.append(
        CalloutBox(
            "Progressive escalation · commercial value",
            "Reminders are not a single ping and forget. Multi-step escalation keeps follow-up "
            "attentive when someone misses medication. Better adherence improves outcomes and "
            "strengthens refill continuity — turning your pharmacy into a care partner, not only a retailer.",
        )
    )

    story.append(section_gap())
    story.append(AccentBar("4. Caregiver platform", "Family support with clear privacy boundaries"))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            "Caring for an elderly parent, a child, or someone on complex medication is hard. "
            "This platform gives caregivers a dedicated space — not just a shared login — with "
            "explicit permissions and strong privacy controls.",
            S["body"],
        )
    )
    story.append(two_col_cards(
        "Invite & permission model",
        "Customers invite caregivers by name, email, or phone. Secure invitations expire. "
        "Permissions separately control refill requests, pickup alerts, and dose logging.",
        "Daily caregiver tools",
        "Today’s dose checklist, patient medication views, refill requests (when allowed), "
        "adherence summaries, pickup alerts, and reminders for linked patients only.",
    ))
    story.append(Spacer(1, 5))
    soft_break(
        story,
        Paragraph("Caregiver journey", S["h3"]),
        JourneyStep([
            "Patient invites a trusted caregiver from the portal",
            "Caregiver accepts the secure invitation",
            "Caregiver sees only authorised patients and permissions",
            "Daily: review doses, confirm taken, request refills if allowed",
            "Receive pickup and reminder notifications when enabled",
        ]),
        Spacer(1, 5),
        CalloutBox(
            "Privacy by design",
            "Caregivers cannot browse other customers, loyalty programmes, campaigns, or admin data. "
            "Even AI assistance for caregivers is limited to authorised patient information — protecting "
            "clinical and commercial confidentiality.",
        ),
    )

    # ── 5 Staff (flows after caregiver to avoid sparse leftover pages) ──
    story.append(section_gap())
    story.append(AccentBar("5. Staff & admin operations", "The pharmacy control centre"))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            "Your team gets a full operations console: customers, medicines, inventory, prescriptions, "
            "refills, orders, payments, messaging, campaigns, services, and escalations. Role-aware "
            "access keeps staff, pharmacists, and managers in the right workspace.",
            S["body"],
        )
    )
    story.append(Paragraph("Operations at a glance", S["h2"]))
    story.append(BulletBlock([
        "Dashboard with inventory health, low stock, expiry, and reorder signals",
        "Customer CRM with profiles, notes, timelines, and full history",
        "Prescription creation, editing, and dispatch against stock",
        "Refill queue management through the full lifecycle",
        "Order fulfilment for counter, portal, website, and refill sources",
        "Payment tracking including M-Pesa and waived orders",
        "Messaging inbox across email, SMS, WhatsApp, and portal",
        "Campaigns and customer segments for targeted outreach",
        "Loyalty programme administration and coupon control",
        "Pharmacy services catalogue and booking management",
        "Symptom-triage escalations for staff follow-up",
        "Location, hours, and pharmacy settings management",
    ], columns=2))
    story.append(Spacer(1, 6))
    soft_break(
        story,
        Paragraph("Staff fulfilment journey", S["h3"]),
        JourneyStep([
            "Request arrives (order, refill, booking, or enquiry)",
            "Staff opens customer and clinical context in CRM",
            "Review prescription / medicine and prepare stock",
            "Record stock movement and confirm payment or waiver",
            "Dispatch / hand over / arrange delivery",
            "Customer is notified; timeline and records update",
        ]),
    )

    # Fresh page for inventory — avoids orphaned subheadings
    story.append(PageBreak())
    story.append(AccentBar("6. Medicines, inventory & stock control", "Clinical accuracy meets commercial reality"))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            "A defining strength of this platform is how medicines are modelled. Clinical product "
            "definitions are separated from pharmacy-specific stock and pricing — so you keep clean "
            "medicine data while managing real shelves, lots, and costs.",
            S["body"],
        )
    )
    story.append(two_col_cards(
        "Medicine master record",
        "Name, generic, brand, strength, form, route, manufacturer, barcode, indications, dosage, "
        "side effects, contraindications, storage, controlled-drug flags, paediatric notes, and more.",
        "Pharmacy inventory record",
        "Your price, purchase cost, stock level, low-stock threshold, supplier, shelf location, "
        "OTC/Rx flags, public listing, promotions, and POS readiness.",
    ))
    story.append(Spacer(1, 5))
    soft_break(
        story,
        Paragraph("Fast ways to add medicines", S["h2"]),
        three_col_cards([
            (
                "Shared library",
                "Search an existing medicine library by name, generic, brand, or barcode and add to your stock.",
            ),
            (
                "Barcode scan",
                "Camera or hardware scanner lookup, with manual entry fallback and AI-assisted import if needed.",
            ),
            (
                "Bulk & AI import",
                "CSV/Excel import with column mapping, or AI-assisted pack extraction with human review before save.",
            ),
        ]),
    )
    story.append(Spacer(1, 5))
    soft_break(
        story,
        Paragraph("Inventory operations you can trust", S["h2"]),
        BulletBlock([
            "Lot-level tracking with batch numbers and expiry dates",
            "Full stock movement history (receive, sale, adjust, dispatch, return, write-off)",
            "First-expiry-first-out (FEFO) lot deduction for pharmaceuticals",
            "Low-stock, out-of-stock, reorder, and expiry monitoring",
            "Validation before save — duplicates, barcode clashes, controlled-drug rules",
            "Progressive data enrichment: start lean, complete records over time",
        ], columns=2),
        Spacer(1, 5),
        CalloutBox(
            "Important operating rule",
            "Creating a prescription or refill does not automatically reduce stock. Stock only moves "
            "when you dispatch or fulfil. That separation protects inventory accuracy and mirrors "
            "how real pharmacies work.",
        ),
    )

    # ── 7 + 8 ──
    story.append(PageBreak())
    story.append(AccentBar("7. Orders, payments & M-Pesa", "Commerce that fits local pharmacy practice"))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            "Orders can come from the counter, customer portal, website, or refill workflows. "
            "The platform tracks pricing, discounts, coupons, fulfilment mode, payment state, "
            "and dispatch separately — so money and medicine never get confused.",
            S["body"],
        )
    )
    story.append(two_col_cards(
        "Order flexibility",
        "Support immediate fulfilment, reserve-for-later, or delivery. Attach staff notes, "
        "clinical reasons, dispenser notes, line items, and waivers with clear records.",
        "M-Pesa mobile money",
        "Customer-friendly STK Push payments with status tracking, retries, and failure reasons. "
        "Also supports cash, card, and other payment records alongside mobile money.",
    ))
    story.append(Spacer(1, 5))
    story.append(Paragraph("Payment vs fulfilment", S["h3"]))
    story.append(
        Paragraph(
            "<b>Paid</b> means payment is received (or stock reserved). <b>Fulfilled</b> means the "
            "physical handoff or dispatch has happened. Waived orders store reason and scope "
            "(one-time, recurring to a date, or permanent) so free or subsidised care never looks "
            "like normal revenue.",
            S["body"],
        )
    )
    story.append(Paragraph("Pharmacy services & bookings", S["h2"]))
    story.append(
        Paragraph(
            "Beyond product sales, you can publish bookable pharmacy services — vaccinations, "
            "consultations, screenings, and more — with pricing, eligibility, and online booking. "
            "Bookings flow to staff, and paid services can use the same payment infrastructure.",
            S["body"],
        )
    )

    story.append(section_gap())
    story.append(AccentBar("8. CRM, messaging & growth", "Know your patients. Reach them at the right moment."))
    story.append(Spacer(1, 6))
    story.append(three_col_cards([
        (
            "Customer 360°",
            "One place for profile, prescriptions, refills, orders, notes, messages, feedback, "
            "caregivers, and adherence — with a chronological timeline of interactions.",
        ),
        (
            "Unified inbox",
            "Conversations across email, SMS, WhatsApp, portal, AI, and system channels with "
            "templates, assignment, and delivery tracking.",
        ),
        (
            "Notifications everywhere",
            "Email, SMS, WhatsApp, push, and in-app alerts for refills, pickups, reminders, "
            "bookings, and operational events.",
        ),
    ]))
    story.append(Spacer(1, 5))
    story.append(two_col_cards(
        "Campaigns & segments",
        "Build customer segments with rules, then launch multi-channel campaigns (email, SMS, "
        "WhatsApp). Track sent, delivered, opened, clicked, and replied — so marketing is measurable.",
        "Loyalty & coupons",
        "Bronze → Platinum tiers, points earning/redemption, referrals, bonuses, and coupons "
        "(percent, fixed, or points-based) with global and per-customer limits.",
    ))
    story.append(Spacer(1, 5))
    story.append(Paragraph("Feedback & enquiries", S["h3"]))
    story.append(
        Paragraph(
            "Capture reviews, suggestions, complaints, and satisfaction ratings. Manage general, "
            "availability, delivery, contact, and careers enquiries with status, assignment, and "
            "staff notes — so nothing important disappears in a shared inbox.",
            S["body"],
        )
    )

    # ── 9 + 10 ──
    story.append(PageBreak())
    story.append(AccentBar("9. AI pharmacy assistant & symptom guidance", "Helpful automation with clinical safety boundaries"))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            "AI is built in as a pharmacy-safe assistant — not a free-form chatbot that invents "
            "advice. It works with your real catalogue and approved knowledge, and it knows when "
            "to stop and escalate to a human pharmacist.",
            S["body"],
        )
    )
    story.append(Paragraph("What the AI can do", S["h2"]))
    story.append(two_col_cards(
        "Patient-facing assistance",
        "Search publicly listed medicines for availability and price, open medicine details, "
        "retrieve approved knowledge articles, explain services, and guide people to refill, "
        "order, or contact pages.",
        "What it will not do",
        "It is instructed not to diagnose, prescribe, change prescriptions, make clinical "
        "decisions, interpret lab results, or reveal internal stock counts, suppliers, shelf "
        "locations, purchase prices, or other customers’ data.",
    ))
    story.append(Spacer(1, 5))
    story.append(Paragraph("“How do you feel?” symptom journeys", S["h2"]))
    story.append(
        Paragraph(
            "A guided symptom experience helps visitors describe how they feel (for example headache, "
            "stomach, cold/flu, skin, allergy). Sessions can include structured answers, AI conversation, "
            "optional images, summaries, red-flag detection, and escalation into staff CRM and enquiry "
            "workflows. Follow-up check-ins (better / same / worse) turn a one-off chat into a monitored "
            "care journey.",
            S["body"],
        )
    )
    story.append(Spacer(1, 5))
    story.append(
        CalloutBox(
            "Staff stay in control",
            "You maintain an AI knowledge base with approval states. Only approved content is meant "
            "for the customer-facing assistant. Escalated symptom sessions land with your team for "
            "acknowledgement, reply, and resolution.",
        )
    )

    story.append(section_gap())
    story.append(AccentBar("10. Security, roles & trust", "Built for sensitive health and commercial data"))
    story.append(Spacer(1, 6))
    story.append(three_col_cards([
        (
            "Identity & access",
            "Registration, login, email verification, password reset, Google sign-in, and secure "
            "session handling so only the right people get in.",
        ),
        (
            "Role-based workspaces",
            "Distinct experiences for customers, caregivers, pharmacists, staff, and managers — "
            "with protected portal, caregiver, and admin areas.",
        ),
        (
            "Data scoping",
            "Customers only see their data. Caregivers only see linked patients with granted "
            "permissions. Public AI only sees public catalogue information.",
        ),
    ]))
    story.append(Spacer(1, 5))
    story.append(
        Paragraph(
            "Sensitive features such as AI chat and image medicine search are rate-limited to protect "
            "service quality. Activity can be traced for operational accountability — who did what, "
            "when, and on which record.",
            S["body"],
        )
    )
    story.append(Paragraph("Connected services (plain language)", S["h2"]))
    story.append(
        Paragraph(
            "Built on a modern, secure web foundation with reliable cloud database storage, "
            "file and image storage, push notifications, AI assistance, Google sign-in, "
            "M-Pesa mobile payments, and delivery-provider readiness. Automated background jobs "
            "help with inventory health checks, loyalty processing, and reminder delivery.",
            S["body"],
        )
    )

    # ── 11 Capability ──
    story.append(PageBreak())
    story.append(AccentBar("11. Capability overview", "At-a-glance coverage for decision makers"))
    story.append(Spacer(1, 6))
    story.append(
        simple_table(
            ["Capability area", "Business readiness"],
            [
                ["Public pharmacy website & trust pages", "Strong"],
                ["Live medicine catalogue & education", "Strong"],
                ["Guest refills & guest orders", "Ready"],
                ["Customer self-service portal", "Strong"],
                ["Caregiver portal & permissions", "Strong"],
                ["Prescriptions, refills & dispatch", "Strong"],
                ["Medication adherence & dose reminders", "Strong"],
                ["Inventory, lots & FEFO stock control", "Strong"],
                ["Multi-path medicine onboarding", "Strong"],
                ["Orders & fulfilment workflows", "Strong"],
                ["M-Pesa / mobile money payments", "Ready*"],
                ["Loyalty, coupons & referrals", "Strong"],
                ["CRM, inbox & multi-channel messaging", "Strong"],
                ["Campaigns & customer segmentation", "Ready"],
                ["Pharmacy services & online booking", "Strong"],
                ["AI assistant with safety boundaries", "Strong"],
                ["Symptom guidance with staff escalation", "Strong"],
                ["Push notifications", "Ready*"],
                ["Delivery integration foundation", "Ready"],
                ["Multi-pharmacy SaaS tenancy", "Not in scope yet"],
            ],
            col_widths=[CONTENT_W * 0.62, CONTENT_W * 0.38],
        )
    )
    story.append(Spacer(1, 5))
    story.append(
        Paragraph(
            "* Items marked Ready require live credentials and environment verification "
            "(payment provider, push service, messaging providers) before go-live.",
            S["small"],
        )
    )
    story.append(Spacer(1, 8))
    story.append(Paragraph("End-to-end value in one picture", S["h2"]))
    story.append(
        Paragraph(
            "<b>Discover</b> → browse medicines & services → <b>Ask / search</b> → request refill or order → "
            "<b>Pay</b> → pharmacy prepares stock → <b>Notify</b> → collect or deliver → "
            "<b>Adhere & refill</b> with ongoing reminders and loyalty.",
            S["body_left"],
        )
    )
    story.append(Spacer(1, 6))
    story.append(
        CalloutBox(
            "One connected system",
            "Public discovery, patient self-service, caregiver support, and staff operations share "
            "the same underlying records — so digital demand becomes work your team can fulfil, "
            "measure, and improve.",
        )
    )

    # ── 12 Closing ──
    story.append(PageBreak())
    story.append(AccentBar("12. Why partners choose this platform", "Summary for decision makers"))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            "This is a complete digital pharmacy ecosystem — not a brochure site with a contact form. "
            "It already covers the journeys that matter to modern pharmacies:",
            S["lead"],
        )
    )
    story.append(two_col_cards(
        "For patients & families",
        "Easier discovery, smarter medicine search, self-service refills and orders, secure payments, "
        "dose support, caregiver help, and continuous communication with the pharmacy they trust.",
        "For the pharmacy business",
        "One operational spine for inventory, prescriptions, fulfilment, CRM, marketing, services, "
        "and AI — reducing fragmented tools and bringing digital demand into real workflows.",
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Standout strengths", S["h2"]))
    strengths = [
        ("1", "Medicine master vs inventory separation — clean clinical data and accurate stock"),
        ("2", "Lot tracking with FEFO deduction — appropriate for pharmaceutical inventory"),
        ("3", "Prescription ≠ dispatch — clinical authority and stock movement stay distinct"),
        ("4", "Structured adherence with caregiver permissions — real care continuity"),
        ("5", "AI with pharmacy-safe boundaries — helpful without overreaching clinically"),
        ("6", "Symptom journeys that escalate to staff — digital triage that lands in operations"),
        ("7", "CRM connectivity — public actions become tracked customer history"),
        ("8", "Multiple medicine acquisition paths — library, barcode, AI, CSV, manual"),
        ("9", "M-Pesa-ready commerce — payments aligned with local customer behaviour"),
        ("10", "Loyalty and campaigns — tools to grow repeat custom, not only one-off sales"),
    ]
    for num, text in strengths:
        story.append(
            Paragraph(
                f"<font color='#0D7377'><b>{num}.</b></font>  {text}",
                S["body_left"],
            )
        )

    story.append(Spacer(1, 10))
    story.append(
        CalloutBox(
            "Recommended next step",
            "The highest-value work after evaluation is not adding more pages — it is hardening the "
            "workflows you care about most, verifying payments and notifications in your environment, "
            "aligning legal and business rules with live capabilities, and launching with a focused "
            "go-live checklist for staff and patients.",
        )
    )
    story.append(Spacer(1, 12))

    close_data = [[
        Paragraph(
            "<font color='#FFFFFF'><b>Bottom line</b></font><br/>"
            "<font color='#D0EBEB' size='9'>A connected foundation for public discovery, customer self-service, "
            "caregiver support, pharmacy operations, inventory, prescriptions, refills, adherence, "
            "payments, CRM, communications, loyalty, services, and AI — ready to be tailored to your pharmacy.</font>",
            ParagraphStyle(
                "close",
                fontName="Inter",
                fontSize=10,
                textColor=WHITE,
                leading=13,
            ),
        )
    ]]
    close_t = Table(close_data, colWidths=[CONTENT_W])
    close_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("BOX", (0, 0), (-1, -1), 0, NAVY),
    ]))
    story.append(close_t)
    story.append(Spacer(1, 14))
    story.append(
        Paragraph(
            "Thank you for reviewing this guide. We are ready to walk through a live demonstration "
            "mapped to your pharmacy’s priorities.",
            S["center"],
        )
    )
    story.append(Spacer(1, 4))
    story.append(
        Paragraph(
            "Pharmacy Digital Platform  ·  Product Feature Guide  ·  Client evaluation copy",
            S["footer_note"],
        )
    )

    return story


def main():
    doc = BaseDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=MARGIN_L,
        rightMargin=MARGIN_R,
        topMargin=MARGIN_T,
        bottomMargin=MARGIN_B,
        title="Pharmacy Digital Platform — Product Feature Guide",
        author="Pharmacy Platform",
        subject="Client-facing feature overview for pharmacy partners",
        creator="Pharmacy Platform Feature Guide",
    )

    cover_frame = Frame(0, 0, PAGE_W, PAGE_H, id="cover")
    body_frame = Frame(
        MARGIN_L,
        MARGIN_B,
        CONTENT_W,
        PAGE_H - MARGIN_T - MARGIN_B,
        id="body",
    )

    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[cover_frame], onPage=draw_cover),
        PageTemplate(id="body", frames=[body_frame], onPage=draw_header_footer),
    ])

    # Spacer holds the cover page; build_story switches to body and continues.
    story = [Spacer(1, 1)] + build_story()
    doc.build(story)
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
