"""Build English project pages from the Spanish Notion snapshot."""

import hashlib
import json
from pathlib import Path

import argostranslate.package
import argostranslate.translate
import translatehtml
from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "proyectos"
COMMON_HEADINGS = {
    "PROBLEMA": "PROBLEM",
    "SEGMENTACIÓN": "SEGMENTATION",
    "HALLAZGOS": "FINDINGS",
    "USER & MARKET RESEARCH": "USER & MARKET RESEARCH",
    "PROCESO": "PROCESS",
    "EMPATIZAR": "EMPATHIZE",
    "DEFINIR": "DEFINE",
    "IDEAR": "IDEATE",
    "PROTOTIPAR": "PROTOTYPE",
    "TESTEAR": "TEST",
    "DESK RESEARCH": "DESK RESEARCH",
    "USER INTERVIEWS": "USER INTERVIEWS",
    "DIAGRAMA DE AFINIDAD": "AFFINITY DIAGRAM",
    "USER PERSONA": "USER PERSONA",
    "USER JOURNEY": "USER JOURNEY",
    "JOB STORIES": "JOB STORIES",
    "FEATURE PRIORIZATION": "FEATURE PRIORITIZATION",
    "USER FLOWS": "USER FLOWS",
    "ARQUITECTURA DE INFORMACIÓN": "INFORMATION ARCHITECTURE",
    "DISEÑAR WIREFRAMES": "DESIGN WIREFRAMES",
    "GUÍA DE ESTILO": "STYLE GUIDE",
}


def polish_headings(spanish_article, english_article):
    source_headings = spanish_article.select("h2, h3, h4, h5, h6")
    target_headings = english_article.select("h2, h3, h4, h5, h6")
    if len(source_headings) != len(target_headings):
        return False
    changed = False
    for source, target in zip(source_headings, target_headings):
        label = source.get_text(" ", strip=True).replace("\u200d", "").strip()
        if not label:
            target.decompose()
            changed = True
        elif label.upper() in COMMON_HEADINGS:
            strong = target.find("strong")
            if (strong or target).get_text(strip=True) != COMMON_HEADINGS[label.upper()]:
                (strong or target).string = COMMON_HEADINGS[label.upper()]
                changed = True
    return changed


def snapshot():
    source = (ROOT / "portfolio-data.js").read_text(encoding="utf-8")
    payload = source.split("window.PORTFOLIO_DATA = ", 1)[1].rsplit(";", 1)[0]
    return {project["id"]: project for project in json.loads(payload)["projects"]}


def translator():
    languages = argostranslate.translate.get_installed_languages()
    spanish = next((item for item in languages if item.code == "es"), None)
    english = next((item for item in languages if item.code == "en"), None)
    if spanish and english:
        translation = spanish.get_translation(english)
        if translation:
            return translation
    argostranslate.package.update_package_index()
    package = next(
        (item for item in argostranslate.package.get_available_packages()
         if item.from_code == "es" and item.to_code == "en"),
        None,
    )
    if not package:
        raise RuntimeError("Argos Spanish-to-English model is unavailable")
    argostranslate.package.install_from_path(package.download())
    languages = argostranslate.translate.get_installed_languages()
    return next(item for item in languages if item.code == "es").get_translation(
        next(item for item in languages if item.code == "en")
    )


def current_translation(path, source_hash):
    if not path.exists():
        return False
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    marker = soup.find("meta", attrs={"name": "translation-source-hash"})
    return marker is not None and marker.get("content") == source_hash


def polish_existing(path, spanish):
    english = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    changed = False
    if polish_headings(spanish.select_one("article.project-article"),
                       english.select_one("article.project-article")):
        changed = True
    original_urls = {
        link.get("href"): link.get_text(strip=True)
        for link in spanish.select("article.project-article a")
        if link.get_text(strip=True).startswith(("https://", "http://"))
    }
    for link in english.select("article.project-article a"):
        original = original_urls.get(link.get("href"))
        if original and link.get_text(strip=True) != original:
            link.string = original
            changed = True
    intro = english.select_one(".project-intro")
    if intro and not intro.select_one(".project-translation-note"):
        note = english.new_tag("p", attrs={"class": "project-translation-note"})
        note.string = "Automatically translated from the Spanish original."
        intro.append(note)
        changed = True
    if changed:
        path.write_text(str(english) + "\n", encoding="utf-8")


def translate_page(soup, project, source_hash, translation):
    article = soup.select_one("article.project-article")
    translated = translatehtml.translate_html(translation, str(article))
    translated_article = BeautifulSoup(str(translated), "html.parser").select_one("article")
    if translated_article is None:
        raise RuntimeError(f"Translation removed the article for {project['id']}")
    source_links = article.select("a")
    translated_links = translated_article.select("a")
    if len(source_links) != len(translated_links):
        raise RuntimeError(f"Translation changed the links for {project['id']}")
    for source_link, translated_link in zip(source_links, translated_links):
        if source_link.get_text(strip=True).startswith(("https://", "http://")):
            translated_link.string = source_link.get_text(strip=True)
    polish_headings(article, translated_article)
    article.replace_with(translated_article)

    soup.html["lang"] = "en"
    marker = soup.new_tag("meta", attrs={"name": "translation-source-hash", "content": source_hash})
    soup.head.append(marker)
    description = project.get("description") or {}
    english_description = description.get("en") or ""
    if not english_description or english_description == description.get("es"):
        english_description = translation.translate(description.get("es") or "")
    meta_description = soup.find("meta", attrs={"name": "description"})
    if meta_description:
        meta_description["content"] = english_description or project["name"]
    page_description = soup.select_one(".project-description")
    if page_description:
        page_description.string = english_description
    intro = soup.select_one(".project-intro")
    note = soup.new_tag("p", attrs={"class": "project-translation-note"})
    note.string = "Automatically translated from the Spanish original."
    intro.append(note)

    soup.select_one(".project-languages")["aria-label"] = "Language"
    for link in soup.select(".project-lang"):
        active = link.get("lang") == "en"
        link["class"] = ["project-lang", "active"] if active else ["project-lang"]
        if active:
            link["aria-current"] = "page"
        else:
            link.attrs.pop("aria-current", None)
        label = "English (UK)" if active else "Spanish (Spain)"
        link["aria-label"] = label
        link["title"] = label

    soup.select_one(".project-back").string = "← All projects"
    end_link = soup.select_one(".project-end a")
    if end_link:
        end_link.string = "← Back to projects"
    for link in soup.select('a[href*="notion."]'):
        if "Ver en Notion" in link.get_text() or "View in Notion" in link.get_text():
            link.string = "View in Notion ↗"


def main():
    projects = snapshot()
    pending = []
    for folder in PROJECTS.iterdir():
        if not folder.is_dir() or folder.name not in projects:
            continue
        spanish = folder / "index.html"
        english = folder / "en.html"
        source = spanish.read_bytes()
        soup = BeautifulSoup(source, "html.parser")
        if soup.select_one("article.project-article") is None:
            english.unlink(missing_ok=True)
            continue
        source_hash = hashlib.sha256(source).hexdigest()
        if current_translation(english, source_hash):
            polish_existing(english, soup)
        else:
            pending.append((english, soup, projects[folder.name], source_hash))

    if not pending:
        print("English project pages are current")
        return
    translation = translator()
    for destination, soup, project, source_hash in pending:
        translate_page(soup, project, source_hash, translation)
        destination.write_text(str(soup) + "\n", encoding="utf-8")
        print(f"Translated {project['name']}")


if __name__ == "__main__":
    main()
