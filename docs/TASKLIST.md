# TASKLIST.md
# AI Roleplay Training Simulator Implementation Tasklist

## 1. Development Approach

Build the application in phases.

Recommended order:

1. Foundation
2. Authentication and roles
3. Database schema
4. Scenario and persona admin
5. User dashboard and scenario library
6. Roleplay session lifecycle
7. Voice AI integration
8. Transcript storage
9. AI analysis
10. Reports and progress
11. Gamification
12. Polish and deployment

## 2. Phase 0: Project Setup

- [ ] Create Laravel project.
- [ ] Configure environment variables.
- [ ] Configure database.
- [ ] Configure queue connection.
- [ ] Configure storage disk.
- [ ] Install authentication starter if needed.
- [ ] Install Tailwind CSS.
- [ ] Set up base Blade layout.
- [ ] Create route groups for user and admin.
- [ ] Create role middleware.
- [ ] Create initial seeders.

## 3. Phase 1: Authentication and Roles

- [ ] Create users table or use Laravel default.
- [ ] Add role column to users.
- [ ] Add status column to users.
- [ ] Create UserRole enum or constants.
- [ ] Create middleware: `role:super_admin`.
- [ ] Create middleware: `role:admin`.
- [ ] Create login screen with retro design.
- [ ] Create logout.
- [ ] Protect dashboard routes.
- [ ] Protect admin routes.
- [ ] Create default super admin seeder.

Acceptance criteria:

- [ ] Super Admin can access admin panel.
- [ ] Normal user cannot access admin panel.
- [ ] Inactive user cannot log in.
- [ ] Login page matches retro-modern direction.

## 4. Phase 2: Database Migrations

Create migrations for:

- [ ] user_profiles
- [ ] personas
- [ ] scenarios
- [ ] scenario_evaluation_rules
- [ ] roleplay_sessions
- [ ] transcript_segments
- [ ] analysis_reports
- [ ] analysis_skill_scores
- [ ] session_events
- [ ] user_progress
- [ ] achievements
- [ ] user_achievements
- [ ] ai_settings
- [ ] prompt_templates
- [ ] knowledge_base_items
- [ ] scenario_knowledge_base
- [ ] audit_logs

Acceptance criteria:

- [ ] All migrations run successfully.
- [ ] Foreign keys are valid.
- [ ] Soft deletes are added where useful.
- [ ] Seeders create sample scenarios and personas.

## 5. Phase 3: Design System Foundation

- [ ] Create CSS variables for color palette.
- [ ] Create base typography classes.
- [ ] Create retro panel component.
- [ ] Create retro button component.
- [ ] Create retro input component.
- [ ] Create sidebar component.
- [ ] Create header component.
- [ ] Create card component.
- [ ] Create badge component.
- [ ] Create XP progress bar component.
- [ ] Create empty state component.
- [ ] Create loading state component.

Acceptance criteria:

- [ ] UI has consistent retro-modern look.
- [ ] Components are reusable.
- [ ] Components work on desktop and tablet.
- [ ] Buttons and forms have clear focus states.

## 6. Phase 4: Admin User Management

- [ ] Create admin dashboard route.
- [ ] Create user list page.
- [ ] Create user create form.
- [ ] Create user edit form.
- [ ] Create user deactivate action.
- [ ] Create user role update action.
- [ ] Create user detail page.
- [ ] Show user mission history placeholder.
- [ ] Add validation.
- [ ] Add audit logs.

Acceptance criteria:

- [ ] Admin can create users.
- [ ] Admin can edit users.
- [ ] Admin can deactivate users.
- [ ] User list can be filtered by role and status.

## 7. Phase 5: Persona Management

- [ ] Create Persona model.
- [ ] Create PersonaPolicy.
- [ ] Create persona list page.
- [ ] Create persona create form.
- [ ] Create persona edit form.
- [ ] Create persona duplicate action.
- [ ] Create persona archive action.
- [ ] Add avatar upload.
- [ ] Add behavior parameter fields.
- [ ] Add hidden instructions field.
- [ ] Add validation.

Acceptance criteria:

- [ ] Admin can create persona.
- [ ] Admin can edit persona.
- [ ] Admin can duplicate persona.
- [ ] Hidden instructions are never visible to normal users.
- [ ] Archived personas cannot be used in new published scenarios.

## 8. Phase 6: Scenario Management

