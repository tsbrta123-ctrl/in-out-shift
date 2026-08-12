import subprocess
import sys

def start_bot():
    try:
        # 1. สั่งรัน npm install เพื่อติดตั้ง/อัปเดตโมดูล Node.js ทั้งหมด
        print("📦 กำลังติดตั้งโมดูล Node.js (npm install)...")
        subprocess.run(['npm', 'install'], check=True)
        print("✅ ติดตั้งโมดูลสำเร็จ!")

        # 2. สั่งรันบอท Node.js (index.js)
        print("🚀 กำลังเริ่มรัน Bot (node index.js)...")
        subprocess.Popen(['node', 'index.js'])

    except subprocess.CalledProcessError as e:
        print(f"❌ เกิดข้อผิดพลาดขณะติดตั้ง npm: {e}")
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")

if __name__ == "__main__":
    start_bot()

