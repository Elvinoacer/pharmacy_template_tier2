/** Copy and next steps for every prescription / pack-photo upload outcome. */

export type FeedbackTone = "info" | "success" | "warning" | "error";

export type FeedbackAction = {
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  href?: string;
};

export type UploadFeedbackModel = {
  code: string;
  tone: FeedbackTone;
  title: string;
  message: string;
  actions: FeedbackAction[];
};

export const FEEDBACK_ACTIONS = {
  retryPhoto: {
    id: "retry_photo",
    label: "Try another photo",
    variant: "secondary",
  } satisfies FeedbackAction,
  typeNames: {
    id: "focus_names",
    label: "Type the names",
    variant: "primary",
  } satisfies FeedbackAction,
  search: {
    id: "search",
    label: "Check availability",
    variant: "primary",
  } satisfies FeedbackAction,
  refer: {
    id: "refer",
    label: "Send to a pharmacist",
    variant: "secondary",
  } satisfies FeedbackAction,
  retrySearch: {
    id: "retry_search",
    label: "Try the search again",
    variant: "primary",
  } satisfies FeedbackAction,
  retrySubmit: {
    id: "retry_submit",
    label: "Try submitting again",
    variant: "primary",
  } satisfies FeedbackAction,
  browse: {
    id: "browse",
    label: "Browse medicines",
    href: "/medicines",
    variant: "ghost",
  } satisfies FeedbackAction,
  pharmacies: {
    id: "pharmacies",
    label: "Find a pharmacy",
    href: "/pharmacies",
    variant: "ghost",
  } satisfies FeedbackAction,
  portal: {
    id: "portal",
    label: "Open patient portal",
    href: "/portal/prescriptions",
    variant: "ghost",
  } satisfies FeedbackAction,
  refill: {
    id: "refill",
    label: "Request a refill",
    href: "/portal/refills/new",
    variant: "secondary",
  } satisfies FeedbackAction,
  login: {
    id: "login",
    label: "Sign in to continue",
    href: "/login?next=/portal/prescriptions",
    variant: "primary",
  } satisfies FeedbackAction,
  prescriptionPage: {
    id: "prescription_page",
    label: "Upload a prescription",
    href: "/prescription",
    variant: "secondary",
  } satisfies FeedbackAction,
  contact: {
    id: "contact",
    label: "Contact a pharmacy",
    href: "/contact",
    variant: "ghost",
  } satisfies FeedbackAction,
} as const;

function model(
  code: string,
  tone: FeedbackTone,
  title: string,
  message: string,
  actions: FeedbackAction[],
): UploadFeedbackModel {
  return { code, tone, title, message, actions };
}

