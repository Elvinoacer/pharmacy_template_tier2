#!/usr/bin/env python3
"""
Update medication library with verified web image URLs.
Pulls images from:
1. MyDawa (Kenya's largest e-pharmacy platform)
2. DailyMed (NIH / U.S. National Library of Medicine)
3. Wikimedia Commons (Verified pharmaceutical photos)
4. Curated medical reference repositories
"""

import csv
import json
import os
import re
import sys
import time
import urllib.parse
import requests

CACHE_FILE = 'scripts/medication_images_cache.json'
CSV_FILE = 'kenya_medication_library_200plus.csv'

SYNONYMS = {
    'cefalexin': 'cephalexin',
    'cephalexin': 'cefalexin',
    'paracetamol': 'acetaminophen',
    'acetaminophen': 'paracetamol',
    'salbutamol': 'albuterol',
    'albuterol': 'salbutamol',
    'amoxicillin + clavulanic acid': 'amoxicillin and clavulanate',
    'amoxicillin and clavulanate': 'amoxicillin + clavulanic acid',
    'co-amoxiclav': 'augmentin',
    'augmentin': 'amoxicillin + clavulanic acid',
    'co-trimoxazole': 'sulfamethoxazole and trimethoprim',
    'cotrimoxazole': 'sulfamethoxazole and trimethoprim',
    'septrin': 'co-trimoxazole',
    'bactrim': 'co-trimoxazole',
    'flagyl': 'metronidazole',
    'panadol': 'paracetamol',
    'brufen': 'ibuprofen',
    'voltaren': 'diclofenac',
    'ventolin': 'salbutamol',
    'plasil': 'metoclopramide',
    'lasix': 'furosemide',
    'rocephin': 'ceftriaxone',
    'zinnat': 'cefuroxime',
    'cipro': 'ciprofloxacin',
    'ciprobay': 'ciprofloxacin',
    'keflex': 'cephalexin',
    'zithromax': 'azithromycin',
    'tavanic': 'levofloxacin',
    'dalacin': 'clindamycin',
    'vibramycin': 'doxycycline',
    'losec': 'omeprazole',
    'nexium': 'esomeprazole',
    'controloc': 'pantoprazole',
    'prozac': 'fluoxetine',
    'zoloft': 'sertraline',
    'valium': 'diazepam',
    'tegretol': 'carbamazepine',
    'epilim': 'sodium valproate',
    'depo-provera': 'medroxyprogesterone',
    'microgynon': 'ethinylestradiol',
    'postinor-2': 'levonorgestrel',
    'postinor': 'levonorgestrel',
    'cytotec': 'misoprostol',
    'flomax': 'tamsulosin',
    'cialis': 'tadalafil',
    'viagra': 'sildenafil',
    'norvasc': 'amlodipine',
    'lipitor': 'atorvastatin',
    'crestor': 'rosuvastatin',
    'glucophage': 'metformin',
    'daonil': 'glibenclamide',
    'amaryl': 'glimepiride',
    'januvia': 'sitagliptin',
    'forxiga': 'dapagliflozin',
    'jardiance': 'empagliflozin',
    'coartem': 'artemether',
    'diflucan': 'fluconazole',
    'canesten': 'clotrimazole',
    'nizoral': 'ketoconazole',
    'betnovate': 'betamethasone',
    'dermovate': 'clobetasol',
    'duphalac': 'lactulose',
    'dulcolax': 'bisacodyl',
    'imodium': 'loperamide',
    'maalox': 'magnesium hydroxide',
    'motilium': 'domperidone',
    'zofran': 'ondansetron',
    'flamazine': 'silver sulfadiazine',
    'exocin': 'ofloxacin',
    'xalatan': 'latanoprost',
    'betadine': 'povidone iodine',
}

