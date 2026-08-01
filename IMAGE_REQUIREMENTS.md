# Image Requirements for Pharmacy Project

Currently, the project uses Unsplash stock images across various pages and data structures. To replace them with your own generated, polished images, here is a complete inventory of every image used, its context, and what it should depict. 

Once you generate these images, place them in the `public/images` folder and update the respective paths in the code (mostly in `app/lib/data.ts` and page components) from `https://images.unsplash.com/...` to `/images/your-file-name.jpg`.

---

## 1. Team Member Avatars
**Location:** `app/lib/data.ts` (Lines 57-81)  
**Aspect Ratio:** 1:1 (Square)
* **Lead Pharmacist:** Professional headshot of Marcus Chen, RPh in a pharmacy setting.
* **Clinical Pharmacist:** Professional headshot of Dr. Priya Nair, PharmD. 
* **Lead Technician:** Professional headshot of Sofia Alvarez, CPhT.
* **Delivery Coordinator:** Professional headshot of David Kim in a friendly, approachable delivery uniform.

## 2. Pharmacy Services
**Location:** `app/lib/data.ts` (Lines 117-236)  
**Aspect Ratio:** 16:9 or 3:2 (Landscape)
* **Prescription Dispensing:** A pharmacist carefully preparing or handing over medication.
* **Medication Reviews:** A pharmacist sitting with a patient, discussing their health and medication.
* **Health Screenings:** A professional taking a patient's blood pressure or conducting a quick screening.
* **Diabetes Care:** Close-up of diabetes care tools, or a consultation focusing on diabetes management.
* **Immunisations:** A pharmacist administering a vaccine to a patient.
* **Clinical Care:** A healthcare professional holding a clipboard, in a clean clinical environment.
* **Delivery Services:** A pharmacy delivery vehicle or a delivery person handing a package to a customer at their door.
* **Home Setup Consultation:** A pharmacist reviewing medication in a home-like setting.

## 3. Over-the-Counter (OTC) Categories
**Location:** `app/lib/data.ts` (Lines 247-338)  
**Aspect Ratio:** Square or 4:3
* **Pain Relief:** Clean, well-lit shelf display of pain relief medications.
* **Vitamins & Wellness:** A vibrant display of various vitamin and supplement bottles.
* **Baby & Child Care:** Softly lit aisle showing baby care products (diapers, creams, baby medicines).
* **First Aid:** A neat arrangement of bandages, antiseptics, and wound care kits.
* **Skin Care:** Premium, dermatologist-recommended skincare products on display.
* **Diabetes OTC:** Diabetic supplies like glucose meters and test strips neatly arranged.
* **Family Planning:** A discreet, organized shelf section for family planning and wellness.
* **Cold & Flu:** A shelf stocked with cough syrups, lozenges, and cold relief medicines.

## 4. Health Library Articles
**Location:** `app/lib/data.ts` (Lines 358-454)  
**Aspect Ratio:** 16:9 (Landscape)
* **Article 1:** Relevant to seasonal allergies or cold/flu prevention.
* **Article 2:** Related to heart health or blood pressure management.
* **Article 3:** Related to managing diabetes and nutrition.
* **Article 4:** Focus on mental wellness or stress management.
* **Article 5:** Focus on children's health and immunizations.
* **Article 6:** Focus on general healthy living and vitamins.

## 5. Testimonial Avatars
**Location:** `app/lib/data.ts` (Lines 570-593)  
**Aspect Ratio:** 1:1 (Square)
* **Patient 1:** Friendly headshot of a senior citizen.
* **Patient 2 (Caregiver):** Warm headshot of a middle-aged adult.
* **Patient 3 (Resident):** Smiling headshot of a young professional.
* **Patient 4 (New Patient):** Friendly headshot of a parent.

## 6. Pharmacy Photo Gallery
**Location:** `app/lib/data.ts` (Lines 599-624)  
**Aspect Ratio:** 3:2 or 16:9
* **Image 1:** Bright pharmacy interior with organised shelves.
* **Image 2:** Pharmacist reviewing medication bottles.
* **Image 3:** Consultation between a pharmacist and a patient.
* **Image 4:** Healthcare professional looking at a digital tablet.
* **Image 5:** Close-up of wellness and vitamin products on a modern display.
* **Image 6:** A calm, modern, and inviting clinic waiting area.

## 7. Page-Specific Images
**Location:** Hardcoded inside page components
* **About Page Hero (`app/about/page.tsx`):** A wide, welcoming shot of the pharmacy storefront or a diverse team of pharmacists.
* **Delivery Page Hero (`app/delivery/page.tsx`):** A dynamic photo showing a pharmacy delivery package being prepared or delivered.
* **Home Page Feature 1 (`app/page.tsx`):** High-quality hero image showing a happy customer interacting with a pharmacist.
* **Home Page Feature 2 (`app/page.tsx`):** Focus on technology or modern pharmacy equipment.
* **Home Page Bottom Banner (`app/page.tsx`):** A warm, trustworthy community-focused pharmacy image.
* **Call To Action Banner (`app/components/CtaBanner.tsx`):** A wide, dark-tinted background image showing a clean pharmacy interior.
* **SEO Metadata / OpenGraph (`app/layout.tsx` & `JsonLd.tsx`):** The primary brand image (e.g., a polished photo of the pharmacy exterior with the logo).

---
**Next Steps:**
1. Generate the images described above using your preferred AI generator.
2. Save them to the `public/images/` directory in your Next.js project.
3. Search your project files for `https://images.unsplash.com` and replace the URLs with your local paths (e.g., `/images/hero.jpg`).
