/**
 * Image Search API for Medication Recognition
 * Uses Groq API with vision-capable model to analyze uploaded medication images
 * and match against pharmacy inventory
 */

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { prisma } from "@/app/lib/db";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

// Model configuration - using llama-3.2-90b-vision-preview for vision tasks
// This is more cost-effective than larger models while maintaining accuracy
const VISION_MODEL = "llama-3.2-90b-vision-preview";

// Cache for medication embeddings/similarities (in-memory for demo, use Redis in production)
const medicationCache = new Map<string, any>();

/**
 * POST /api/search/image
 * Accepts multipart form data with image file
 * Returns matched medications with availability status
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    
    if (!imageFile) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: "Invalid image format. Please upload JPEG, PNG, or WebP." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        { error: "Image too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Convert image to base64
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");
    const dataUrl = `data:${imageFile.type};base64,${base64Image}`;

    // Fetch all active medications from database
    const medications = await prisma.medication.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        category: true,
        description: true,
        price: true,
        stockQty: true,
        publicListing: true,
        overTheCounter: true,
        prescriptionRequired: true,
        imageUrl: true,
      },
      orderBy: [{ name: "asc" }],
    });

    if (medications.length === 0) {
      return NextResponse.json(
        { 
          matches: [], 
          message: "No medications found in inventory" 
        },
        { status: 200 }
      );
    }

    // Build optimized prompt with medication list
    // Cost optimization: Only include essential fields, use compact JSON
    const medicationList = medications.map(m => ({
      id: m.id,
      name: m.name,
      category: m.category,
      stock: m.stockQty,
      public: m.publicListing,
    })).slice(0, 100); // Limit to first 100 for prompt size (can paginate if needed)

    const systemPrompt = `You are a medication recognition expert. Analyze the uploaded image of medication packaging/pills and identify what medication it shows.

Return ONLY a JSON object with this exact structure:
{
  "identified_medication": "name of medication identified from image",
  "confidence": 0.0-1.0,
  "active_ingredient": "main active ingredient if visible",
  "dosage": "dosage strength if visible (e.g., 500mg)",
  "manufacturer": "manufacturer name if visible",
  "notes": "any relevant observations about the image"
}

If you cannot identify the medication with reasonable confidence (<0.5), set confidence to the actual value and identified_medication to null.`;

    const userPrompt = `Here is our current medication inventory. Match what you see in the image to one of these medications if possible:

${JSON.stringify(medicationList)}

Analyze the image and provide your response in the exact JSON format specified.`;

    // Call Groq API with vision model
    const chatCompletion = await groq.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt,
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "low", // Use low detail for cost savings
              },
            },
          ],
        },
      ],
      temperature: 0.1, // Low temperature for consistent results
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error("No response from AI model");
    }

    const parsed = JSON.parse(aiResponse);
    
    // Find matching medications based on AI identification
    let matches: any[] = [];
    
    if (parsed.identified_medication && parsed.confidence >= 0.5) {
      const searchTerms = [
        parsed.identified_medication.toLowerCase(),
        parsed.active_ingredient?.toLowerCase() || "",
      ].filter(Boolean);

      // Search for matches in inventory
      matches = medications.filter(m => {
        const nameMatch = m.name.toLowerCase().includes(searchTerms[0]);
        const categoryMatch = m.category.toLowerCase().includes(searchTerms[0]);
        const descMatch = m.description?.toLowerCase().includes(searchTerms[0]) || false;
        return nameMatch || categoryMatch || descMatch;
      }).map(m => ({
        ...m,
        matchScore: calculateMatchScore(m, parsed),
        availability: getAvailabilityStatus(m),
      }));

      // Sort by match score
      matches.sort((a, b) => b.matchScore - a.matchScore);
    }

    // If no direct matches, return top medications by other criteria
    if (matches.length === 0 && parsed.confidence >= 0.5) {
      // Return medications in same category as fallback
      const categoryMatches = medications.filter(m => 
        m.category.toLowerCase().includes(parsed.identified_medication.toLowerCase())
      ).slice(0, 5).map(m => ({
        ...m,
        matchScore: 0.3,
        availability: getAvailabilityStatus(m),
        note: "Similar category match",
      }));
      matches = categoryMatches;
    }

    return NextResponse.json({
      success: true,
      analysis: {
        identified: parsed.identified_medication,
        confidence: parsed.confidence,
        activeIngredient: parsed.active_ingredient,
        dosage: parsed.dosage,
        manufacturer: parsed.manufacturer,
        notes: parsed.notes,
      },
      matches: matches.slice(0, 10), // Return top 10 matches
      totalMatches: matches.length,
    });

  } catch (error) {
    console.error("Image search error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to analyze image", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate match score between identified medication and inventory item
 */
function calculateMatchScore(medication: any, analysis: any): number {
  let score = 0;
  
  const medName = medication.name.toLowerCase();
  const identified = analysis.identified_medication?.toLowerCase() || "";
  const ingredient = analysis.active_ingredient?.toLowerCase() || "";
  
  // Exact name match
  if (medName === identified) {
    score += 1.0;
  }
  // Name contains identified
  else if (medName.includes(identified)) {
    score += 0.8;
  }
  // Identified contains name
  else if (identified.includes(medName)) {
    score += 0.7;
  }
  // Category match
  else if (medication.category.toLowerCase().includes(identified)) {
    score += 0.5;
  }
  
  // Boost if active ingredient matches
  if (ingredient && medName.includes(ingredient)) {
    score += 0.2;
  }
  
  // Factor in AI confidence
  score *= analysis.confidence;
  
  return Math.min(score, 1.0);
}

/**
 * Determine availability status for display
 */
function getAvailabilityStatus(medication: any): {
  status: "in_stock" | "low_stock" | "out_of_stock" | "internal_only";
  displayText: string;
  showPublicly: boolean;
} {
  const isInStock = medication.stockQty > 0;
  const isPublic = medication.publicListing;
  
  if (!isPublic) {
    return {
      status: "internal_only",
      displayText: "Available internally - contact us for details",
      showPublicly: false,
    };
  }
  
  if (!isInStock) {
    return {
      status: "out_of_stock",
      displayText: "Currently out of stock",
      showPublicly: true,
    };
  }
  
  if (medication.stockQty <= medication.lowStockThreshold) {
    return {
      status: "low_stock",
      displayText: `Only ${medication.stockQty} left`,
      showPublicly: true,
    };
  }
  
  return {
    status: "in_stock",
    displayText: "In stock",
    showPublicly: true,
  };
}

/**
 * GET /api/search/image
 * Returns metadata about the image search capability
 */
export async function GET() {
  return NextResponse.json({
    name: "Medication Image Search",
    description: "Upload a photo of your medication to find matches in our inventory",
    supportedFormats: ["image/jpeg", "image/png", "image/webp"],
    maxFileSize: "5MB",
    features: [
      "AI-powered medication recognition",
      "Real-time inventory matching",
      "Confidence scoring",
      "Public/internal availability filtering",
    ],
  });
}
