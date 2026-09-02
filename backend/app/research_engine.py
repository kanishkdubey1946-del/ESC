"""
COMET real-world research & evidence engine.

All live retrieval happens here (backend-only). No sample/mock research data.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Callable, Optional
from urllib.parse import parse_qs, unquote, urlparse

import httpx
from bs4 import BeautifulSoup

# ─── Config ──────────────────────────────────────────────────────────────────

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "").strip()
BRAVE_API_KEY = os.getenv("BRAVE_API_KEY", "").strip()
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "").strip()
MAX_QUERIES = 4
MAX_RESULTS_PER_QUERY = 6
MAX_PAGES_TO_FETCH = 7
PAGE_TEXT_LIMIT = 12_000
EVIDENCE_SNIPPET_LIMIT = 900
CACHE_TTL_SECONDS = 30 * 60

_search_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_page_cache: dict[str, tuple[float, dict[str, Any]]] = {}

BLOCKED_HOST_PREFIXES = (
    "localhost", "127.0.0.1", "0.0.0.0", "169.254.", "10.",
    "192.168.", "172.16.", "172.17.", "172.18.", "172.19.",
    "172.20.", "172.21.", "172.22.", "172.23.", "172.24.",
    "172.25.", "172.26.", "172.27.", "172.28.", "172.29.",
    "172.30.", "172.31.",
)

AUTHORITY_DOMAINS = {
    # governments / institutions
    "gov": 0.95, "gov.in": 0.95, "nic.in": 0.92, "edu": 0.9, "ac.in": 0.9,
    "who.int": 0.93, "worldbank.org": 0.9, "imf.org": 0.9, "oecd.org": 0.9,
    "un.org": 0.9, "unesco.org": 0.88, "data.gov": 0.93, "data.gov.in": 0.93,
    "census.gov": 0.92, "censusindia.gov.in": 0.92, "rbi.org.in": 0.9,
    "mospi.gov.in": 0.92, "niti.gov.in": 0.9, "sebi.gov.in": 0.88,
    # academic / research
    "nature.com": 0.9, "science.org": 0.9, "nih.gov": 0.92, "pubmed.ncbi.nlm.nih.gov": 0.9,
    "arxiv.org": 0.82, "ssrn.com": 0.8, "jstor.org": 0.88, "springer.com": 0.85,
    "ieee.org": 0.85, "acm.org": 0.85, "harvard.edu": 0.9, "mit.edu": 0.9,
    "stanford.edu": 0.9, "ox.ac.uk": 0.9, "cam.ac.uk": 0.9,
    # established news / industry
    "reuters.com": 0.85, "bbc.com": 0.84, "bbc.co.uk": 0.84, "apnews.com": 0.85,
    "economist.com": 0.84, "ft.com": 0.84, "bloomberg.com": 0.83, "wsj.com": 0.83,
    "nytimes.com": 0.82, "thehindu.com": 0.8, "indianexpress.com": 0.78,
    "livemint.com": 0.78, "business-standard.com": 0.78, "forbes.com": 0.75,
    "techcrunch.com": 0.72, "statista.com": 0.8, "mckinsey.com": 0.82,
    "deloitte.com": 0.8, "pwc.com": 0.8, "kpmg.com": 0.8, "ey.com": 0.8,
    "wikipedia.org": 0.7, "en.wikipedia.org": 0.7,
    # tech docs
    "docs.python.org": 0.9, "developer.mozilla.org": 0.9, "react.dev": 0.88,
    "github.com": 0.72, "stackoverflow.com": 0.65,
}

LOW_QUALITY_HINTS = (
    "clickbait", "listicle", "content farm", "ai-generated", "sponsored post",
)


# ─── Models ──────────────────────────────────────────────────────────────────

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class ResearchEvent:
    id: str
    stage: str
    status: str  # pending | active | completed | failed
    message: str
    timestamp: str = field(default_factory=utc_now_iso)
    detail: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class SourceRecord:
    sourceId: str
    citationNumber: int
    title: str
    publisher: str
    domain: str
    url: str
    sourceType: str
    publicationDate: str | None
    retrievedAt: str
    author: str | None
    reliabilityLevel: str
    relevanceScore: float
    verificationStatus: str
    purpose: str
    evidenceSnippets: list[str]
    lastUpdatedDate: str | None = None
    agentIds: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def normalize_source_date(raw: str | None) -> str | None:
    """
    Parse real metadata date strings into ISO date (YYYY-MM-DD) when possible.
    Never invent dates — returns None if the value cannot be verified as a date.
    """
    if not raw:
        return None
    text = str(raw).strip()
    if not text or text.lower() in {"none", "null", "n/a", "unknown", "tbd"}:
        return None

    # ISO / common machine formats first
    candidates = [
        text,
        text.replace("Z", "+00:00"),
        text[:10] if re.match(r"^\d{4}-\d{2}-\d{2}", text) else "",
    ]
    for candidate in candidates:
        if not candidate:
            continue
        try:
            # date-only
            if re.fullmatch(r"\d{4}-\d{2}-\d{2}", candidate):
                datetime.strptime(candidate, "%Y-%m-%d")
                return candidate
            dt = datetime.fromisoformat(candidate)
            return dt.date().isoformat()
        except Exception:  # noqa: BLE001
            pass

    # RFC 2822 style (RSS pubDate): Mon, 14 Jul 2026 12:00:00 GMT
    cleaned = re.sub(r"\s+", " ", text).strip()
    cleaned = re.sub(r"\s+(GMT|UTC|UT|[+-]\d{4})$", "", cleaned, flags=re.I).strip()
    for fmt in (
        "%a, %d %b %Y %H:%M:%S",
        "%a, %d %b %Y %H:%M:%S %z",
        "%d %b %Y %H:%M:%S",
        "%d %b %Y",
        "%B %d, %Y",
        "%d %B %Y",
        "%Y/%m/%d",
        "%d/%m/%Y",
        "%m/%d/%Y",
    ):
        try:
            dt = datetime.strptime(cleaned[:31].strip(), fmt)
            return dt.date().isoformat()
        except Exception:  # noqa: BLE001
            continue

    # Last resort: extract YYYY-MM-DD substring only if present in metadata
    m = re.search(r"(20\d{2}|19\d{2})-(\d{2})-(\d{2})", text)
    if m:
        try:
            datetime.strptime(m.group(0), "%Y-%m-%d")
            return m.group(0)
        except Exception:  # noqa: BLE001
            return None
    return None


def extract_page_dates(soup: BeautifulSoup) -> tuple[str | None, str | None]:
    """Return (publicationDate, lastUpdatedDate) from real page metadata only."""
    pub_selectors = [
        ('meta[property="article:published_time"]', "content"),
        ('meta[name="article:published_time"]', "content"),
        ('meta[name="pubdate"]', "content"),
        ('meta[name="publish-date"]', "content"),
        ('meta[name="publication_date"]', "content"),
        ('meta[name="date"]', "content"),
        ('meta[itemprop="datePublished"]', "content"),
        ('meta[property="og:published_time"]', "content"),
        ("time[datetime][pubdate]", "datetime"),
        ('time[itemprop="datePublished"]', "datetime"),
    ]
    updated_selectors = [
        ('meta[property="article:modified_time"]', "content"),
        ('meta[property="og:updated_time"]', "content"),
        ('meta[name="last-modified"]', "content"),
        ('meta[itemprop="dateModified"]', "content"),
        ('time[itemprop="dateModified"]', "datetime"),
    ]

    publication: str | None = None
    for selector, attr in pub_selectors:
        el = soup.select_one(selector)
        if not el:
            continue
        raw = el.get(attr) or el.get("content") or el.get("datetime") or el.get_text(strip=True)
        publication = normalize_source_date(raw)
        if publication:
            break

    if not publication:
        # Generic time element only if datetime attr exists (real markup, not invented)
        for el in soup.select("time[datetime]"):
            publication = normalize_source_date(el.get("datetime"))
            if publication:
                break

    updated: str | None = None
    for selector, attr in updated_selectors:
        el = soup.select_one(selector)
        if not el:
            continue
        raw = el.get(attr) or el.get("content") or el.get("datetime") or el.get_text(strip=True)
        updated = normalize_source_date(raw)
        if updated:
            break

    return publication, updated


# ─── Classification ──────────────────────────────────────────────────────────

LIVE_RESEARCH_TERMS = re.compile(
    r"\b("
    r"market|competitor|competitors|industry|pricing|price|trend|trends|news|"
    r"current|latest|recent|today|202[0-9]|regulation|policy|government|"
    r"statistic|statistics|growth|tam|sam|som|demand|opportunity|opportunities|"
    r"company|companies|startup|revenue|funding|location|city|india|indian|"
    r"fitness|gym|sector|landscape|benchmark|compare|versus|vs|"
    r"research|analyse|analyze|analysis|report|survey|census|"
    r"technology|framework|library|api documentation|official docs"
    r")\b",
    re.I,
)

UPLOAD_TERMS = re.compile(
    r"\b("
    r"this (pdf|document|file|paper|notes|syllabus|deck|presentation)|"
    r"uploaded|my notes|from the document|summarize this|summarise this|"
    r"based on (the |my )?(document|pdf|notes|file|paper)|"
    r"previous[- ]year|pyq|study material"
    r")\b",
    re.I,
)

GENERAL_TERMS = re.compile(
    r"\b("
    r"brainstorm|rewrite|rephrase|creative|idea|ideas|outline draft|"
    r"encourage|motivation|study tips|explain conceptually|"
    r"help me write|draft a message"
    r")\b",
    re.I,
)

RESEARCH_HEAVY_AGENTS = {
    "research", "market", "strategy", "finance", "marketing", "pitch",
    "development", "examinsight", "specialisthub", "studyvault",
}


def classify_request(
    prompt: str,
    agent_id: str,
    has_uploads: bool,
    force_research: bool | None = None,
) -> dict[str, Any]:
    text = (prompt or "").strip()
    live = bool(LIVE_RESEARCH_TERMS.search(text)) or agent_id in {"research", "market"}
    upload = has_uploads or bool(UPLOAD_TERMS.search(text))
    general = bool(GENERAL_TERMS.search(text)) and not live

    if force_research is True:
        live = True
    elif force_research is False:
        live = False

    # An uploaded document is an explicit source-bound question.  Do not quietly
    # mix web search into its answer: the user can run a separate web search when
    # they want outside material.
    if has_uploads and force_research is not True:
        classification = "uploaded_sources"
        live = False
    # Student agents: prefer uploads; live only when current/external facts asked
    elif agent_id in {"studyvault", "successarchitect", "guideminds"} and upload and not live:
        classification = "uploaded_sources"
        live = False
    elif live and upload:
        classification = "live_and_uploaded"
    elif live:
        classification = "live_research"
    elif upload:
        classification = "uploaded_sources"
    elif general or agent_id in {"guideminds", "content"}:
        classification = "general_reasoning"
        live = False
    elif agent_id in RESEARCH_HEAVY_AGENTS:
        classification = "live_research"
        live = True
    else:
        classification = "general_reasoning"
        live = False

    return {
        "classification": classification,
        "liveResearchRequired": live,
        "uploadedSourcesRequired": upload,
        "generalReasoning": classification == "general_reasoning",
        "reason": (
            "Request depends on current/external factual information."
            if live and not upload
            else "Request should use uploaded material and external research."
            if live and upload
            else "Request is grounded in user-uploaded sources."
            if upload
            else "Creative/general reasoning; live search not required."
        ),
    }


# ─── Query planning ──────────────────────────────────────────────────────────

def plan_queries(prompt: str, agent_id: str, max_queries: int = MAX_QUERIES) -> list[str]:
    cleaned = re.sub(r"\s+", " ", (prompt or "").strip())
    if not cleaned:
        return []

    base = cleaned[:180]
    queries = [base]

    lower = cleaned.lower()
    if any(k in lower for k in ("market", "industry", "fitness", "gym", "startup", "business")):
        queries.append(f"{base} market size growth statistics")
        queries.append(f"{base} competitors landscape")
    if any(k in lower for k in ("india", "indian", "delhi", "mumbai", "bangalore", "bengaluru")):
        queries.append(f"{base} India official statistics")
    if any(k in lower for k in ("regulation", "policy", "law", "government")):
        queries.append(f"{base} government regulation policy")
    if any(k in lower for k in ("exam", "syllabus", "curriculum", "university")):
        queries.append(f"{base} official syllabus exam pattern")
    if agent_id in {"development", "specialisthub"}:
        queries.append(f"{base} official documentation")

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for q in queries:
        key = q.lower()
        if key not in seen:
            seen.add(key)
            unique.append(q)
    return unique[:max_queries]


# ─── Source quality ──────────────────────────────────────────────────────────

def domain_of(url: str) -> str:
    try:
        host = urlparse(url).hostname or ""
        return host.lower().removeprefix("www.")
    except Exception:
        return ""


def is_blocked_url(url: str) -> bool:
    host = domain_of(url)
    if not host:
        return True
    return any(host == b or host.startswith(b) for b in BLOCKED_HOST_PREFIXES)


def reliability_for_domain(domain: str) -> tuple[float, str, str]:
    """Return (score 0-1, reliabilityLevel, sourceType)."""
    d = domain.lower()
    if d.endswith(".gov") or d.endswith(".gov.in") or ".gov." in d:
        return 0.95, "High", "government"
    if d.endswith(".edu") or d.endswith(".ac.in") or d.endswith(".ac.uk"):
        return 0.9, "High", "academic"
    for known, score in AUTHORITY_DOMAINS.items():
        if d == known or d.endswith("." + known):
            level = "High" if score >= 0.85 else "Moderate" if score >= 0.7 else "Limited"
            stype = (
                "government" if score >= 0.92 and ("gov" in known or "data." in known)
                else "academic" if score >= 0.85 and ("edu" in known or "arxiv" in known or "pubmed" in known)
                else "news" if score >= 0.75
                else "reference"
            )
            return score, level, stype
    if d.endswith(".org"):
        return 0.72, "Moderate", "organization"
    if d.endswith(".com") or d.endswith(".io"):
        return 0.6, "Limited", "web"
    return 0.55, "Limited", "web"


STOPWORDS = {
    "the", "and", "for", "with", "from", "that", "this", "into", "about", "over",
    "under", "your", "our", "their", "what", "when", "where", "which", "will",
    "would", "could", "should", "have", "has", "had", "are", "was", "were",
    "been", "being", "than", "then", "also", "just", "more", "most", "some",
    "any", "all", "not", "but", "can", "may", "how", "why", "who", "its",
}

LOW_TRUST_DOMAINS = {
    "pinterest.com", "quora.com", "medium.com", "blogspot.com", "wordpress.com",
    "tumblr.com", "reddit.com", "facebook.com", "instagram.com", "tiktok.com",
    "news.google.com",  # aggregator — prefer original publishers when resolved
}


def score_source(title: str, snippet: str, url: str, query: str) -> dict[str, Any]:
    """
    Multi-dimensional source scoring.
    Returns 0–1 scores plus acceptance flag.
    Direct topic relevance is mandatory (not authority alone).
    """
    domain = domain_of(url)
    authority, level, stype = reliability_for_domain(domain)
    text = f"{title} {snippet}".lower()
    title_l = (title or "").lower()

    q_terms = [
        t for t in re.findall(r"[a-z0-9]{3,}", (query or "").lower())
        if t not in STOPWORDS
    ]
    # Prefer longer / distinctive terms
    significant = [t for t in q_terms if len(t) >= 4] or q_terms
    hits = sum(1 for t in significant if t in text)
    title_hits = sum(1 for t in significant if t in title_l)
    coverage = hits / max(len(significant), 1) if significant else 0.0
    title_coverage = title_hits / max(len(significant), 1) if significant else 0.0

    # Pure topic relevance (0–1): keyword coverage weighted toward title matches
    relevance = min(1.0, (coverage * 0.65) + (title_coverage * 0.35))
    # Require multi-term match for multi-word queries
    if len(significant) >= 3 and hits < 2:
        relevance = min(relevance, 0.45)
    if len(significant) >= 4 and title_hits < 1:
        relevance = min(relevance, 0.55)

    # Evidence quality proxy from snippet length + term density
    evidence = 0.35
    if len(snippet or "") >= 80:
        evidence += 0.25
    if len(snippet or "") >= 160:
        evidence += 0.15
    if hits >= 3:
        evidence += 0.15
    if title_hits >= 2:
        evidence += 0.1
    evidence = min(1.0, evidence)

    # Freshness unknown unless metadata present — neutral mid score
    freshness = 0.55

    # Authority penalties
    if domain in LOW_TRUST_DOMAINS or any(domain.endswith("." + d) for d in LOW_TRUST_DOMAINS):
        authority *= 0.55
        level = "Limited"
        stype = "aggregator" if "news.google" in domain else stype
    if any(h in text for h in LOW_QUALITY_HINTS):
        authority *= 0.65
        evidence *= 0.7
        level = "Limited"
    if not title or len(title.strip()) < 8:
        relevance *= 0.5
        evidence *= 0.6
    if not domain:
        authority = 0.2
        level = "Limited"

    overall = round((relevance * 0.40) + (authority * 0.30) + (evidence * 0.20) + (freshness * 0.10), 3)
    # Acceptance: relevance is mandatory
    accepted = relevance >= 0.55 and overall >= 0.50 and bool(domain) and bool((title or "").strip())

    if overall >= 0.8 and relevance >= 0.7:
        level = "High" if level != "Limited" else level
    elif overall < 0.55:
        level = "Limited"

    return {
        "domain": domain,
        "reliabilityScore": round(authority, 3),
        "reliabilityLevel": level,
        "sourceType": stype,
        "relevanceScore": round(relevance, 3),  # pure topic relevance
        "authorityScore": round(authority, 3),
        "freshnessScore": freshness,
        "evidenceScore": round(evidence, 3),
        "overallConfidence": overall,
        "accepted": accepted,
        # Combined ranking key used by pipeline
        "rankScore": round((relevance * 0.55) + (overall * 0.45), 3),
    }


# ─── Search providers ────────────────────────────────────────────────────────

def _cache_get(cache: dict[str, tuple[float, Any]], key: str) -> Any | None:
    item = cache.get(key)
    if not item:
        return None
    ts, value = item
    if time.time() - ts > CACHE_TTL_SECONDS:
        cache.pop(key, None)
        return None
    return value


def _cache_set(cache: dict[str, tuple[float, Any]], key: str, value: Any) -> None:
    cache[key] = (time.time(), value)


async def search_tavily(client: httpx.AsyncClient, query: str) -> list[dict[str, Any]]:
    if not TAVILY_API_KEY:
        return []
    response = await client.post(
        "https://api.tavily.com/search",
        json={
            "api_key": TAVILY_API_KEY,
            "query": query,
            "search_depth": "basic",
            "include_answer": False,
            "max_results": MAX_RESULTS_PER_QUERY,
        },
        timeout=30.0,
    )
    if response.status_code != 200:
        raise RuntimeError(f"Tavily search failed ({response.status_code})")
    data = response.json()
    results = []
    for item in data.get("results", [])[:MAX_RESULTS_PER_QUERY]:
        results.append({
            "title": item.get("title") or item.get("url") or "Untitled",
            "url": item.get("url") or "",
            "snippet": item.get("content") or item.get("snippet") or "",
            "provider": "tavily",
        })
    return [r for r in results if r["url"]]


async def search_brave(client: httpx.AsyncClient, query: str) -> list[dict[str, Any]]:
    if not BRAVE_API_KEY:
        return []
    response = await client.get(
        "https://api.search.brave.com/res/v1/web/search",
        params={"q": query, "count": MAX_RESULTS_PER_QUERY},
        headers={"Accept": "application/json", "X-Subscription-Token": BRAVE_API_KEY},
        timeout=30.0,
    )
    if response.status_code != 200:
        raise RuntimeError(f"Brave search failed ({response.status_code})")
    data = response.json()
    results = []
    for item in (data.get("web") or {}).get("results", [])[:MAX_RESULTS_PER_QUERY]:
        results.append({
            "title": item.get("title") or item.get("url") or "Untitled",
            "url": item.get("url") or "",
            "snippet": item.get("description") or "",
            "provider": "brave",
        })
    return [r for r in results if r["url"]]


async def search_serper(client: httpx.AsyncClient, query: str) -> list[dict[str, Any]]:
    if not SERPER_API_KEY:
        return []
    response = await client.post(
        "https://google.serper.dev/search",
        headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
        json={"q": query, "num": MAX_RESULTS_PER_QUERY},
        timeout=30.0,
    )
    if response.status_code != 200:
        raise RuntimeError(f"Serper search failed ({response.status_code})")
    data = response.json()
    results = []
    for item in data.get("organic", [])[:MAX_RESULTS_PER_QUERY]:
        results.append({
            "title": item.get("title") or item.get("link") or "Untitled",
            "url": item.get("link") or "",
            "snippet": item.get("snippet") or "",
            "provider": "serper",
        })
    return [r for r in results if r["url"]]


def _parse_ddg_html(html: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    results: list[dict[str, Any]] = []
    for result in soup.select(".result, .web-result, tr"):
        link = result.select_one("a.result__a, a.result-link, a[href]")
        snippet_el = result.select_one(".result__snippet, .result-snippet, td")
        if not link or not link.get("href"):
            continue
        href = link["href"]
        if "uddg=" in href:
            qs = parse_qs(urlparse(href).query)
            href = unquote(qs.get("uddg", [href])[0])
        if not href.startswith("http") or "duckduckgo.com" in href:
            continue
        title = link.get_text(" ", strip=True)
        snippet = snippet_el.get_text(" ", strip=True) if snippet_el else ""
        if not title or len(title) < 3:
            continue
        results.append({
            "title": title or href,
            "url": href,
            "snippet": snippet,
            "provider": "duckduckgo",
        })
        if len(results) >= MAX_RESULTS_PER_QUERY:
            break
    return results


async def search_duckduckgo(client: httpx.AsyncClient, query: str) -> list[dict[str, Any]]:
    """Multi-endpoint DuckDuckGo search (no API key). Best-effort."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    attempts: list[tuple[str, str, dict[str, Any] | None]] = [
        ("POST", "https://html.duckduckgo.com/html/", {"q": query, "b": "", "kl": "wt-wt"}),
        ("GET", "https://html.duckduckgo.com/html/", None),
        ("GET", "https://lite.duckduckgo.com/lite/", None),
    ]
    last_status = None
    for method, url, data in attempts:
        try:
            if method == "POST":
                response = await client.post(
                    url,
                    data=data,
                    headers={**headers, "Content-Type": "application/x-www-form-urlencoded"},
                    timeout=30.0,
                    follow_redirects=True,
                )
            else:
                response = await client.get(
                    url,
                    params={"q": query},
                    headers=headers,
                    timeout=30.0,
                    follow_redirects=True,
                )
            last_status = response.status_code
            if response.status_code not in (200, 202, 301, 302):
                continue
            parsed = _parse_ddg_html(response.text)
            if parsed:
                return parsed
        except Exception:  # noqa: BLE001
            continue

    # Instant Answer API
    lite = await client.get(
        "https://api.duckduckgo.com/",
        params={"q": query, "format": "json", "no_html": 1, "skip_disambig": 1},
        headers={"User-Agent": "COMET-Research/1.0"},
        timeout=20.0,
    )
    results: list[dict[str, Any]] = []
    if lite.status_code == 200:
        data = lite.json()
        if data.get("AbstractURL"):
            results.append({
                "title": data.get("Heading") or data.get("AbstractURL"),
                "url": data["AbstractURL"],
                "snippet": data.get("AbstractText") or "",
                "provider": "duckduckgo-instant",
            })
        for topic in data.get("RelatedTopics", [])[:MAX_RESULTS_PER_QUERY]:
            if isinstance(topic, dict) and topic.get("FirstURL"):
                results.append({
                    "title": (topic.get("Text") or "")[:120] or topic["FirstURL"],
                    "url": topic["FirstURL"],
                    "snippet": topic.get("Text") or "",
                    "provider": "duckduckgo-instant",
                })
            elif isinstance(topic, dict) and topic.get("Topics"):
                for sub in topic["Topics"][:3]:
                    if sub.get("FirstURL"):
                        results.append({
                            "title": (sub.get("Text") or "")[:120] or sub["FirstURL"],
                            "url": sub["FirstURL"],
                            "snippet": sub.get("Text") or "",
                            "provider": "duckduckgo-instant",
                        })
    if results:
        return results[:MAX_RESULTS_PER_QUERY]
    if last_status:
        raise RuntimeError(f"DuckDuckGo search failed ({last_status})")
    raise RuntimeError("DuckDuckGo search returned no results.")


