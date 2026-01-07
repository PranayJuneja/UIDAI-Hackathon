import requests

r = requests.get('http://127.0.0.1:8000/api/states')
data = r.json()

blue = [s for s in data if s['hotspot']['intensity'] <= 0.40]
green = [s for s in data if 0.40 < s['hotspot']['intensity'] <= 0.60]
red = [s for s in data if s['hotspot']['intensity'] > 0.60]

print("🔵 BLUE (Low ≤40%):")
for s in sorted(blue, key=lambda x: x['hotspot']['intensity']):
    print(f"  {s['state_name']}: {s['hotspot']['intensity']*100:.0f}%")

print("\n🟢 GREEN (Medium 40-60%):")
for s in sorted(green, key=lambda x: x['hotspot']['intensity']):
    print(f"  {s['state_name']}: {s['hotspot']['intensity']*100:.0f}%")

print("\n🔴 RED (High >60%):")  
for s in sorted(red, key=lambda x: x['hotspot']['intensity'], reverse=True):
    print(f"  {s['state_name']}: {s['hotspot']['intensity']*100:.0f}%")
