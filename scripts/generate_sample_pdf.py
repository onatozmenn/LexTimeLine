from __future__ import annotations

from pathlib import Path

import fitz  # PyMuPDF


OUTPUT = Path("docs/samples/lex-sample-case.pdf")

PAGES = [
    {
        "title": "LexTimeline Demo Dosyası",
        "subtitle": "Kurgusal Ticari Dava Özeti",
        "body": (
            "Bu belge, README ekran görüntüleri ve ürün demosu için hazırlanmış kurgusal bir "
            "hukuk metnidir.\n\n"
            "Taraflar:\n"
            "- Davacı: Gül Yapı A.Ş.\n"
            "- Davalı: Hasan Çelik\n\n"
            "Konu:\n"
            "12 bağımsız bölümün teslim edilmemesi nedeniyle tazminat talebi.\n\n"
            "Sözleşme tarihi: 15.03.2019\n"
            "Teslim tarihi: 01.09.2020\n"
            "Dava açılışı: 30.11.2020\n"
        ),
    },
    {
        "title": "Kronolojik Olaylar",
        "subtitle": "Özet Timeline",
        "body": (
            "1) 15.03.2019 - Eser sözleşmesi imzalandı.\n"
            "2) 01.09.2020 - Teslim tarihi geçti, 8 daire teslim edilmedi.\n"
            "3) 22.10.2020 - Noter ihtarı gönderildi.\n"
            "4) 30.11.2020 - Tazminat davası açıldı.\n"
            "5) 10.02.2021 - Davalı mücbir sebep savunması yaptı.\n"
            "6) 04.10.2021 - Uzman tanık inşaatın %40 seviyede olduğunu beyan etti.\n"
            "7) 27.01.2022 - Bilirkişi raporu sunuldu.\n"
            "8) 15.06.2022 - İlk derece mahkemesi davayı kabul etti.\n"
            "9) 03.08.2022 - Temyiz başvurusu yapıldı.\n"
            "10) 14.11.2023 - Yargıtay kararı onadı.\n"
        ),
    },
    {
        "title": "Çelişki ve Risk Notları",
        "subtitle": "Demo Analiz Özeti",
        "body": (
            "Yüksek öncelikli çelişki:\n"
            "- Tam ifa savunması ile tanık beyanı arasında doğrudan uyuşmazlık.\n\n"
            "Orta öncelikli çelişki:\n"
            "- Dava dilekçesi tazminat kalemi ile bilirkişi hesabı arasında fark.\n\n"
            "Düşük öncelikli bulgu:\n"
            "- Teslim edilen bağımsız bölümlere ilişkin tutanaklar eksik.\n\n"
            "Öneri:\n"
            "Tanık tutanakları, teslim kayıtları ve hesap tabloları dosyaya birlikte sunulmalıdır."
        ),
    },
]


def _pick_fontfile() -> str | None:
    candidates = [
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeui.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    return None


def build_pdf() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    fontfile = _pick_fontfile()
    doc = fitz.open()

    for i, page_data in enumerate(PAGES, start=1):
        page = doc.new_page(width=595, height=842)  # A4
        rect = page.rect
        margin = 56

        if fontfile:
            page.insert_text(
                fitz.Point(margin, 80),
                page_data["title"],
                fontsize=24,
                fontname="custom",
                fontfile=fontfile,
                color=(0.12, 0.23, 0.37),
            )
            page.insert_text(
                fitz.Point(margin, 112),
                page_data["subtitle"],
                fontsize=13,
                fontname="custom",
                fontfile=fontfile,
                color=(0.41, 0.50, 0.58),
            )
            page.insert_textbox(
                fitz.Rect(margin, 145, rect.width - margin, rect.height - 120),
                page_data["body"],
                fontsize=12.5,
                fontname="custom",
                fontfile=fontfile,
                color=(0.12, 0.12, 0.13),
                lineheight=1.45,
            )
            page.insert_text(
                fitz.Point(margin, rect.height - 48),
                f"LexTimeline Demo PDF - Sayfa {i}",
                fontsize=9.5,
                fontname="custom",
                fontfile=fontfile,
                color=(0.41, 0.50, 0.58),
            )
        else:
            page.insert_text(fitz.Point(margin, 80), page_data["title"], fontsize=24, color=(0.12, 0.23, 0.37))
            page.insert_text(fitz.Point(margin, 112), page_data["subtitle"], fontsize=13, color=(0.41, 0.50, 0.58))
            page.insert_textbox(
                fitz.Rect(margin, 145, rect.width - margin, rect.height - 120),
                page_data["body"],
                fontsize=12.5,
                color=(0.12, 0.12, 0.13),
                lineheight=1.45,
            )
            page.insert_text(
                fitz.Point(margin, rect.height - 48),
                f"LexTimeline Demo PDF - Sayfa {i}",
                fontsize=9.5,
                color=(0.41, 0.50, 0.58),
            )

    doc.save(str(OUTPUT))
    doc.close()
    print(f"Created: {OUTPUT}")


if __name__ == "__main__":
    build_pdf()