async def search_google_news(client: httpx.AsyncClient, query: str) -> list[dict[str, Any]]:
    """Google News RSS — free, no API key, good for current events."""
    response = await client.get(
        "https://news.google.com/rss/search",
        params={"q": query, "hl": "en-IN", "gl": "IN", "ceid": "IN:en"},
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            ),
            "Accept": "application/rss+xml, application/xml, text/xml, */*",
        },
        timeout=25.0,
        follow_redirects=True,
    )
    if response.status_code != 200:
        raise RuntimeError(f"Google News RSS failed ({response.status_code})")
    soup = BeautifulSoup(response.text, "xml")
    results: list[dict[str, Any]] = []
    for item in soup.select("item")[:MAX_RESULTS_PER_QUERY]:
        title = (item.title.string if item.title else "") or ""
        link = (item.link.string if item.link else "") or ""
        desc = (item.description.string if item.description else "") or ""
        desc = BeautifulSoup(desc, "html.parser").get_text(" ", strip=True)
        pub_raw = (item.pubDate.string if item.pubDate else None) or (
            item.find("dc:date").string if item.find("dc:date") else None
        )
        if not link:
            continue
        results.append({
            "title": title or link,
            "url": link,
            "snippet": desc[:EVIDENCE_SNIPPET_LIMIT],
            "provider": "google-news",
            "publicationDate": normalize_source_date(pub_raw),
        })
    if not results:
        raise RuntimeError("Google News RSS returned no items.")
    return results