export function photoReadFeedback(input: {
  code: string;
  nameCount?: number;
  retryAfterSeconds?: number;
}): UploadFeedbackModel {
  const { code, nameCount = 0, retryAfterSeconds } = input;
  switch (code) {
    case "reading":
      return model(
        code,
        "info",
        "Reading your prescription",
        "We’re picking out medicine names and strengths. Next you’ll review them, then we can check which pharmacies have them.",
        [],
      );
    case "read_ok":
      return model(
        code,
        "success",
        nameCount === 1
          ? "We found 1 medicine on this photo"
          : `We found ${nameCount} medicines on this photo`,
        "Review each name and strength against your paper, then check availability. If anything looks wrong, edit the list or send the photo to a pharmacist.",
        [
          FEEDBACK_ACTIONS.search,
          FEEDBACK_ACTIONS.typeNames,
          FEEDBACK_ACTIONS.refer,
          FEEDBACK_ACTIONS.retryPhoto,
        ],
      );
    case "unreadable":
      return model(
        code,
        "warning",
        "We couldn’t read the medicine names",
        "The photo was received, but names and strengths weren’t clear enough. A closer, brighter shot of the medicine list usually works. You can also type the names or send this photo to a pharmacist.",
        [
          FEEDBACK_ACTIONS.typeNames,
          FEEDBACK_ACTIONS.retryPhoto,
          FEEDBACK_ACTIONS.refer,
          FEEDBACK_ACTIONS.browse,
        ],
      );
    case "missing_file":
      return model(
        code,
        "warning",
        "Choose a prescription photo",
        "Select a JPEG, PNG or WebP image of the medicine list. If you don’t have a photo, type the names and we can still check availability.",
        [
          FEEDBACK_ACTIONS.retryPhoto,
          FEEDBACK_ACTIONS.typeNames,
          FEEDBACK_ACTIONS.browse,
        ],
      );
    case "invalid_type":
      return model(
        code,
        "warning",
        "That file isn’t a supported photo",
        "Use a JPEG, PNG or WebP image up to 5 MB. PDFs can’t be read here — type the names, or send the file from your patient portal.",
        [
          FEEDBACK_ACTIONS.retryPhoto,
          FEEDBACK_ACTIONS.typeNames,
          FEEDBACK_ACTIONS.portal,
        ],
      );
    case "file_too_large":
      return model(
        code,
        "warning",
        "That photo is larger than 5 MB",
        "Take a closer crop of the medicine list, or choose a smaller image. You can also type the names now so we don’t lose your place.",
        [
          FEEDBACK_ACTIONS.retryPhoto,
          FEEDBACK_ACTIONS.typeNames,
          FEEDBACK_ACTIONS.refer,
        ],
      );
    case "rate_limited":
      return model(
        code,
        "warning",
        "Photo reading needs a short pause",
        retryAfterSeconds
          ? `Please wait about ${retryAfterSeconds} seconds before another photo. You can type the names now, or send this photo to a pharmacist.`
          : "Please wait a moment before another photo. You can type the names now, or send this photo to a pharmacist.",
        [
          FEEDBACK_ACTIONS.typeNames,
          FEEDBACK_ACTIONS.refer,
          FEEDBACK_ACTIONS.retryPhoto,
          FEEDBACK_ACTIONS.browse,
        ],
      );
    case "ai_unavailable":
    case "ai_not_configured":
      return model(
        "ai_unavailable",
        "error",
        "Photo reading is unavailable right now",
        "We couldn’t reach the photo reader. Type the medicine names to check availability, or send this photo to a pharmacist who can read it for you.",
        [
          FEEDBACK_ACTIONS.typeNames,
          FEEDBACK_ACTIONS.refer,
          FEEDBACK_ACTIONS.retryPhoto,
          FEEDBACK_ACTIONS.pharmacies,
        ],
      );
    case "network":
      return model(
        code,
        "error",
        "We lost the connection while reading this photo",
        "Check your internet, then try the photo again. You can also type the names or send the photo to a pharmacist so this doesn’t stop here.",
        [
          FEEDBACK_ACTIONS.retryPhoto,
          FEEDBACK_ACTIONS.typeNames,
          FEEDBACK_ACTIONS.refer,
          FEEDBACK_ACTIONS.contact,
        ],
      );
    default:
      return model(
        "read_failed",
        "error",
        "We couldn’t finish reading this photo",
        "Something went wrong on our side. Your next step is to type the names, try a clearer photo, or send this image to a pharmacist for review.",
        [
          FEEDBACK_ACTIONS.typeNames,
          FEEDBACK_ACTIONS.retryPhoto,
          FEEDBACK_ACTIONS.refer,
          FEEDBACK_ACTIONS.browse,
        ],
      );
  }
}

export function availabilitySearchFeedback(input: {
  code: string;
  retryAfterSeconds?: number;
}): UploadFeedbackModel {
  const { code, retryAfterSeconds } = input;
  if (code === "rate_limited") {
    return model(
      code,
      "warning",
      "Too many availability checks",
      retryAfterSeconds
        ? `Please wait about ${retryAfterSeconds} seconds, then search again. You can also send the prescription to a pharmacist in the meantime.`
        : "Please wait a moment, then search again. You can also send the prescription to a pharmacist in the meantime.",
      [
        FEEDBACK_ACTIONS.retrySearch,
        FEEDBACK_ACTIONS.refer,
        FEEDBACK_ACTIONS.browse,
      ],
    );
  }
  if (code === "validation") {
    return model(
      code,
      "warning",
      "Add 1–12 medicine names to continue",
      "Enter one medicine and strength per line. If you have a photo, we can try reading it, or a pharmacist can take it from here.",
      [
        FEEDBACK_ACTIONS.typeNames,
        FEEDBACK_ACTIONS.retryPhoto,
        FEEDBACK_ACTIONS.refer,
      ],
    );
  }
  return model(
    "search_failed",
    "error",
    "We couldn’t check availability just now",
    "Try the search again in a moment. If you need to keep moving, send this prescription to a pharmacist or browse listed medicines.",
    [
      FEEDBACK_ACTIONS.retrySearch,
      FEEDBACK_ACTIONS.refer,
      FEEDBACK_ACTIONS.browse,
      FEEDBACK_ACTIONS.pharmacies,
    ],
  );
}

