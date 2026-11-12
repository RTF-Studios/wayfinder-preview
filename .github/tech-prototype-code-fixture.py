"""Compile only the block recipes actually displayed in Prototype guides.
Unknown text fails closed. Fixtures exercise TurboWarp's real VM/renderer in CI.
"""
import base64,hashlib,json,re
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
ASSETS={}
def costume(name,svg,cx,cy):
    key=hashlib.md5(svg.encode()).hexdigest();ASSETS[key]='data:image/svg+xml;base64,'+base64.b64encode(svg.encode()).decode()
    return dict(assetId=key,name=name,bitmapResolution=1,md5ext=key+'.svg',dataFormat='svg',rotationCenterX=cx,rotationCenterY=cy)
STAGE=costume('Plain','<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><path fill="white" d="M0 0h480v360H0z"/></svg>',240,180)
SQUARE=costume('Square','<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><path fill="#2563ae" d="M0 0h40v40H0z"/></svg>',20,20)
CIRCLE=costume('Circle','<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="20" fill="#d84545"/></svg>',20,20)
class Compiler:
    def __init__(self):self.blocks={};self.count=0
    def add(self,op,inputs=None,fields=None,parent=None,shadow=False):
        self.count+=1;k='b'+str(self.count);self.blocks[k]=dict(opcode=op,next=None,parent=parent,inputs=inputs or {},fields=fields or {},shadow=shadow,topLevel=False);return k
    def num(self,n):return [1,[4,str(n)]]
    def val(self,name,parent):
        if name in ['x position','y position']:return [3,self.add('motion_'+('xposition' if name[0]=='x' else 'yposition'),parent=parent),[4,'0']]
        return [3,self.add('data_variable',fields={'VARIABLE':[name,name]},parent=parent),[4,'0']]
    def condition(self,text,parent):
        if text.startswith('<<touching'):
            k=self.add('operator_and',parent=parent);menu=self.add('sensing_touchingobjectmenu',fields={'TOUCHINGOBJECTMENU':['Player',None]},shadow=True);touch=self.add('sensing_touchingobject',inputs={'TOUCHINGOBJECTMENU':[1,menu]},parent=k);self.blocks[menu]['parent']=touch
            self.blocks[k]['inputs']={'OPERAND1':[2,touch],'OPERAND2':self.condition('<(hitThisFall) = (0)>',k)};return [2,k]
        m=re.fullmatch(r'<key \[(.*?)\] pressed\?>',text)
        if m:
            k=self.add('sensing_keypressed',parent=parent);menu=self.add('sensing_keyoptions',fields={'KEY_OPTION':[m[1],None]},parent=k,shadow=True);self.blocks[k]['inputs']={'KEY_OPTION':[1,menu]};return [2,k]
        m=re.fullmatch(r'<\((.*?)\) ([<>=]) \((-?[\d.]+)\)>',text)
        if not m:raise ValueError('Unknown condition '+text)
        k=self.add({'<':'operator_lt','>':'operator_gt','=':'operator_equals'}[m[2]],parent=parent);self.blocks[k]['inputs']={'OPERAND1':self.val(m[1],k),'OPERAND2':self.num(m[3])};return [2,k]
    def chain(self,ast,parent=None):
        first=previous=None
        for line,children in ast:
            k=self.statement(line,children,previous or parent)
            if previous:self.blocks[previous]['next']=k
            else:first=k
            previous=k
        return first
    def statement(self,line,children,parent):
        if line=='when green flag clicked':
            k=self.add('event_whenflagclicked');self.blocks[k].update(topLevel=True,x=20,y=20);return k
        if line=='forever':
            k=self.add('control_forever',parent=parent);self.blocks[k]['inputs']={'SUBSTACK':[2,self.chain(children,k)]};return k
        m=re.fullmatch(r'(if|repeat until) (.*?) ?(?:then)?',line)
        if m:
            condition=m[2].removesuffix(' then');k=self.add('control_if' if m[1]=='if' else 'control_repeat_until',parent=parent);self.blocks[k]['inputs']={'CONDITION':self.condition(condition,k),'SUBSTACK':[2,self.chain(children,k)]};return k
        m=re.fullmatch(r'go to x: \((.*?)\) y: \((-?[\d.]+)\)',line)
        if m:
            k=self.add('motion_gotoxy',parent=parent);random=re.fullmatch(r'pick random \((-?[\d.]+)\) to \((-?[\d.]+)\)',m[1]);x=self.num(m[1])
            if random:x=[3,self.add('operator_random',inputs={'FROM':self.num(random[1]),'TO':self.num(random[2])},parent=k),[4,'0']]
            self.blocks[k]['inputs']={'X':x,'Y':self.num(m[2])};return k
        m=re.fullmatch(r'(change|set) ([xy]) (?:by|to) \((-?[\d.]+)\)',line)
        if m:return self.add('motion_'+('change'+m[2]+'by' if m[1]=='change' else 'set'+m[2]),inputs={('D'+m[2].upper() if m[1]=='change' else m[2].upper()):self.num(m[3])},parent=parent)
        m=re.fullmatch(r'(set|change) \[(.*?)\] (?:to|by) \((-?[\d.]+)\)',line)
        if m:return self.add('data_setvariableto' if m[1]=='set' else 'data_changevariableby',inputs={'VALUE':self.num(m[3])},fields={'VARIABLE':[m[2],m[2]]},parent=parent)
        m=re.fullmatch(r'wait \(([\d.]+)\) seconds',line)
        if m:return self.add('control_wait',inputs={'DURATION':self.num(m[1])},parent=parent)
        m=re.fullmatch(r'say \[(.*?)\] for \(([\d.]+)\) seconds',line)
        if m:return self.add('looks_sayforsecs',inputs={'MESSAGE':[1,[10,m[1]]],'SECS':self.num(m[2])},parent=parent)
        if line=='stop [all]':
            k=self.add('control_stop',fields={'STOP_OPTION':['all',None]},parent=parent);self.blocks[k]['mutation']={'tagName':'mutation','children':[],'hasnext':'false'};return k
        raise ValueError('Unknown displayed block '+line)