async def search_bing(client: httpx.AsyncClient, query: str) -> list[dict[str, Any]]:
    """Bing HTML search (no API key). Prefer cite domain + resolved destination URL."""
    response = await client.get(
        "https://www.bing.com/search",
        params={"q": f'"{query}"', "setlang": "en-US"},
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        },
        timeout=30.0,
        follow_redirects=True,
    )
    if response.status_code != 200:
        raise RuntimeError(f"Bing search failed ({response.status_code})")
    soup = BeautifulSoup(response.text, "html.parser")
    results: list[dict[str, Any]] = []
    for li in soup.select("li.b_algo"):
        link = li.select_one("h2 a")
        snippet_el = li.select_one(".b_caption p, .b_lineclamp2, .b_lineclamp3, p")
        cite = li.select_one("cite")
        if not link or not link.get("href"):
            continue
        href = link["href"]
        if not href.startswith("http"):
            continue
        # Resolve tracking redirects to a real destination when possible
        final_url = href
        try:
            resolved = await client.head(href, follow_redirects=True, timeout=12.0)
            if str(resolved.url).startswith("http") and "bing.com/ck" not in str(resolved.url):
                final_url = str(resolved.url)
        except Exception:  # noqa: BLE001
            if cite and cite.get_text(strip=True).startswith("http"):
                final_url = cite.get_text(strip=True).split()[0]
        results.append({
            "title": link.get_text(" ", strip=True) or final_url,
            "url": final_url,
            "snippet": snippet_el.get_text(" ", strip=True) if snippet_el else "",
            "provider": "bing",
        })
        if len(results) >= MAX_RESULTS_PER_QUERY:
            break
    if not results:
        raise RuntimeError("Bing search returned no parseable results.")
    return results


