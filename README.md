# Assessment Dashboard

A local dashboard for MD and DO assessment. Faculty build case blueprints, feedback givers leave comments, and students compile a progress portfolio. Scores and people in the app are sample data so the screens can be tried. They are not real learner results.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173/. Production build:

```bash
npm run build
npm run preview
```

Edits stay in this browser under the key `assessment-blueprint-v1`. **Restore sample data** in the header puts the original sample back.

## Roles

Use the Role and Person menus in the header. This switcher is for trying the product. It is not a login.

| Role | What they do |
| --- | --- |
| Student | Read synthesized feedback and compile a portfolio. |
| Feedback giver | Dictate, upload, record, or revise a sample narrative. Givers may be faculty, assessment educators, standardized patients, students, or upper-class peers. |
| Assessment educator | Build blueprints, sample narratives, and cases, and review cohort results. |
| Admin | All of the above, plus assigning one or more roles to each person. |

Try Elena Vasquez as a student, Priya Raman as a feedback giver, and Amira Shah as an assessment educator or admin.

## How a case is built

Checklist items sit inside skills, skills inside domains, and domains inside a blueprint. A blueprint has a scenario (abdominal pain, back pain, headache, and other common presentations), a case type (OSCE, reflection, or direct observation), and a learner year (Year 1–4, OMS or MS).

A skill is ready when it has enough items. The defaults are 4 for an OSCE, 2 for a reflection, and 3 for a direct observation. Developing a case copies the ready skills and can assign that case to a class.

## Feedback and dictation

Feedback can be dictated, uploaded, recorded, or started from a sample narrative. The app groups the transcript and checklist marks into a short synthesis for the student.

Dictation uses the browser speech recognizer. In Chrome, choose **Start dictation** and **Allow** on the microphone prompt. Speech keeps landing in the transcript until **Stop dictation**. Uploaded audio is kept for the session only and is not transcribed here.

## Cohort view

Educators can look across a class or follow one class from Year 1 to Year 4, including gender, race, ethnicity, and underrepresented-in-medicine status. URiM is a field the school records. The dashboard does not infer it from race or ethnicity. A group mean is hidden when fewer than 3 learners are in that cell.