# Specialized direct high-res pharmaceutical packaging image fallbacks for clinical hospital products
SPECIAL_FALLBACKS = {
    'medical oxygen': 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Medical_Oxygen_Cylinder.jpg',
    'capd dialysis solution': 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Dianeal_PD4_peritoneal_dialysis_solution.jpg',
    'hemodialysis solution': 'https://upload.wikimedia.org/wikipedia/commons/8/87/Hemodialysis_concentrate_containers.jpg',
    'oral rehydration salts': 'https://storagemydawadocsprod.blob.core.windows.net/productimages/07703/07703_1.jpg',
    'zinc 20 mg dispersible tablet': 'https://storagemydawadocsprod.blob.core.windows.net/productimages/07639/07639_1.jpg',
    'povidone iodine': 'https://storagemydawadocsprod.blob.core.windows.net/productimages/00192/00192_1.jpg',
    'calamine lotion': 'https://storagemydawadocsprod.blob.core.windows.net/productimages/00551/00551_0.jpg',
    'potassium magnesium citrate': 'https://dailymed.nlm.nih.gov/dailymed/image.cfm?setid=2e49c719-21a4-4a46-81ca-5aa60bbfeb1b&name=urocit-k-1.jpg',
    'fluorouracil': 'https://dailymed.nlm.nih.gov/dailymed/image.cfm?setid=f0148d88-d6e6-4277-bf39-aa01ea07a3c3&name=fluorouracil-01.jpg',
    'paclitaxel': 'https://dailymed.nlm.nih.gov/dailymed/image.cfm?setid=d17f48d5-6bca-4bfa-a7d0-1c0b3d81b490&name=paclitaxel-01.jpg',
    'doxorubicin': 'https://dailymed.nlm.nih.gov/dailymed/image.cfm?setid=d0718501-c88a-44aa-971c-4e892cfa71f7&name=doxorubicin-01.jpg',
    'bevacizumab': 'https://dailymed.nlm.nih.gov/dailymed/image.cfm?setid=e6b24d9c-ecbf-4da2-8be0-b183610e7169&name=avastin-01.jpg',
    'trastuzumab': 'https://dailymed.nlm.nih.gov/dailymed/image.cfm?setid=36be5bca-6e11-477d-8152-4756bdf1fbf7&name=herceptin-01.jpg',
    'daratumumab': 'https://dailymed.nlm.nih.gov/dailymed/image.cfm?setid=2938a168-5a21-4f16-86f2-bf1ba48c5b6b&name=darzalex-01.jpg',
    'alpha lipoic acid': 'https://storagemydawadocsprod.blob.core.windows.net/productimages/02483/02483_1.jpg',
    'iron (ferrous salts) + folic acid': 'https://storagemydawadocsprod.blob.core.windows.net/productimages/02319/02319_1.jpg',
    'cyanocobalamin': 'https://dailymed.nlm.nih.gov/dailymed/image.cfm?setid=d89e5251-ce51-4043-bc06-7244eb68a732&name=cyanocobalamin-01.jpg',
    'n-acetyl-l-cysteine': 'https://storagemydawadocsprod.blob.core.windows.net/productimages/04423/04423_1.jpg',
}

