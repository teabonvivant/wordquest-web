"""Re-run the fixed 1,000-case audit matrix. A known-failing baseline exits with code 1."""
from pathlib import Path
import os,sys,json,subprocess,shutil,collections
ROOT=Path(__file__).resolve().parents[1]

def run(*cmd):
    print('\n>',*cmd,flush=True)
    subprocess.run(list(cmd),cwd=ROOT,check=True,env=os.environ.copy())

def main():
    if not shutil.which('node'):raise SystemExit('Node.js is required to execute the application core.')
    try:import playwright.sync_api
    except ImportError:raise SystemExit('The Python Playwright package is required for browser checks.')
    chrome=os.environ.get('CHROMIUM_PATH')
    if not chrome:
        chrome=next((x for name in ['chromium','chromium-browser','google-chrome'] if (x:=shutil.which(name))),None)
    if not chrome or not Path(chrome).is_file():
        raise SystemExit('Set CHROMIUM_PATH to a usable Chromium/Chrome executable.')
    os.environ['CHROMIUM_PATH']=chrome
    for p in ['results','evidence','report']:(ROOT/p).mkdir(exist_ok=True)
    run(sys.executable,'tests/prepare_source.py')
    run('node','tests/core_checks.cjs')
    run(sys.executable,'tests/generation_oracle.py')
    paths=[ROOT/'results/generation_results.json',ROOT/'results/core_results.json']
    for kind,ranges in [('templates',[(0,28),(28,56),(56,84)]),('features',[(0,14),(14,28),(28,42),(42,56)])]:
        for start,end in ranges:
            run(sys.executable,'tests/browser_checks.py',kind,str(start),str(end))
            paths.append(ROOT/f'results/browser_{kind}_{start}_{end}.json')
    results=[r for p in paths for r in json.loads(p.read_text())]
    if len(results)!=1000 or len({r['id'] for r in results})!=1000:
        raise SystemExit('Invalid audit matrix: exactly 1,000 unique test IDs required.')
    (ROOT/'results/all_1000_results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
    c=collections.Counter(r['status'] for r in results)
    print('\nExecuted',len(results),'unique checks:',dict(c))
    print('HTML/Markdown reports in this package describe the original 2026-09-29 baseline; they are not automatically rewritten.')
    raise SystemExit(1 if c['FAIL'] else 0)
if __name__=='__main__':main()