- [ ] Create Scenario model.
- [ ] Create ScenarioPolicy.
- [ ] Create scenario list page.
- [ ] Create scenario create form.
- [ ] Create scenario edit form.
- [ ] Create scenario duplicate action.
- [ ] Create scenario archive action.
- [ ] Add persona selector.
- [ ] Add success criteria repeatable field.
- [ ] Add scenario prompt field.
- [ ] Add hidden rules field.
- [ ] Add difficulty selector.
- [ ] Add XP reward field.
- [ ] Add status control.
- [ ] Create evaluation rules UI.

Acceptance criteria:

- [ ] Admin can create draft scenario.
- [ ] Admin can publish scenario.
- [ ] Published scenario appears in user scenario library.
- [ ] Archived scenario does not appear to users.
- [ ] Scenario requires active persona.

## 9. Phase 7: User Dashboard

- [ ] Create user dashboard page.
- [ ] Show level.
- [ ] Show XP.
- [ ] Show streak.
- [ ] Show recent missions.
- [ ] Show recommended scenario.
- [ ] Show skill snapshot.
- [ ] Add "Start Training" button.
- [ ] Add empty state for new users.

Acceptance criteria:

- [ ] Dashboard loads for normal user.
- [ ] New user sees onboarding state.
- [ ] Returning user sees progress data.

## 10. Phase 8: Scenario Library and Briefing

- [ ] Create scenario library page.
- [ ] Show scenario cards.
- [ ] Add search.
- [ ] Add category filter.
- [ ] Add difficulty filter.
- [ ] Add locked scenario state.
- [ ] Create scenario detail page.
- [ ] Show briefing.
- [ ] Show objective.
- [ ] Show success criteria.
- [ ] Add Start Call button.

Acceptance criteria:

- [ ] User can browse published scenarios.
- [ ] User can open scenario detail.
- [ ] User cannot see hidden prompt instructions.
- [ ] User cannot start locked scenario.

## 11. Phase 9: Roleplay Session Lifecycle

- [ ] Create RoleplaySession model.
- [ ] Create start session endpoint.
- [ ] Validate scenario availability.
- [ ] Create pending session.
- [ ] Create call screen route.
- [ ] Create end session endpoint.
- [ ] Save duration.
- [ ] Save status.
- [ ] Queue analysis job placeholder.
- [ ] Create session events.

Acceptance criteria:

- [ ] User can start a session.
- [ ] Session status changes from pending to active.
- [ ] User can end session.
- [ ] Completed session appears in history.

## 12. Phase 10: Phone Call UI

- [ ] Build call interface.
- [ ] Add call timer.
- [ ] Add caller avatar.
- [ ] Add waveform placeholder.
- [ ] Add mute button.
- [ ] Add end call button.
- [ ] Add call status text.
- [ ] Add microphone permission handling.
- [ ] Add connection error state.
- [ ] Add confirmation for end call.

Acceptance criteria:

- [ ] UI resembles phone call.
- [ ] No chat bubbles are shown as primary interface.
- [ ] Timer works.
- [ ] End call works.
- [ ] Microphone permission error is clear.

## 13. Phase 11: AI Voice Integration

- [ ] Create AI provider contracts.
- [ ] Create Gemini Live provider class.
- [ ] Create roleplay prompt builder.
- [ ] Build runtime prompt from scenario and persona.
- [ ] Connect frontend to AI voice provider.
- [ ] Handle AI speaking/listening states.
- [ ] Handle disconnect.
- [ ] Handle provider errors.
- [ ] Add fallback message for unavailable provider.

Acceptance criteria:

- [ ] User can speak to AI persona.
- [ ] AI stays in character.
- [ ] AI uses scenario objective.
- [ ] AI does not reveal hidden instructions.
- [ ] Call can end cleanly.

## 14. Phase 12: Transcript Storage

- [ ] Create transcript segment endpoint.
- [ ] Save user utterances.
- [ ] Save AI utterances.
- [ ] Save timestamps when available.
- [ ] Generate combined transcript_text.
- [ ] Store transcript_json.
- [ ] Show transcript in report page.

Acceptance criteria:

- [ ] Completed session has transcript.
- [ ] Transcript identifies speaker.
- [ ] Transcript can be used by analysis job.

## 15. Phase 13: AI Analysis

- [ ] Create analysis provider contract.
- [ ] Create analysis prompt builder.
- [ ] Create Gemini Flash analysis provider.
- [ ] Create OpenRouter fallback provider.
- [ ] Create AnalyzeRoleplaySession job.
- [ ] Send transcript to analysis model.
- [ ] Require strict JSON output.
- [ ] Validate analysis JSON.
- [ ] Save analysis report.
- [ ] Save skill scores.
- [ ] Handle analysis failure.
- [ ] Add retry analysis action.