async def search_web(client: httpx.AsyncClient, query: str) -> tuple[list[dict[str, Any]], str]:
    cache_key = query.strip().lower()
    cached = _cache_get(_search_cache, cache_key)
    if cached is not None:
        return cached, "cache"

    errors: list[str] = []
    # Prefer Google News + Bing on networks where DDG/Wikipedia are blocked.
    providers: list[tuple[str, Any]] = [
        ("tavily", search_tavily),
        ("brave", search_brave),
        ("serper", search_serper),
        ("google-news", search_google_news),
        ("bing", search_bing),
        ("duckduckgo", search_duckduckgo),
    ]
    for name, fn in providers:
        if name == "tavily" and not TAVILY_API_KEY:
            continue
        if name == "brave" and not BRAVE_API_KEY:
            continue
        if name == "serper" and not SERPER_API_KEY:
            continue
        try:
            results = await fn(client, query)
            if results:
                _cache_set(_search_cache, cache_key, results)
                return results, name
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{name}: {exc}")
            continue

    if errors:
        raise RuntimeError("All search providers failed: " + "; ".join(errors[:4]))
    raise RuntimeError("No search provider returned results.")


# ─── Page fetch ──────────────────────────────────────────────────────────────

async def fetch_page(client: httpx.AsyncClient, url: str) -> dict[str, Any]:
    if is_blocked_url(url):
        return {"success": False, "error": "Blocked internal URL", "url": url}

    cached = _cache_get(_page_cache, url)
    if cached is not None:
        return cached

    try:
        response = await client.get(
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,text/plain,application/json",
                "Accept-Language": "en-US,en;q=0.9",
            },
            timeout=25.0,
            follow_redirects=True,
        )
    except Exception as exc:  # noqa: BLE001
        return {"success": False, "error": str(exc)[:200], "url": url}

    if response.status_code != 200:
        return {"success": False, "error": f"HTTP {response.status_code}", "url": url}

    content_type = response.headers.get("content-type", "")
    retrieved_at = utc_now_iso()

    if "application/json" in content_type:
        text = response.text[:PAGE_TEXT_LIMIT]
        result = {
            "success": True,
            "url": str(response.url),
            "title": domain_of(str(response.url)),
            "text": text,
            "publicationDate": None,
            "retrievedAt": retrieved_at,
        }
        _cache_set(_page_cache, url, result)
        return result

    if "text/html" not in content_type and "text/plain" not in content_type:
        return {"success": False, "error": f"Unsupported content type: {content_type[:80]}", "url": url}

    soup = BeautifulSoup(response.text[:500_000], "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript"]):
        tag.decompose()

    title = soup.title.string.strip() if soup.title and soup.title.string else domain_of(str(response.url))
    publication, last_updated = extract_page_dates(soup)

    lines = [ln.strip() for ln in soup.get_text("\n", strip=True).splitlines() if ln.strip()]
    text = "\n".join(lines)[:PAGE_TEXT_LIMIT]
    result = {
        "success": True,
        "url": str(response.url),
        "title": title,
        "text": text,
        "publicationDate": publication,
        "lastUpdatedDate": last_updated,
        "retrievedAt": retrieved_at,
    }
    _cache_set(_page_cache, url, result)
    return result