def parse(text):
    stack=[[]];started=False
    for raw in text.splitlines():
        line=raw.strip()
        if line=='when green flag clicked':started=True
        if not started:continue
        if line=='end':
            if len(stack)==1:raise ValueError('Unmatched end')
            stack.pop();continue
        child=[];stack[-1].append((line,child))
        if line=='forever' or line.startswith('repeat until ') or line.startswith('if '):stack.append(child)
    if len(stack)!=1:raise ValueError('Unclosed control block')
    return stack[0]
def target(name,blocks,stage=False):
    return dict(isStage=stage,name=name,variables=({'lives':['lives',3],'score':['score',0]} if stage else {'hitThisFall':['hitThisFall',0]} if name=='FallingObject' else {}),lists={},broadcasts={},blocks=blocks,comments={},currentCostume=0,costumes=[STAGE if stage else SQUARE if name=='Player' else CIRCLE],sounds=[],volume=100,layerOrder=0 if stage else 1 if name=='Player' else 2,tempo=60,videoTransparency=50,videoState='on',textToSpeechLanguage=None,x=0,y=-125 if name=='Player' else 170,size=100,direction=90,draggable=False,rotationStyle='all around',visible=True)
rows=[]
for day in range(2,6):
    p=ROOT/f'Tech/305020{day}.html';soup=BeautifulSoup(p.read_text(),'html.parser');recipes=[x.get_text() for x in soup.select('pre[aria-label="Block recipe"]')];targets=[target('Stage',{},True)]
    for text in recipes:
        c=Compiler();c.chain(parse(text));targets.append(target('Player' if text.startswith('PLAYER') else 'FallingObject',c.blocks))
    if day==2:targets.append(target('FallingObject',{}))
    rows.append({'day':day,'path':str(p.relative_to(ROOT)),'recipes':recipes,'project':{'targets':targets,'monitors':[],'extensions':[],'meta':{'semver':'3.0.0','vm':'test displayed recipes','agent':'RTF source QA'}}})
out=ROOT/'.github/tech-prototype-code-fixtures.json';out.write_text(json.dumps({'assets':ASSETS,'fixtures':rows},indent=2)+'\n');print('Compiled',len(rows),'displayed recipe checkpoints')
