from pathlib import Path
import numpy as np
from scipy.signal import butter,sosfilt
from scipy.io.wavfile import write
R=24000
import sys
if len(sys.argv)!=2: raise SystemExit("Usage: prepare-grenade-sounds.py OUTPUT_DIRECTORY")
out=Path(sys.argv[1])
out.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(607)
def filt(x,lo=None,hi=None):
 if lo and hi:return sosfilt(butter(3,[lo,hi],btype='bandpass',fs=R,output='sos'),x)
 return sosfilt(butter(3,hi or lo,btype='lowpass' if hi else 'highpass',fs=R,output='sos'),x)
def noise(n,lo=70,hi=3000):return filt(rng.normal(0,1,n),lo,hi)
def make(kind,v):
 dur={'frag':1.5,'flash':.8,'molotov':3.2,'shock':1.3}[kind]
 t=np.arange(int(R*dur))/R;n=len(t);y=np.zeros(n)
 def layer(x,start=0,gain=1):
  pos=int(start*R);m=min(len(x),n-pos)
  if m>0:y[pos:pos+m]+=gain*x[:m]
 if kind=='frag':
  # Broad pressure transient, falling low body, sparse debris, subdued reflection.
  body=noise(n,35,750 if v==0 else 1050)*np.exp(-t/(.17 if v==0 else .28))
  phase=2*np.pi*(48*t+38*.045*(1-np.exp(-t/.045)))
  y=body*.85+np.sin(phase)*np.exp(-t/.19)*.13
  y+=noise(n,180,2700)*np.exp(-t/.036)*.52
  for i in range(13):
   p=.06+i*.025+rng.uniform(0,.022);a=np.arange(int(R*.025))/R
   layer(noise(len(a),650,3300)*np.exp(-a/.004),p,.075*np.exp(-p/.24))
  layer(body[:int(R*.35)],.13,.07 if v==0 else .13)
 elif kind=='flash':
  y=noise(n,180,3200 if v==0 else 4300)*np.exp(-t/(.025 if v==0 else .019))
  y+=noise(n,70,1000)*np.exp(-t/.055)*.23
  layer(noise(int(R*.23),500,2400)*np.exp(-np.arange(int(R*.23))/R/.065),.04,.085)
 elif kind=='molotov':
  for i in range(15):
   a=np.arange(int(R*.13))/R;p=rng.uniform(0,.13)
   # Damped glass modes, softened to avoid harsh ringing.
   z=sum(np.sin(2*np.pi*f*a+rng.uniform(0,6.28)) for f in rng.uniform(1200,4800,4))*np.exp(-a/.012)
   layer(z,p,.08*rng.uniform(.5,1))
  q=np.maximum(0,t-.15)
  y+=noise(n,60,1150 if v==0 else 1600)*(1-np.exp(-q/.025))*np.exp(-q/.17)*(t>.15)*.65
  env=(1-np.exp(-q/.11))*np.minimum(1,(dur-t)/.45)*(t>.2)
  y+=noise(n,90,1550)*env*.025
  for i in range(28):
   a=np.arange(int(R*.025))/R
   layer(noise(len(a),650,3000)*np.exp(-a/.003),rng.uniform(.35,dur-.2),.018 if v==0 else .026)
 elif kind=='shock':
  env=np.exp(-t/(.13 if v==0 else .2))
  # Irregular discharge bursts, no sustained musical oscillator.
  modulation=(.25+.75*(rng.random(n)>.994))*env
  y=noise(n,350,4100)*modulation*.7
  y+=noise(n,80,700)*np.exp(-t/.045)*.4
  for p in [.085,.19,.31,.44,.59]:
   a=np.arange(int(R*.055))/R
   layer(noise(len(a),500,3500)*np.exp(-a/.009),p,.22*np.exp(-p/.3))
 y=filt(y,hi=5100)
 if v==1:
  low=filt(y,hi=400);mid=filt(y,hi=1800)-low;high=y-low-mid
  y=low*.58+mid*1.05+high*1.8
 y*=np.minimum(1,t/.0015)*np.minimum(1,(dur-t)/.04)
 # Limit peaks and preserve sensible relative loudness; playback starts modestly.
 peak={'frag':.32,'flash':.23,'molotov':.25,'shock':.24}[kind]
 y=np.tanh(y*1.5);y*=peak/max(np.max(np.abs(y)),1e-8)
 return y
report=[]
for kind in ['frag','flash','molotov','shock']:
 samples=[]
 for v in range(2):
  y=make(kind,v);samples.append(y)
  write(out/f'{kind}-{v+1}.wav',R,np.int16(y*32767))
  report.append((kind,v+1,round(len(y)/R,2),round(float(np.max(np.abs(y))),3)))
 compare=np.concatenate([np.zeros(int(R*.15)),samples[0],np.zeros(int(R*.9)),samples[1],np.zeros(int(R*.15))])
 write(out/f'{kind}-compare.wav',R,np.int16(compare*32767))
print(report)