def extract_snippets(text: str, query: str, limit: int = 3) -> list[str]:
    if not text:
        return []
    terms = [t for t in re.findall(r"[a-z0-9]{4,}", query.lower())][:12]
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if len(p.strip()) > 60]
    if not paragraphs:
        paragraphs = [text[i : i + 500] for i in range(0, min(len(text), 2500), 500)]

    scored: list[tuple[int, str]] = []
    for para in paragraphs:
        lower = para.lower()
        score = sum(1 for t in terms if t in lower)
        if score:
            scored.append((score, para[:EVIDENCE_SNIPPET_LIMIT]))
    scored.sort(key=lambda x: x[0], reverse=True)
    snippets = [s for _, s in scored[:limit]]
    if not snippets and text:
        snippets = [text[:EVIDENCE_SNIPPET_LIMIT]]
    return snippets


def source_id_for(url: str) -> str:
    return "src_" + hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]


# ─── Uploaded sources ────────────────────────────────────────────────────────

def build_upload_sources(
    uploads: list[dict[str, Any]],
    agent_id: str,
    query: str,
    start_citation: int = 1,
) -> list[SourceRecord]:
    sources: list[SourceRecord] = []
    citation = start_citation
    for item in uploads:
        name = str(item.get("name") or "Uploaded source")
        text = str(item.get("text") or "")[:PAGE_TEXT_LIMIT]
        doc_type = str(item.get("type") or "upload")
        url = str(item.get("url") or f"upload://{item.get('id') or name}")
        sid = str(item.get("id") or source_id_for(url))
        # Select passages against the actual question, not the filename.  This is
        # what lets a question be answered from a long PDF/notes upload.
        snippets = extract_snippets(text, query, limit=6) if text else []
        sources.append(
            SourceRecord(
                sourceId=sid,
                citationNumber=citation,
                title=name,
                publisher="User upload",
                domain="upload",
                url=url if url.startswith("http") else "",
                sourceType="uploaded" if doc_type != "website" else "user_website",
                publicationDate=None,
                retrievedAt=str(item.get("addedAt") or utc_now_iso()),
                author=None,
                reliabilityLevel="High",
                relevanceScore=0.95,
                verificationStatus="user_provided",
                purpose="User-provided source material",
                evidenceSnippets=snippets or ([text[:EVIDENCE_SNIPPET_LIMIT]] if text else []),
                agentIds=[agent_id],
                metadata={"uploadType": doc_type, "fullTextAvailable": bool(text)},
            )
        )
        citation += 1
    return sources


