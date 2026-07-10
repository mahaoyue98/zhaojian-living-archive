from pathlib import Path
from playwright.sync_api import sync_playwright
import re

def assert_all_visible_copy_is_chinese(page):
 text=page.locator('body').inner_text()
 words=re.findall(r'\b[A-Za-z]{2,}\b',text)
 assert not words,words

ROOT=Path(__file__).resolve().parents[1]
ARTIFACTS=ROOT/'artifacts';ARTIFACTS.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1,accept_downloads=True)
 errors=[]
 page.on('console',lambda msg:errors.append(f'console:{msg.type}:{msg.text}') if msg.type=='error' else None)
 page.on('pageerror',lambda err:errors.append(f'pageerror:{err}'))
 page.goto('http://127.0.0.1:4173',wait_until='networkidle');page.wait_for_timeout(1400)
 assert page.title()=='照见 — 注意力的活体档案'
 assert_all_visible_copy_is_chinese(page)
 assert page.locator('#material').evaluate('c=>c.width>0')
 assert page.locator('#feedback').evaluate('c=>c.width>0')
 assert page.locator('html').get_attribute('data-tier') in ['A','B','C']
 page.screenshot(path=str(ARTIFACTS/'照见-第一幕-感知.png'),full_page=True)

 page.locator('button[data-state="resolve"]').click();page.wait_for_timeout(500)
 assert '把全部重量' in page.locator('#thesis-title').inner_text()

 hold=page.locator('#hold-button');box=hold.bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);page.mouse.down();page.wait_for_timeout(1950);page.mouse.up();page.wait_for_timeout(900)
 assert page.locator('#inscription').get_attribute('aria-hidden')=='false'
 assert page.locator('body').get_attribute('data-act')=='inscribe'
 assert_all_visible_copy_is_chinese(page)
 for i in range(4):
  x=180+(i%4)*220
  y=190+((i*157)%500)
  page.mouse.move(x,y,steps=2)
  page.wait_for_timeout(36)
 assert float(page.locator('#inscription-time').inner_text())>0
 assert float(page.locator('#velocity-value').inner_text())>=0
 page.screenshot(path=str(ARTIFACTS/'照见-第二幕-刻写.png'),full_page=True)
 for i in range(10):
  x=220+(i%6)*160
  y=160+((i*131)%620)
  page.mouse.move(x,y,steps=2)
  page.wait_for_timeout(25)
 if page.locator('body').get_attribute('data-act')=='inscribe':page.locator('#release-now').click()
 page.wait_for_timeout(1300)
 assert page.locator('body').get_attribute('data-act')=='release'
 assert page.locator('#trace-overlay').get_attribute('aria-hidden')=='false'
 assert_all_visible_copy_is_chinese(page)
 assert '路径' in page.locator('#trace-reading').inner_text()
 reading=page.locator('#trace-reading').inner_text()
 assert '场值' in reading
 page.screenshot(path=str(ARTIFACTS/'照见-第三幕-凝结.png'),full_page=True)
 with page.expect_download() as download_info:page.locator('#download-trace').click()
 assert download_info.value.suggested_filename=='照见-笃定-私人痕迹.png'

 mobile=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
 mobile_errors=[]
 mobile.on('console',lambda msg:mobile_errors.append(f'console:{msg.type}:{msg.text}') if msg.type=='error' else None)
 mobile.on('pageerror',lambda err:mobile_errors.append(f'pageerror:{err}'))
 mobile.goto('http://127.0.0.1:4173',wait_until='networkidle');mobile.wait_for_timeout(1000)
 assert mobile.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth')
 mobile.screenshot(path=str(ARTIFACTS/'照见-移动端.png'),full_page=True)

 reduced=browser.new_page(viewport={'width':1024,'height':768},reduced_motion='reduce')
 reduced.goto('http://127.0.0.1:4173',wait_until='networkidle');reduced.keyboard.press('Tab')
 assert reduced.evaluate("document.activeElement.classList.contains('skip')")
 assert not errors,errors
 assert not mobile_errors,mobile_errors
 print('PASS 全中文三幕、GPU反馈、动作读数、下载、移动端、键盘、减少动态与控制台检查')
 browser.close()
