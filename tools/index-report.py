# Revisa en Search Console cada URL del sitemap y dice cuáles pedir a Google.
# Uso: python tools/index-report.py   (prueba: python tools/index-report.py --test)
# La llave vive fuera del repo: C:\Users\junio\keys\libo-gsc.json, o la ruta en GSC_KEY.
import os, re, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = 'https://libostudios.space/'
KEY = os.environ.get('GSC_KEY', r'C:\Users\junio\keys\libo-gsc.json')
DAILY = 10  # cupo manual de "Solicitar indexación" en la interfaz
# sin impresiones todavía, el orden lo da lo que trae clientes: servicios, luego sectores, luego el resto
PRIORITY = ['/servicios/', '/sectores/', '/proyectos/']


def last_change(url):
    """Fecha del último commit del archivo que sirve esa URL."""
    path = url.removeprefix(SITE)
    f = ROOT / path / 'index.html' if path else ROOT / 'index.html'
    out = subprocess.run(['git', 'log', '-1', '--format=%cI', '--', str(f)], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    return datetime.fromisoformat(out) if out else None


def needs_submit(indexed, crawled, changed):
    """Sin indexar, o rastreada antes del último cambio. Lo rastreado después no se reenvía: no cambia nada."""
    if not indexed:
        return 'sin indexar'
    if crawled and changed and crawled < changed:
        return 'cambió después del rastreo'
    return ''


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    creds = service_account.Credentials.from_service_account_file(KEY, scopes=['https://www.googleapis.com/auth/webmasters'])
    gsc = build('searchconsole', 'v1', credentials=creds, cache_discovery=False)
    urls = re.findall(r'<loc>([^<]+)</loc>', (ROOT / 'sitemap.xml').read_text(encoding='utf-8'))
    rows, queue = [], []
    for url in urls:
        r = gsc.urlInspection().index().inspect(body={'inspectionUrl': url, 'siteUrl': SITE}).execute()['inspectionResult']
        i = r['indexStatusResult']
        crawled = datetime.fromisoformat(i['lastCrawlTime'].replace('Z', '+00:00')) if i.get('lastCrawlTime') else None
        why = needs_submit(i.get('verdict') == 'PASS', crawled, last_change(url))
        # solo los ERROR cuentan; las advertencias de campos que nunca llenaremos no son problemas
        errors = [x['issueMessage'] for d in r.get('richResultsResult', {}).get('detectedItems', [])
                  for it in d.get('items', []) for x in it.get('issues', []) if x.get('severity') == 'ERROR']
        if i.get('googleCanonical') and i['googleCanonical'] != url:
            errors.append(f"Google eligió otra canónica: {i['googleCanonical']}")
        rows.append((url.removeprefix(SITE.rstrip('/')), i.get('coverageState', '?'), crawled.date().isoformat() if crawled else 'nunca', errors))
        if why:
            queue.append((url, why))
    for path, state, crawl, errors in rows:
        print(f'{path:40} {crawl:10}  {state}' + ''.join(f'\n    ERROR: {e}' for e in errors))
    indexed = sum(1 for r in rows if 'indexed' in r[1].lower() and 'not' not in r[1].lower())
    print(f'\n{indexed}/{len(rows)} indexadas · {sum(len(r[3]) for r in rows)} errores · {datetime.now(timezone.utc):%Y-%m-%d %H:%M} UTC')
    print(f'\nPara pedir hoy en Search Console (Inspección de URLs > Solicitar indexación), máximo {DAILY}:')
    queue.sort(key=lambda q: next((n for n, p in enumerate(PRIORITY) if q[0].startswith(SITE + p[1:])), len(PRIORITY)))
    for url, why in queue[:DAILY]:
        print(f'  {url}  ({why})')
    if not queue:
        print('  nada: todo está rastreado después de su último cambio')


def test():
    d = lambda s: datetime.fromisoformat(s)
    assert needs_submit(False, None, None) == 'sin indexar'
    assert needs_submit(True, d('2026-10-20T00:00:00+00:00'), d('2026-10-26T00:00:00+00:00')) == 'cambió después del rastreo'
    assert needs_submit(True, d('2026-10-27T00:00:00+00:00'), d('2026-10-26T00:00:00+00:00')) == ''
    assert needs_submit(True, d('2026-10-27T00:00:00+00:00'), None) == ''
    print('ok')


if __name__ == '__main__':
    test() if '--test' in sys.argv else main()