# ─── Evidence pack ───────────────────────────────────────────────────────────

def build_evidence_pack(sources: list[SourceRecord], classification: dict[str, Any]) -> str:
    if not sources:
        return (
            "EVIDENCE PACK\n"
            f"Classification: {classification.get('classification')}\n"
            "No external or uploaded evidence is available.\n"
            "You MUST NOT invent statistics, competitors, citations, URLs, or market figures.\n"
            "If a factual claim cannot be supported, write exactly: "
            "\"Reliable supporting information could not be found for this claim.\"\n"
        )

    lines = [
        "EVIDENCE PACK — ground every factual claim in these sources only.",
        f"Classification: {classification.get('classification')}",
        f"Retrieved at: {utc_now_iso()}",
        "Rules:",
        "1. Use inline citations like [1], [2] for factual claims.",
        "2. Never invent sources, URLs, statistics, competitors, or testimonials.",
        "3. Label estimates explicitly as Estimate and list assumptions.",
        "4. If sources conflict, report both values with citations.",
        "5. If evidence is missing, say reliable supporting information could not be found.",
        "6. Separate Evidence from Recommendations.",
        "",
        "SOURCES:",
    ]
    for src in sources:
        lines.append(
            f"[{src.citationNumber}] {src.title} | {src.publisher or src.domain} | "
            f"{src.domain} | reliability={src.reliabilityLevel} | type={src.sourceType}"
        )
        if src.url:
            lines.append(f"    URL: {src.url}")
        if src.publicationDate:
            lines.append(f"    Published: {src.publicationDate}")
        else:
            lines.append("    Published: Date unavailable")
        if src.lastUpdatedDate:
            lines.append(f"    Last updated: {src.lastUpdatedDate}")
        lines.append(f"    Retrieved: {src.retrievedAt}")
        lines.append(f"    Purpose: {src.purpose}")
        for snip in src.evidenceSnippets[:2]:
            lines.append(f"    Evidence: {snip[:500]}")
        lines.append("")
    return "\n".join(lines)


