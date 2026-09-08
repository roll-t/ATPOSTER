/**
 * Backward-compatibility proxy for the Master Skill Registry.
 * Giữ nguyên giao diện cho các use case và API routes cũ gọi getSkill(category).
 */
export { getSkill, getAllSkills, getSkillFormSchema, getSkillSyllabus, default } from '../../../../skills/index.js';