class ImageHunter:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://mydawa.com/search',
        })
        self.mydawa_token = None
        self.cache = {}
        self.load_cache()
        self.init_mydawa()

    def load_cache(self):
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    self.cache = json.load(f)
                print(f"Loaded {len(self.cache)} entries from cache.")
            except Exception as e:
                print(f"Error loading cache: {e}")

    def save_cache(self):
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.cache, f, indent=2, ensure_ascii=False)

    def init_mydawa(self):
        try:
            self.session.get('https://mydawa.com', timeout=10)
            res = self.session.get('https://mydawa.com/api/antiforgery/token', timeout=10)
            if res.status_code == 200:
                self.mydawa_token = res.json().get('token')
                self.session.headers.update({
                    'X-XSRF-TOKEN': self.mydawa_token,
                    'Content-Type': 'application/json'
                })
                print("MyDawa session initialized successfully.")
            else:
                print(f"Failed to get MyDawa token: {res.status_code}")
        except Exception as e:
            print(f"Error initializing MyDawa session: {e}")

    def verify_image_url(self, url):
        if not url or not isinstance(url, str) or not url.startswith('http'):
            return False
        # Disallow known generic placeholder URLs
        if any(skip in url for skip in ['No_Image', 'placeholder', 'blank', 'default-image']):
            return False
        try:
            r = requests.head(url, timeout=6, headers={'User-Agent': 'Mozilla/5.0'}, allow_redirects=True)
            if r.status_code == 200:
                ct = r.headers.get('Content-Type', '').lower()
                if any(t in ct for t in ['image', 'octet-stream', 'binary']) or not ct:
                    return True
            if r.status_code in [403, 405]:
                # Try GET with range header
                r2 = requests.get(url, headers={'User-Agent': 'Mozilla/5.0', 'Range': 'bytes=0-1024'}, timeout=6, stream=True)
                if r2.status_code in [200, 206]:
                    return True
        except Exception:
            pass
        return False

    def clean_text(self, text):
        if not text:
            return ''
        t = re.sub(r'\(.*?\)', '', text)
        t = re.sub(r'\[.*?\]', '', t)
        return t.strip()

    def name_matches(self, candidate, generic, brand):
        c = candidate.lower()
        clean_b = self.clean_text(brand).lower()
        if clean_b and len(clean_b) >= 3 and clean_b in c:
            return True

        clean_g = self.clean_text(generic).lower()
        tokens = [t for t in re.split(r'[\s\+/,-]+', clean_g) if len(t) > 3 and t not in [
            'acid', 'sodium', 'potassium', 'injectable', 'oral', 'tablet', 'capsule',
            'suspension', 'solution', 'cream', 'ointment', 'combos', 'combo', 'salts',
            'salt', 'topical', 'preparation', 'drops'
        ]]

        for tok in tokens:
            if tok in c:
                return True
            syn = SYNONYMS.get(tok)
            if syn and syn in c:
                return True

        # Check whole generic synonyms
        syn = SYNONYMS.get(clean_g)
        if syn and syn in c:
            return True

        if clean_b:
            syn_b = SYNONYMS.get(clean_b)
            if syn_b and syn_b in c:
                return True

        return False

    def form_matches(self, candidate, form):
        c = candidate.lower()
        f = form.lower()

        if 'suspension' in f or 'syrup' in f:
            return any(w in c for w in ['susp', 'syrup', 'liquid', 'oral sol', 'mixture', 'elixir', 'drops', 'drop', 'ml'])
        if 'injection' in f or 'parenteral' in f:
            if any(w in c for w in ['tablet', 'tab', 'capsule', 'cap', 'syrup', 'suspension']):
                return False
            return any(w in c for w in ['inj', 'vial', 'ampoule', 'infusion', 'iv', 'im', 'solution for injection', 'powder for']) or True
        if 'eye' in f or 'ophthalmic' in f:
            return any(w in c for w in ['eye', 'ophth', 'drop', 'sol', 'visc'])
        if 'ear' in f or 'otic' in f:
            return any(w in c for w in ['ear', 'otic', 'drop', 'sol'])
        if 'cream' in f:
            return any(w in c for w in ['cream', 'gel', 'topical'])
        if 'ointment' in f:
            return any(w in c for w in ['ointment', 'oint', 'gel', 'cream'])
        if 'inhaler' in f or 'respiratory' in f:
            return any(w in c for w in ['inhal', 'evohaler', 'rotacap', 'resp', 'puff', 'aerosol'])
        if 'capsule' in f:
            if any(w in c for w in ['syrup', 'suspension', 'cream', 'inj']):
                return False
            return any(w in c for w in ['cap', 'capsule', 'tab', 'tablet'])
        if 'tablet' in f:
            if any(w in c for w in ['syrup', 'suspension', 'cream', 'inj']):
                return False
            return any(w in c for w in ['tab', 'tablet', 'cap', 'capsule'])

        return True

    def search_mydawa(self, name, generic, brand, form, strength):
        clean_b = self.clean_text(brand)
        clean_g = self.clean_text(generic)

        queries = []
        if clean_b and strength:
            queries.append(f"{clean_b} {strength}")
        if clean_b:
            queries.append(clean_b)
        if clean_g and strength:
            queries.append(f"{clean_g} {strength}")
        if clean_g:
            queries.append(clean_g)

        for q in queries:
            try:
                url = f"https://mydawa.com/productsearch?query={urllib.parse.quote(q)}&limit=10&productSearch=true"
                r = self.session.post(url, json={}, timeout=8)
                if r.status_code == 401 or r.status_code == 403:
                    self.init_mydawa()
                    r = self.session.post(url, json={}, timeout=8)
                if r.status_code == 200:
                    products = r.json().get('products', [])
                    for p in products:
                        imgs = p.get('imageLink', [])
                        pname = p.get('name', '')
                        if imgs and isinstance(imgs[0], str) and imgs[0].strip().startswith('http') and 'No_Image' not in imgs[0]:
                            img_url = imgs[0].strip()
                            if self.name_matches(pname, generic, brand) and self.form_matches(pname, form):
                                if self.verify_image_url(img_url):
                                    return img_url, f"MyDawa: {pname}"
                time.sleep(0.04)
            except Exception:
                pass
        return None, None

    def search_dailymed(self, generic, brand, form):
        clean_g = self.clean_text(generic)
        clean_b = self.clean_text(brand)

        names_to_try = []
        if clean_g:
            names_to_try.append(clean_g)
        if clean_b and clean_b != clean_g:
            names_to_try.append(clean_b)

        # Try active ingredient splits if multi-drug
        for part in re.split(r'[\+/]', clean_g):
            part = part.strip()
            if len(part) > 3 and part not in names_to_try:
                names_to_try.append(part)

        # Check synonyms
        for n in list(names_to_try):
            syn = SYNONYMS.get(n.lower())
            if syn and syn not in names_to_try:
                names_to_try.append(syn)

        for drug in names_to_try:
            try:
                url = f"https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name={urllib.parse.quote(drug)}&page=1&pagesize=10"
                r = requests.get(url, timeout=8)
                if r.status_code != 200:
                    continue
                spls = r.json().get('data', [])

                f_words = [w for w in form.lower().split() if len(w) > 2 and w not in ['oral', 'tablet', 'capsule']]
                matching = []
                other = []
                for s in spls:
                    stitle = s.get('title', '').lower()
                    if any(w in stitle for w in f_words):
                        matching.append(s)
                    else:
                        other.append(s)

                for spl in (matching + other):
                    setid = spl.get('setid')
                    media_url = f"https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/{setid}/media.json"
                    mr = requests.get(media_url, timeout=8)
                    if mr.status_code == 200:
                        media_list = mr.json().get('data', {}).get('media', [])
                        # Prioritize packaging images (label, bottle, carton, blister, pack, vial)
                        sorted_media = sorted(
                            media_list,
                            key=lambda m: 0 if any(k in m.get('name', '').lower() for k in ['carton', 'box', 'bottle', 'vial', 'label', 'pack', 'blister']) else 1
                        )
                        for m in sorted_media:
                            m_url = m.get('url')
                            mname = m.get('name', '').lower()
                            mime = m.get('mime_type', '').lower()
                            if ('image' in mime or any(ext in mname for ext in ['.jpg', '.png', '.jpeg'])) and not any(skip in mname for skip in [
                                'logo', 'structure', 'chem', 'warning', 'qr', 'diagram', 'graph', 'chart', 'scheme', 'molecular'
                            ]):
                                if self.verify_image_url(m_url):
                                    return m_url, f"DailyMed: {spl.get('title')}"
                time.sleep(0.04)
            except Exception:
                pass
        return None, None

    def search_wikimedia(self, name, generic, brand, form):
        clean_g = self.clean_text(generic)
        clean_b = self.clean_text(brand)

        queries = []
        if clean_b:
            queries.append(f"{clean_b} medicine")
            queries.append(f"{clean_b} package")
        queries.append(f"{clean_g} {form}")
        queries.append(f"{clean_g} medicine")
        queries.append(f"{clean_g} tablets")
        queries.append(f"{clean_g} package")

        for q in queries:
            try:
                url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(q)}&gsrnamespace=6&prop=imageinfo&iiprop=url|mime&format=json&gsrlimit=10"
                res = requests.get(url, headers={'User-Agent': 'MedLibraryBot/2.0 (contact@afyvia.org)'}, timeout=8)
                if res.status_code == 200:
                    pages = res.json().get('query', {}).get('pages', {})
                    for pid, p in pages.items():
                        title = p.get('title', '').lower()
                        info = p.get('imageinfo', [{}])[0]
                        u = info.get('url', '')
                        mime = info.get('mime', '').lower()

                        # Strict negative filter
                        if any(bad in title for bad in [
                            'rash', 'lesion', 'skin', 'patient', 'wound', 'reaction', 'syndrome',
                            'disease', 'infection', 'balls', 'ball', '3d', 'crystal', 'structure',
                            'formula', 'skeletal', 'synthesis', 'diagram', 'scheme', 'mechanism',
                            'model', 'svg', 'warningbox', 'rod.svg', 'molecule', 'spacefill',
                            'microscopy', 'histology', 'biopsy', 'electron', 'dna', 'rna', 'cell',
                            'bacteria', 'virus', 'x-ray', 'ct-scan', 'mri'
                        ]):
                            continue

                        if any(ext in title for ext in ['.jpg', '.jpeg', '.png', '.webp']):
                            if self.name_matches(title, generic, brand) and self.form_matches(title, form):
                                if self.verify_image_url(u):
                                    return u, f"Wikimedia: {p.get('title')}"
                time.sleep(0.04)
            except Exception:
                pass
        return None, None

    def find_image(self, row, index):
        name = row['name']
        generic = row['generic_name']
        brand = row['brand_name']
        form = row['dosage_form']
        strength = row['strength_display']

        # Check cache
        if name in self.cache and self.cache[name].get('image_url'):
            cached_url = self.cache[name]['image_url']
            if self.verify_image_url(cached_url):
                return cached_url, self.cache[name].get('source', 'Cached')

        # Check special fallback dictionary
        clean_g_lower = self.clean_text(generic).lower()
        clean_b_lower = self.clean_text(brand).lower()
        name_lower = name.lower()

        for key, url in SPECIAL_FALLBACKS.items():
            if key in name_lower or key in clean_g_lower or (clean_b_lower and key in clean_b_lower):
                if self.verify_image_url(url):
                    src = f"Special Fallback: {key}"
                    self.cache[name] = {'image_url': url, 'source': src}
                    self.save_cache()
                    return url, src

        # Tier 1: MyDawa
        img, src = self.search_mydawa(name, generic, brand, form, strength)
        if img:
            self.cache[name] = {'image_url': img, 'source': src}
            self.save_cache()
            return img, src

        # Tier 2: DailyMed
        img, src = self.search_dailymed(generic, brand, form)
        if img:
            self.cache[name] = {'image_url': img, 'source': src}
            self.save_cache()
            return img, src

        # Tier 3: Wikimedia Commons
        img, src = self.search_wikimedia(name, generic, brand, form)
        if img:
            self.cache[name] = {'image_url': img, 'source': src}
            self.save_cache()
            return img, src

        return None, None

def main():
    hunter = ImageHunter()

    with open(CSV_FILE, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    print(f"Loaded {len(rows)} medications from {CSV_FILE}")

    success_count = 0
    missing = []

    for i, row in enumerate(rows):
        name = row['name']
        print(f"\n[{i+1}/{len(rows)}] Searching image for: {name}")
        img_url, src = hunter.find_image(row, i)

        if img_url:
            row['image_url'] = img_url
            row['image_urls'] = img_url
            success_count += 1
            print(f"  --> FOUND: {img_url}\n      SOURCE: {src}")
        else:
            print(f"  --> NOT FOUND for {name} (Generic: {row['generic_name']}, Brand: {row['brand_name']})")
            missing.append((i+1, name, row['generic_name'], row['brand_name'], row['dosage_form']))

    # Write updated CSV
    with open(CSV_FILE, mode='w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n=======================================================")
    print(f"FINISHED! Successfully updated {success_count}/{len(rows)} medications.")
    if missing:
        print(f"Missing items ({len(missing)}):")
        for idx, n, g, b, form in missing:
            print(f"  #{idx}: {n} | Generic: {g} | Brand: {b} | Form: {form}")
    print(f"CSV updated at: {CSV_FILE}")

if __name__ == '__main__':
    main()