# ─── Full research pipeline ──────────────────────────────────────────────────

async def run_research_pipeline(
    *,
    prompt: str,
    agent_id: str = "research",
    uploads: list[dict[str, Any]] | None = None,
    force_research: bool | None = None,
    event_callback: Optional[Callable[[ResearchEvent], Any]] = None,
) -> dict[str, Any]:
    uploads = uploads or []
    events: list[ResearchEvent] = []
    event_counter = 0

    async def emit(stage: str, status: str, message: str, detail: dict[str, Any] | None = None) -> ResearchEvent:
        nonlocal event_counter
        event_counter += 1
        event = ResearchEvent(
            id=f"evt_{event_counter}",
            stage=stage,
            status=status,
            message=message,
            detail=detail or {},
        )
        events.append(event)
        if event_callback:
            maybe = event_callback(event)
            if hasattr(maybe, "__await__"):
                await maybe  # type: ignore[misc]
        return event

    await emit("understand", "completed", "Understanding your request")
    classification = classify_request(prompt, agent_id, has_uploads=bool(uploads), force_research=force_research)
    await emit(
        "classify",
        "completed",
        f"Classified as {classification['classification'].replace('_', ' ')}",
        classification,
    )

    sources: list[SourceRecord] = []
    research_failed = False
    research_error: str | None = None
    provider_used: str | None = None
    candidate_count = 0

    # Uploaded sources first
    if uploads:
        await emit("uploads", "active", f"Indexing {len(uploads)} uploaded source(s)")
        sources.extend(build_upload_sources(uploads, agent_id=agent_id, query=prompt, start_citation=1))
        await emit("uploads", "completed", f"Loaded {len(uploads)} uploaded source(s)", {"count": len(uploads)})

    live_needed = classification["liveResearchRequired"]

    if live_needed:
        await emit("queries", "active", "Creating research queries")
        queries = plan_queries(prompt, agent_id)
        await emit("queries", "completed", f"Prepared {len(queries)} research quer{'y' if len(queries) == 1 else 'ies'}", {"queries": queries})

        raw_results: list[dict[str, Any]] = []
        await emit("search", "active", "Searching trusted web sources...")
        try:
            async with httpx.AsyncClient(timeout=40.0) as client:
                for query in queries:
                    try:
                        batch, provider = await search_web(client, query)
                        provider_used = provider_used or provider
                        for item in batch:
                            item = {**item, "query": query}
                            raw_results.append(item)
                    except Exception as exc:  # noqa: BLE001
                        research_error = str(exc)[:300]
                        await emit("search", "failed", f"Search issue for one query: {research_error}", {"query": query})
        except Exception as exc:  # noqa: BLE001
            research_failed = True
            research_error = str(exc)[:300]
            await emit("search", "failed", f"Live research could not be completed: {research_error}")

        # Deduplicate by URL
        seen_urls: set[str] = set()
        unique_results: list[dict[str, Any]] = []
        for item in raw_results:
            url = item.get("url") or ""
            if not url or url in seen_urls or is_blocked_url(url):
                continue
            seen_urls.add(url)
            unique_results.append(item)

        candidate_count = len(unique_results)
        if candidate_count:
            research_failed = False
            research_error = None
            await emit("search", "completed", f"Found {candidate_count} potentially relevant sources", {"count": candidate_count, "provider": provider_used})
        elif live_needed and not research_failed:
            research_failed = True
            research_error = research_error or "No search results returned."
            await emit("search", "failed", "Live research could not be completed: no results found.")

        # Score, filter by relevance+quality, then rank
        ranked: list[tuple[float, dict[str, Any], dict[str, Any]]] = []
        rejected_count = 0
        for item in unique_results:
            scores = score_source(
                item.get("title", ""),
                item.get("snippet", ""),
                item.get("url", ""),
                item.get("query", prompt),
            )
            if not scores.get("accepted"):
                rejected_count += 1
                continue
            ranked.append((float(scores.get("rankScore") or scores["relevanceScore"]), item, scores))
        ranked.sort(key=lambda x: x[0], reverse=True)

        await emit("evaluate", "active", "Evaluating source quality and relevance...")
        selected = ranked[:MAX_PAGES_TO_FETCH]
        await emit(
            "evaluate",
            "completed",
            f"Selected {len(selected)} high-quality sources"
            + (f" ({rejected_count} rejected as low relevance/quality)" if rejected_count else ""),
            {"count": len(selected), "rejected": rejected_count, "discovered": candidate_count},
        )

        await emit("extract", "active", "Extracting evidence from sources...")
        citation_start = len(sources) + 1
        async with httpx.AsyncClient(timeout=40.0) as client:
            for idx, (score, item, scores) in enumerate(selected):
                url = item["url"]
                await emit(
                    "source_review",
                    "active",
                    f"Reviewing: {item.get('title') or scores['domain']}",
                    {
                        "url": url,
                        "title": item.get("title"),
                        "domain": scores["domain"],
                        "status": "reviewing",
                        "sourceType": scores["sourceType"],
                        "reliabilityLevel": scores["reliabilityLevel"],
                    },
                )
                page = await fetch_page(client, url)
                final_url = str(page.get("url") or url) if page.get("success") else url
                # Prefer the search result title (often better than thin landing pages)
                search_title = str(item.get("title") or "").strip()
                page_title = str(page.get("title") or "").strip() if page.get("success") else ""
                if search_title and search_title.lower() not in {"untitled", scores["domain"]}:
                    title = search_title
                elif page_title and page_title.lower() not in {"", scores["domain"], domain_of(final_url)}:
                    title = page_title
                else:
                    title = search_title or page_title or scores["domain"]

                # Re-score against resolved destination when fetch succeeded
                scores = score_source(title, item.get("snippet") or "", final_url, item.get("query") or prompt)
                text = page.get("text") if page.get("success") else ""
                snippets = extract_snippets(text or item.get("snippet") or "", prompt)
                if not snippets and item.get("snippet"):
                    snippets = [str(item["snippet"])[:EVIDENCE_SNIPPET_LIMIT]]

                verification = "verified_external" if page.get("success") and snippets else "search_snippet_only"
                if not page.get("success"):
                    await emit(
                        "source_review",
                        "completed",
                        f"Used search snippet only for {scores['domain']}",
                        {"url": final_url, "status": "snippet_only", "error": page.get("error")},
                    )
                else:
                    await emit(
                        "source_review",
                        "completed",
                        f"Extracted evidence from {scores['domain']}",
                        {"url": final_url, "title": title, "status": "completed", "domain": scores["domain"]},
                    )

                # Publication date priority: page metadata → provider metadata → None (never invent)
                publication = normalize_source_date(page.get("publicationDate")) or normalize_source_date(
                    item.get("publicationDate")
                )
                last_updated = normalize_source_date(page.get("lastUpdatedDate"))
                retrieved = page.get("retrievedAt") or utc_now_iso()

                sources.append(
                    SourceRecord(
                        sourceId=source_id_for(final_url),
                        citationNumber=citation_start + idx,
                        title=str(title),
                        publisher=scores["domain"],
                        domain=scores["domain"],
                        url=final_url,
                        sourceType=scores["sourceType"],
                        publicationDate=publication,
                        lastUpdatedDate=last_updated,
                        retrievedAt=retrieved,
                        author=None,
                        reliabilityLevel=scores["reliabilityLevel"],
                        relevanceScore=float(scores.get("rankScore") or scores["relevanceScore"]),
                        verificationStatus=verification,
                        purpose=f"Evidence for query: {item.get('query') or prompt[:80]}",
                        evidenceSnippets=snippets,
                        agentIds=[agent_id],
                        metadata={
                            "provider": item.get("provider") or provider_used,
                            "searchQuery": item.get("query"),
                            "fetchSuccess": bool(page.get("success")),
                            "publicationDateSource": (
                                "page_metadata"
                                if page.get("publicationDate")
                                else "provider_metadata"
                                if item.get("publicationDate")
                                else None
                            ),
                            "relevance": scores.get("relevanceScore"),
                            "authority": scores.get("authorityScore"),
                            "evidence": scores.get("evidenceScore"),
                            "overallConfidence": scores.get("overallConfidence"),
                            "sourceCategory": scores.get("sourceType"),
                        },
                    )
                )
        await emit("extract", "completed", f"Collected evidence from {len(selected)} source(s)")
        await emit("verify", "active", "Comparing evidence across sources...")
        await emit("verify", "completed", "Cross-checked major claims against available sources")
    else:
        await emit("search", "completed", "Live web research not required for this request")

    if not sources and classification["liveResearchRequired"]:
        research_failed = True
        research_error = research_error or "No usable sources retrieved."

    evidence_pack = build_evidence_pack(sources, classification)
    await emit(
        "complete",
        "failed" if research_failed and not sources else "completed",
        "Research completed" if sources or not live_needed else "Live research could not be completed",
        {
            "sourceCount": len(sources),
            "candidateCount": candidate_count,
            "provider": provider_used,
            "researchFailed": research_failed,
        },
    )

    external = [s for s in sources if s.sourceType not in ("uploaded", "user_website")]
    return {
        "success": not (research_failed and classification["liveResearchRequired"] and not any(s.sourceType.startswith("upload") or s.sourceType == "user_website" for s in sources)),
        "classification": classification,
        "events": [e.to_dict() for e in events],
        "sources": [s.to_dict() for s in sources],
        "evidencePack": evidence_pack,
        "researchFailed": research_failed,
        "researchError": research_error,
        "provider": provider_used,
        "generatedWithoutLiveResearch": bool(research_failed and classification["liveResearchRequired"]),
        "retrievedAt": utc_now_iso(),
        "stats": {
            "sourcesFound": int(candidate_count or len(external)),
            "sourcesUsed": len(external),
            "sourcesTotal": len(sources),
            "crossCheckedClaims": sum(max(1, len(s.evidenceSnippets or [])) for s in external),
        },
    }


async def stream_research_events(
    *,
    prompt: str,
    agent_id: str = "research",
    uploads: list[dict[str, Any]] | None = None,
    force_research: bool | None = None,
) -> AsyncIterator[str]:
    """Yield NDJSON lines for live research activity as real backend stages complete."""
    import asyncio

    queue: asyncio.Queue[ResearchEvent | None] = asyncio.Queue()

    async def on_event(event: ResearchEvent) -> None:
        await queue.put(event)

    task = asyncio.create_task(
        run_research_pipeline(
            prompt=prompt,
            agent_id=agent_id,
            uploads=uploads,
            force_research=force_research,
            event_callback=on_event,
        )
    )

    while True:
        if task.done() and queue.empty():
            break
        try:
            event = await asyncio.wait_for(queue.get(), timeout=0.15)
        except asyncio.TimeoutError:
            if task.done():
                # Drain remaining
                while not queue.empty():
                    remaining = await queue.get()
                    if remaining is not None:
                        yield json.dumps({"type": "event", "event": remaining.to_dict()}) + "\n"
                break
            continue
        if event is not None:
            yield json.dumps({"type": "event", "event": event.to_dict()}) + "\n"

    result = await task
    yield json.dumps({"type": "complete", "result": result}) + "\n"
