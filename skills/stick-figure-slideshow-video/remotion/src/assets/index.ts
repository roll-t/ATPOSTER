/**
 * All available pose asset IDs.
 * Each ID maps to: public/assets/pose/<id>.png
 * Use these strings in manifest elements[].asset field.
 */
export const POSE_IDS = [
  // Standing / emotions
  "pose_standing_neutral",
  "pose_happy_arms_up",
  "pose_sad",
  "pose_thinking",
  "pose_angry",
  "pose_shocked",
  "pose_pointing_right",
  "pose_waving",
  "pose_pointing_at_viewer",
  // Sitting / desk
  "pose_meditating",
  "pose_typing",
  "pose_writing_sitting",
  "pose_reading",
  "pose_sleeping_at_desk",
  "pose_stressed",
  "pose_sad_hugging_knees",
  "pose_phone_sitting",
  "pose_eating",
  // Movement
  "pose_running",
  "pose_walking",
  "pose_jumping",
  "pose_walking_phone",
  "pose_tired_running",
  "pose_stretching",
  "pose_overwhelmed",
  "pose_facepalm",
  "pose_celebrating",
  // Lying / reactions
  "pose_sleeping",
  "pose_lying_phone",
  "pose_lying_resting",
  "pose_crying",
  "pose_laughing",
  "pose_comparing",
  "pose_exhausted",
  "pose_shocked_receipt",
  "pose_listening",
] as const;

export type PoseId = (typeof POSE_IDS)[number];
