import os
import subprocess

def setup_node_and_run():
    # 1. ติดตั้ง nodeenv ใน Python
    print("🔄 กำลังเตรียมสภาพแวดล้อม Node.js...")
    subprocess.run("pip install nodeenv", shell=True)
    
    # 2. สร้าง Node.js environment ขนาดเล็กไว้ในโฟลเดอร์ .nodeenv (ทำแค่ครั้งแรก)
    if not os.path.exists(".nodeenv"):
        print("📦 กำลังดาวน์โหลดและติดตั้ง Node.js...")
        subprocess.run("nodeenv .nodeenv --node=18.20.8", shell=True)
    
    # 3. สั่งรัน npm install และ node index.js ผ่าน .nodeenv
    print("📦 กำลังติดตั้ง npm modules...")
    subprocess.run(".nodeenv/bin/npm install", shell=True)
    
    print("🚀 กำลังเริ่มรัน Bot...")
    subprocess.Popen(".nodeenv/bin/node index.js", shell=True)

if __name__ == "__main__":
    setup_node_and_run()
