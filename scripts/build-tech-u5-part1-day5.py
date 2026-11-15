#!/usr/bin/env python3
"""One-guide approved desktop skills lab; master engine/styles remain unchanged."""
import json, re, hashlib, html
from pathlib import Path
from bs4 import BeautifulSoup
import importlib.util
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('prototype',ROOT/'scripts/build-tech-u5-prototype.py')
P=importlib.util.module_from_spec(spec);spec.loader.exec_module(P)
src=json.loads((ROOT/'scripts/tech-u5-part1-repair-source.json').read_text())
key,prompt,rubric,*_=src['collector']['values'][0]
assert key=='305010530070' and prompt in src['outline']
from wayfinder_identity import preflight
preflight({'course':'Tech','dayid':'3050105','unit':5,'part':1,'day':5,'title':'TurboWarp Desktop Fundamentals'}, src['outline'])
from wayfinder_lesson import build_from_outline
build_from_outline({'course':'Tech','dayid':'3050105','unit':5,'part':1,'day':5,'title':'TurboWarp Desktop Fundamentals'},'PERFORM',P.MASTER,ROOT/'Tech/3050105.html')
raise SystemExit(0)
