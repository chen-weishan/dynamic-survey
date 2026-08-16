# dynamic-survey

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (`chen-weishan/dynamic-survey`), operated via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, using their default label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Testing

Backend: `cd backend && ./gradlew test`. No MySQL and no environment variables required —
tests run on H2 via `src/test/resources/application-test.properties`.

Three layers, each proving something the others cannot:
`security/JwtUtilTest` (signature, expiry, tampering — no Spring context),
`controller/AuthControllerTest` (`@WebMvcTest`; HTTP contract only, `AuthService` mocked),
`AuthFlowIntegrationTest` (`@SpringBootTest` + H2; nothing mocked — proves the filter chain is wired up).