Acceptance criteria:

- [ ] Completed session generates analysis.
- [ ] Analysis includes score, grade, strengths, weaknesses.
- [ ] Skill scores are saved.
- [ ] Failed analysis can be retried.

## 16. Phase 14: Mission Report UI

- [ ] Create report page.
- [ ] Show overall score.
- [ ] Show grade.
- [ ] Show skill breakdown.
- [ ] Show strengths.
- [ ] Show weaknesses.
- [ ] Show missed opportunities.
- [ ] Show suggested responses.
- [ ] Show action plan.
- [ ] Show transcript tab.
- [ ] Show analysis loading page.
- [ ] Poll analysis status.

Acceptance criteria:

- [ ] User sees report after analysis completes.
- [ ] User can review transcript.
- [ ] Loading state is clear.
- [ ] Failed analysis state has retry option.

## 17. Phase 15: History and Performance

- [ ] Create history page.
- [ ] Add date filter.
- [ ] Add scenario filter.
- [ ] Add score filter.
- [ ] Create performance dashboard.
- [ ] Show average score.
- [ ] Show skill trends.
- [ ] Show total training time.
- [ ] Show weakest skill.
- [ ] Show best scenario.
- [ ] Show recent improvements.

Acceptance criteria:

- [ ] User can view past missions.
- [ ] User can open previous reports.
- [ ] Performance metrics update after completed analysis.

## 18. Phase 16: Gamification

- [ ] Create XP calculation service.
- [ ] Create level calculation service.
- [ ] Create achievement checker.
- [ ] Seed starter achievements.
- [ ] Award XP after analysis.
- [ ] Update streak.
- [ ] Unlock achievements.
- [ ] Show XP earned on report.
- [ ] Show achievements page.
- [ ] Show level progress on dashboard.

Acceptance criteria:

- [ ] User earns XP after completed mission.
- [ ] User levels up.
- [ ] Achievements unlock correctly.
- [ ] Cancelled sessions do not award XP.

## 19. Phase 17: Admin Reports

- [ ] Create admin report dashboard.
- [ ] Show sessions per day.
- [ ] Show average score.
- [ ] Show weakest skills.
- [ ] Show user performance table.
- [ ] Show scenario performance table.
- [ ] Add filters.
- [ ] Add export later placeholder.

Acceptance criteria:

- [ ] Admin can see training performance.
- [ ] Admin can filter by user and scenario.
- [ ] Admin can identify weakest skills.

## 20. Phase 18: Settings

- [ ] Create AI settings page.
- [ ] Store provider settings.
- [ ] Add encrypted secret support.
- [ ] Add app settings page.
- [ ] Add audio recording toggle.
- [ ] Add leaderboard toggle.
- [ ] Add achievements toggle.
- [ ] Add max call duration setting.

Acceptance criteria:

- [ ] Super Admin can update AI settings.
- [ ] Sensitive settings are protected.
- [ ] Normal admin cannot access AI secrets.

## 21. Phase 19: Testing

- [ ] Test authentication.
- [ ] Test role permissions.
- [ ] Test scenario CRUD.
- [ ] Test persona CRUD.
- [ ] Test session lifecycle.
- [ ] Test transcript storage.
- [ ] Test analysis parsing.
- [ ] Test failed analysis retry.
- [ ] Test XP and achievements.
- [ ] Test responsive UI.
- [ ] Test microphone permission handling.

## 22. Phase 20: Deployment

- [ ] Configure production environment.
- [ ] Configure database.
- [ ] Run migrations.
- [ ] Seed super admin.
- [ ] Configure queue worker.
- [ ] Configure scheduler.
- [ ] Configure storage symlink.
- [ ] Configure AI API keys.
- [ ] Test roleplay in production.
- [ ] Test analysis in production.
- [ ] Monitor logs.

## 23. MVP Completion Checklist

The MVP is complete when:

- [ ] Users can log in.
- [ ] Users can browse scenarios.
- [ ] Users can start voice roleplay.
- [ ] Users can end roleplay.
- [ ] Transcript is saved.
- [ ] AI analysis is generated.
- [ ] User can view mission report.
- [ ] User progress updates.
- [ ] Admin can manage scenarios.
- [ ] Admin can manage personas.
- [ ] Admin can view reports.
