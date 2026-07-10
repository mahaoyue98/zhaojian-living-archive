from playwright.sync_api import sync_playwright
import re
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);page=b.new_page(viewport={'width':1200,'height':800})
 page.goto('http://127.0.0.1:4173',wait_until='networkidle');page.wait_for_timeout(700)
 text=page.locator('body').inner_text()
 words=re.findall(r'\b[A-Za-z]{2,}\b',text)
 print('VISIBLE_ENGLISH',words)
 assert not words,words
 b.close()
