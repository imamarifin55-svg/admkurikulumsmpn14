import { CurriculumDocument, Teacher } from '../types/curriculum';

export function getSamePersonTeachers(teacher: Teacher, allTeachers: Teacher[]): Teacher[] {
  const normName = (teacher.name || '').trim().toLowerCase();
  const normNip = (teacher.nip || '').trim();
  const normEmail = (teacher.email || '').trim().toLowerCase();

  return allTeachers.filter((t) => {
    if (t.id === teacher.id) return true;
    if (normName && (t.name || '').trim().toLowerCase() === normName) return true;
    if (normNip && normNip !== '-' && (t.nip || '').trim() === normNip) return true;
    if (normEmail && (t.email || '').trim().toLowerCase() === normEmail) return true;
    return false;
  });
}

/**
 * Matches a curriculum document strictly to a teacher+subject entry so teachers
 * who teach multiple subjects never have documents/counts cross-counted across subjects.
 */
export function doesDocumentMatchTeacher(
  doc: CurriculumDocument,
  teacher: Teacher,
  allTeachers: Teacher[]
): boolean {
  const samePersonTeachers = getSamePersonTeachers(teacher, allTeachers);
  const hasMultipleSubjects = samePersonTeachers.length > 1;
  const teacherSub = (teacher.subject || '').trim().toLowerCase();
  const docSub = (doc.subject || '').trim().toLowerCase();

  if (doc.teacherId) {
    if (doc.teacherId === teacher.id) {
      if (hasMultipleSubjects && docSub && teacherSub) {
        return docSub === teacherSub;
      }
      return true;
    }

    // Only attribute across sibling entries of the exact same person if the document's
    // subject matches this row's subject and does NOT match the linked entry's subject.
    if (
      hasMultipleSubjects &&
      docSub &&
      teacherSub &&
      docSub === teacherSub &&
      samePersonTeachers.some((t) => t.id === doc.teacherId)
    ) {
      const linkedRow = allTeachers.find((t) => t.id === doc.teacherId);
      const linkedSub = (linkedRow?.subject || '').trim().toLowerCase();
      return linkedSub !== docSub;
    }

    return false;
  }

  // Legacy fallback only when document has no teacherId
  const normDocName = (doc.teacherName || '').trim().toLowerCase();
  const normTeacherName = (teacher.name || '').trim().toLowerCase();
  const normDocNip = (doc.teacherNip || '').trim();
  const normTeacherNip = (teacher.nip || '').trim();

  const matchesPerson =
    (Boolean(normTeacherName) && normDocName === normTeacherName) ||
    (Boolean(normTeacherNip) && normTeacherNip !== '-' && normDocNip === normTeacherNip);

  if (!matchesPerson) return false;
  if (hasMultipleSubjects && teacherSub) {
    return docSub === teacherSub;
  }
  return true;
}
