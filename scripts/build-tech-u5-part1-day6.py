#!/usr/bin/env python3
"""Build only the approved Part1 Day6 assessment through the unchanged master."""
import json,re,html,hashlib,importlib.util
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('prototype',ROOT/'scripts/build-tech-u5-prototype.py')
P=importlib.util.module_from_spec(spec);spec.loader.exec_module(P)
source=json.loads((ROOT/'scripts/tech-u5-part1-day6-source.json').read_text())
records=[{'key':r[0],'suffix':r[1],'prompt':r[2],'rubric':r[3]} for r in source['collector']['values']]
assert [r['key'] for r in records]==['30501063999'+str(i) for i in range(1,5)]
assert all(r['prompt'] in source['outline'] for r in records)
from wayfinder_identity import preflight
preflight({'course':'Tech','dayid':'3050106','unit':5,'part':1,'day':6,'title':'Game Design & TurboWarp Foundations'}, source['outline'])
from wayfinder_lesson import build_from_outline
build_from_outline({'course':'Tech','dayid':'3050106','unit':5,'part':1,'day':6,'title':'Game Design & TurboWarp Foundations'},'ASSESSMENT',P.MASTER,ROOT/'Tech/3050106.html')
raise SystemExit(0)