export function portalUploadFeedback(input: {
  code: string;
}): UploadFeedbackModel {
  switch (input.code) {
    case "upload_ok":
      return model(
        input.code,
        "success",
        "Prescription received",
        "A pharmacist will review this shortly. You can request a refill, check public availability, or stay on your prescriptions list.",
        [
          FEEDBACK_ACTIONS.refill,
          FEEDBACK_ACTIONS.prescriptionPage,
          FEEDBACK_ACTIONS.portal,
        ],
      );
    case "sign_in_required":
      return model(
        input.code,
        "warning",
        "Sign in to send this prescription",
        "Your photo is still on this device. Sign in, then submit again. You can also check public availability without an account.",
        [FEEDBACK_ACTIONS.login, FEEDBACK_ACTIONS.prescriptionPage],
      );
    case "validation":
      return model(
        input.code,
        "warning",
        "Add a medicine name or attach the photo",
        "Type the medicines if you can read them, or attach a photo and we’ll ask the pharmacist to confirm the names.",
        [FEEDBACK_ACTIONS.retrySubmit, FEEDBACK_ACTIONS.prescriptionPage],
      );
    case "invalid_file":
      return model(
        input.code,
        "warning",
        "That file couldn’t be attached",
        "Use a JPEG, PNG, WebP or PDF up to 5 MB. You can still submit the medicine names, or check availability without an account.",
        [
          FEEDBACK_ACTIONS.retrySubmit,
          FEEDBACK_ACTIONS.prescriptionPage,
          FEEDBACK_ACTIONS.browse,
        ],
      );
    default:
      return model(
        "upload_failed",
        "error",
        "We couldn’t send this prescription",
        "Try submitting again. If it still fails, check availability yourself or send the photo from the public prescription page.",
        [
          FEEDBACK_ACTIONS.retrySubmit,
          FEEDBACK_ACTIONS.prescriptionPage,
          FEEDBACK_ACTIONS.contact,
        ],
      );
  }
}

export function packPhotoFeedback(input: { code: string }): UploadFeedbackModel {
  switch (input.code) {
    case "search_failed":
    case "read_failed":
      return model(
        input.code,
        "error",
        "We couldn’t finish that pack photo",
        "Try the photo again, type the medicine name, or upload the prescription so a pharmacist can take the next step.",
        [
          { id: "retry_pack", label: "Try this photo again", variant: "primary" },
          FEEDBACK_ACTIONS.prescriptionPage,
          FEEDBACK_ACTIONS.browse,
          FEEDBACK_ACTIONS.contact,
        ],
      );
    default: {
      const base = photoReadFeedback(input);
      return {
        ...base,
        actions: [
          FEEDBACK_ACTIONS.retryPhoto,
          FEEDBACK_ACTIONS.prescriptionPage,
          FEEDBACK_ACTIONS.browse,
          FEEDBACK_ACTIONS.contact,
        ],
      };
    }
  }
}

export function feedbackFromApiPayload(
  data: unknown,
  fallback: UploadFeedbackModel,
): UploadFeedbackModel {
  if (!data || typeof data !== "object") return fallback;
  const row = data as {
    code?: unknown;
    tone?: unknown;
    title?: unknown;
    message?: unknown;
    error?: unknown;
    actions?: unknown;
  };
  const title = typeof row.title === "string" ? row.title : "";
  const message =
    typeof row.message === "string"
      ? row.message
      : typeof row.error === "string"
        ? row.error
        : fallback.message;
  const actions = Array.isArray(row.actions)
    ? row.actions.filter(
        (action): action is FeedbackAction =>
          Boolean(
            action &&
              typeof action === "object" &&
              typeof (action as FeedbackAction).id === "string" &&
              typeof (action as FeedbackAction).label === "string",
          ),
      )
    : fallback.actions;
  if (!title && !message) return fallback;
  const tone: FeedbackTone =
    row.tone === "info" ||
    row.tone === "success" ||
    row.tone === "warning" ||
    row.tone === "error"
      ? row.tone
      : fallback.tone;
  return {
    code: typeof row.code === "string" ? row.code : fallback.code,
    tone,
    title: title || fallback.title,
    message: message || fallback.message,
    actions: actions.length ? actions : fallback.actions,
  };
}
