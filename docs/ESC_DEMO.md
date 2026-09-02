# ESC adaptive demo (60–90 seconds)

1. Create an ESC account, then enter “Grade 12”, a curriculum, a goal, a deadline, and 45 daily study minutes.
2. Upload a short set of notes tagged `Electrostatics` (or paste text) and generate a five-question diagnostic.
3. Submit it with weak or blank answers. Point out the backend score, topic mastery, confidence, plain-language “Why?” diagnosis, uploaded-note recommendation, and plan version 1.
4. Mark one task complete; refresh to show that plan task state is stored.
5. Re-test the topic with improved answers. ESC displays the new mastery/trend and creates plan version 2 with an explained priority change.
6. Sign out and sign back in to demonstrate that the learning memory belongs to the account rather than browser-only state.

For a contrasting student, create a second account with the same profile but perform strongly on `Electrostatics` and weakly on another topic. The stored mastery and plan priorities differ because the planner uses attempts, not pre-filled UI scores.

Alternatively run `py -3 scripts/seed_esc_demo.py` from `backend/`. It creates `student.a@esc.demo` and `student.b@esc.demo` with password `EscDemoPass123!`, same availability, and opposite Topic X/Topic Y performance. Student A includes an improving Topic X re-test.
