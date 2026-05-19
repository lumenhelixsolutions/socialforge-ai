# Safety Policy

## Core rule

No autonomous agent receives direct social media credentials.

## Raw creative sandbox

The raw/obliterated model lane is allowed to produce edgy, experimental, satirical, adversarial, or provocative drafts.

It must not:

- Access platform credentials
- Post content
- Send DMs
- Use browser automation
- Access files outside its workspace
- Change app configuration
- Bypass reviewer workflow

## Publisher service policy

Future publishing must require:

1. Approved draft
2. Target platform
3. Rate-limit check
4. Credential scope check
5. Audit log entry
6. Human override/undo where platform permits

## Draft risk categories

Reviewer should flag:

- Defamation risk
- Legal claims needing evidence
- Medical/legal/financial advice
- Hate or harassment
- Platform policy risk
- Privacy/doxxing risk
- Spam/automation risk
- Unverified factual claims
- Tone mismatch

## Default modes

| Feature | Default |
|---|---|
| Direct publishing | Off |
| Raw model lane | Off |
| Browser automation | Off |
| API credentials | Missing/disabled |
| External network beyond model runner | Off unless needed |
| Human approval | Required |
