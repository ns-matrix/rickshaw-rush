import math, threading, queue
import requests
from ursina import *

# Rickshaw Rush 3D — real OpenStreetMap road geometry + OSRM route.
CENTER=(19.1197,72.9052) # Powai, Mumbai (lat,lon)
RADIUS=800
SCALE=0.12
q=queue.Queue()
app=Ursina()
window.title="Rickshaw Rush 3D — Real Roads"
window.color=color.rgb(150,190,220)
Sky()
DirectionalLight().look_at(Vec3(1,-2,-1))
Entity(model="plane",scale=300,color=color.rgb(166,190,148),collider="box")
car=None; speed=0.0; dist=0.0; heading=0.0; throttle=False; brake=False; steer=0; route=[]; idx=0
hud=Text("Downloading OpenStreetMap road data…",position=(-.86,.45),scale=1,background=True)
speedhud=Text("0 km/h",position=(.68,.44),scale=1.2,background=True,color=color.yellow)
distHud=Text("0 m",position=(.68,.38),scale=.9,background=True)
Text("W/↑ accelerate   S/SPACE brake   A/D steer   ESC quit",position=(-.86,-.46),scale=.8,background=True)

def world(p):
 lat,lon=p
 return Vec3(math.radians(lon-CENTER[1])*6371000*math.cos(math.radians(CENTER[0]))*SCALE,0,math.radians(lat-CENTER[0])*6371000*SCALE)

def load_data():
 lat,lon=CENTER
 query=f'[out:json][timeout:25];(way(around:{RADIUS},{lat},{lon})["highway"~"^(primary|secondary|tertiary|residential|unclassified|service|living_street|road)$"];);out geom;'
 errors=[]
 for endpoint in ["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"]:
  try:
   data=requests.post(endpoint,data={"data":query},timeout=35,headers={"User-Agent":"RickshawRush3D/1.0"});data.raise_for_status()
   roads=[[(p["lat"],p["lon"]) for p in w.get("geometry",[])] for w in data.json().get("elements",[]) if len(w.get("geometry",[]))>1]
   if not roads: raise Exception("No road geometry returned")
   pts=[p for road in roads for p in road]
   start=min(pts,key=lambda p:(p[0]-lat)**2+(p[1]-lon)**2)
   end=max((p for p in pts if abs(p[0]-start[0])+abs(p[1]-start[1])<.006),key=lambda p:abs(p[0]-start[0])+abs(p[1]-start[1]),default=roads[0][-1])
   url=f'https://router.project-osrm.org/route/v1/driving/{start[1]},{start[0]};{end[1]},{end[0]}?overview=full&geometries=geojson'
   rr=requests.get(url,timeout=25,headers={"User-Agent":"RickshawRush3D/1.0"});rr.raise_for_status();j=rr.json()
   if j.get("code")!="Ok" or not j.get("routes"): raise Exception("OSRM route unavailable")
   path=[(lat,lon) for lon,lat in j["routes"][0]["geometry"]["coordinates"]]
   q.put(("ok",roads,path,start));return
  except Exception as e: errors.append(str(e))
 q.put(("error","; ".join(errors)))

def build_car():
 root=Entity(position=(0,.3,0))
 green=color.rgb(12,135,62);yellow=color.rgb(255,199,36);dark=color.rgb(7,78,39);black=color.rgb(25,26,26)
 def box(scale,pos,col): Entity(parent=root,model="cube",scale=scale,position=pos,color=col)
 box((1.5,.25,2.2),(0,.45,0),green);box((1.42,.12,.65),(0,.6,.78),yellow)
 box((1.28,.68,1.1),(0,1,-.25),dark);box((1.08,.45,.06),(0,1.04,.32),color.rgba(117,205,225,210))
 box((1.45,.12,1.4),(0,1.38,-.25),yellow);box((.8,.12,.55),(0,.75,-.5),black)
 for x in (-.75,.75):
  for z in (-.7,.72):
   Entity(parent=root,model="cylinder",scale=(.58,.18,.58),position=(x,.16,z),rotation_x=90,color=black)
 return root

def make_road(points,width=5.5,col=color.rgb(65,69,72),y=.025):
 verts=[];tris=[]
 for a,b in zip(points[:-1],points[1:]):
  pa,pb=world(a),world(b);dx,dz=pb.x-pa.x,pb.z-pa.z;length=math.hypot(dx,dz)
  if length<.001:continue
  nx,nz=-dz/length*width*SCALE/2,dx/length*width*SCALE/2;i=len(verts)
  verts += [(pa.x+nx,y,pa.z+nz),(pa.x-nx,y,pa.z-nz),(pb.x+nx,y,pb.z+nz),(pb.x-nx,y,pb.z-nz)]
  tris += [(i,i+1,i+2),(i+1,i+3,i+2)]
 if verts: Entity(model=Mesh(vertices=verts,triangles=tris,mode="triangle",static=True),color=col)

def update():
 global car,speed,dist,heading,idx
 try:
  while True:
   item=q.get_nowait()
   if item[0]=="error":hud.text="Map request failed: "+item[1][:100];continue
   _,roads,path,start=item
   for road in roads: make_road(road)
   for a,b in zip(path[:-1],path[1:]):
    pa,pb=world(a),world(b);d=pb-pa
    if d.length()>.01: Entity(model="cube",position=( (pa.x+pb.x)/2,.13,(pa.z+pb.z)/2),scale=(.14,.035,d.length()),rotation_y=math.degrees(math.atan2(d.x,d.z)),color=color.rgb(247,183,40))
   route[:]=[world(p) for p in path];idx=0;car=build_car();car.position=world(start)+Vec3(0,.1,0)
   hud.text=f"Real OSM roads: {len(roads)} · OSRM route loaded";camera.position=car.position+Vec3(0,10,-17);camera.look_at(car.position)
 except queue.Empty: pass
 if car:
  speed=min(42,speed+25*time.dt) if throttle else max(0,speed-(45 if brake else 7)*time.dt)
  if route and idx<len(route)-1 and speed>0:
   target=route[idx+1];delta=target-car.position;delta.y=0
   if delta.length()<.7:idx+=1
   else:
    desired=math.degrees(math.atan2(delta.x,delta.z));heading+=(((desired-heading+180)%360)-180)*min(1,time.dt*2)+steer*30*time.dt
    step=speed/3.6*SCALE*time.dt;car.position+=Vec3(math.sin(math.radians(heading))*step,0,math.cos(math.radians(heading))*step);car.rotation_y=heading;dist+=step/SCALE
  camera.position=car.position+Vec3(0,9,-14);camera.look_at(car.position+Vec3(0,1,0))
 speedhud.text=f"{speed:.0f} km/h";distHud.text=f"{dist:.0f} m"
def input(key):
 global throttle,brake,steer
 if key=="escape": application.quit()
 if key in ("w","up"): throttle=True
 if key in ("w up","up up"): throttle=False
 if key in ("s","space","down"): brake=True
 if key in ("s up","space up","down up"): brake=False
 if key in ("a","left"): steer=-1
 if key in ("d","right"): steer=1
 if key in ("a up","left up","d up","right up"): steer=0

threading.Thread(target=load_data,daemon=True).start()
app.run()
