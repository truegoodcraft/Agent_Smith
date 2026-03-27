# Command Contracts

This document defines the canonical input/output contracts for Agent Smith's active slash commands. All deterministic logic must adhere to these shapes.

## Active Commands

### `/health`
Returns a static health check confirming the Worker and Durable Object are operational.

- **Request Shape**: `APIApplicationCommandInteraction`
- **Output Shape**: `InteractionResponse` with `ChannelMessageWithSource`.
- **Deterministic Output Expectations**:
  - The message content must be the static string: `Smith operational. Worker and Durable Object responding.`

### `/report`
Fetches and analyzes the primary telemetry report from `LIGHTHOUSE_REPORT_URL`.

- **Request Shape**: `APIApplicationCommandInteraction`
- **Output Shape**: `InteractionResponse` with `ChannelMessageWithSource`.
- **Consumed Lighthouse `/report` fields**:
  - Core metrics:
    - `today.update_checks`
    - `today.downloads`
    - `today.errors`
    - `last_7_days.update_checks`
    - `last_7_days.downloads`
    - `last_7_days.errors`
  - Optional traffic block:
    - `traffic.latest_day.day`
    - `traffic.latest_day.visits`
    - `traffic.latest_day.requests`
    - `traffic.latest_day.captured_at`
    - `traffic.last_7_days.visits`
    - `traffic.last_7_days.requests`
    - `traffic.last_7_days.avg_daily_visits`
    - `traffic.last_7_days.avg_daily_requests`
    - `traffic.last_7_days.days_with_data`
  - Optional human traffic block:
    - `human_traffic.today.pageviews`
    - `human_traffic.today.last_received_at`
    - `human_traffic.last_7_days.pageviews`
    - `human_traffic.last_7_days.days_with_data`
    - `human_traffic.last_7_days.top_paths[].path`
    - `human_traffic.last_7_days.top_paths[].pageviews`
    - `human_traffic.last_7_days.top_referrers[].referrer_domain`
    - `human_traffic.last_7_days.top_referrers[].pageviews`
    - `human_traffic.last_7_days.top_sources[].source`
    - `human_traffic.last_7_days.top_sources[].pageviews`
    - `human_traffic.observability.accepted`
    - `human_traffic.observability.dropped_rate_limited`
    - `human_traffic.observability.dropped_invalid`
    - `human_traffic.observability.last_received_at`
  - Optional identity block:
    - `identity.today.new_users`
    - `identity.today.returning_users`
    - `identity.today.sessions`
    - `identity.last_7_days.new_users`
    - `identity.last_7_days.returning_users`
    - `identity.last_7_days.sessions`
    - `identity.last_7_days.return_rate`
    - `identity.top_sources_by_returning_users[].source`
    - `identity.top_sources_by_returning_users[].users`
- **Deterministic Output Expectations**:
  - The message content must be a structured report adhering to the following format:
    ```
    **Report · OK · <window>**

    **Summary**
    - Update checks: [selected-window count]
    - Downloads: [selected-window count]
    - Errors: [selected-window count]

    **Today**
    - Update checks: [today count]
    - Downloads: [today count]
    - Errors: [today count]

    **Traffic**
    - Latest snapshot day: [YYYY-MM-DD or unavailable]
    - Latest captured at: [timestamp or unavailable]
    - Latest requests: [count or unavailable]
    - Latest visits: [count or unavailable]
    - Last 7 days requests: [count or unavailable]
    - Last 7 days visits: [count or unavailable]
    - Avg daily requests: [count or unavailable]
    - Avg daily visits: [count or unavailable]
    - Days with data: [count or unavailable]

    **Human Traffic**
    - Pageviews (today): [count]
    - Pageviews (7d): [count]
    - Days with data: [count]
    Top Paths:
    - [path] ([count])
    Top Referrers:
    - [referrer_domain] ([count])
    Top Sources:
    - [source] ([count])

    **Observability**
    - Accepted: [count]
    - Dropped (rate limited): [count]
    - Dropped (invalid): [count]

    **Identity**
    - New users (today): [count or unavailable]
    - Returning users (today): [count or unavailable]
    - Sessions (today): [count or unavailable]
    - New users (7d): [count or unavailable]
    - Returning users (7d): [count or unavailable]
    - Sessions (7d): [count or unavailable]
    - Return rate (7d): [percent or unavailable]
    Top Sources by Returning Users:
    - [source] ([users])

    **Read**
    - [deterministic core line]
    - [deterministic traffic line]
    - [deterministic human line]
    - [deterministic identity line(s), when identity exists]
    ```
  - The summary section must use data from `last_7_days` if available, otherwise it must fall back to `today`.
  - The today section must always render `today` metrics.
  - If the `traffic` block is absent, the Traffic section must contain exactly `Traffic data not present in this Lighthouse report.` and the command must still succeed.
  - If the `human_traffic` block is absent, both `Human Traffic` and `Observability` sections must be omitted and the command must still succeed with the same output structure used before human traffic support.
  - If the `identity` block is absent, the `Identity` section and identity read lines must be omitted and the command must still succeed.
  - If `identity` exists with missing subfields, parsing must remain successful and missing values must be shown as unavailable rather than fabricated.
  - If `human_traffic` top lists are empty, corresponding `Top Paths`, `Top Referrers`, and `Top Sources` headings must be omitted.
  - If `identity.top_sources_by_returning_users` is empty or missing, `Top Sources by Returning Users:` must show `- none`.
  - If traffic values are `null`, the report must present them honestly as unavailable and must not invent replacement values.
  - The core read line is determined by selected-window counters only:
    - `errors > 0` → `Recent error activity present; investigation recommended.`
    - `errors == 0` and (`downloads > 0` or `update_checks > 0`) → `Normal activity present with no recent errors.`
    - otherwise → `No core activity recorded in the selected window.`
  - The traffic read line is determined only by Lighthouse traffic values:
    - missing `traffic` block → `Traffic data not present in this Lighthouse report.`
    - `traffic.latest_day.day` present → `Traffic snapshot present for latest completed day.`
    - otherwise → `No traffic snapshot recorded yet.`
    - If `days_with_data == 0`, append `No traffic history stored in the last 7 days.`
    - If `days_with_data > 0` and `avg_daily_requests > 0`, append `Traffic history is available for recent days.`
  - The optional human read line is shown only when `human_traffic` exists and is determined by human pageviews plus selected-window downloads:
    - `human_traffic.today.pageviews > 0` → includes `Human activity present with [count] pageviews.`
    - otherwise → includes `Human traffic absent or very low.`
    - selected-window `downloads > 0` and selected-window human pageviews `== 0` → includes `Downloads present without pageviews (possible direct/binary access).`
    - selected-window human pageviews `> 0` and selected-window `downloads == 0` → includes `Pageviews present without downloads (low conversion).`
    - selected-window human pageviews `> 0` and selected-window `downloads > 0` → includes `Pageviews and downloads both present (active engagement).`
  - Optional identity read lines are shown only when `identity` exists and must remain conservative:
    - returning users evidence (`identity.today.returning_users > 0`, `identity.last_7_days.returning_users > 0`, or positive `top_sources_by_returning_users[].users`) allows anonymous repeat-engagement language only.
    - zero returning users with other activity allows acquisition-without-return language.
    - sessions greater than distinct users allows cautious revisit-depth inference.
    - tiny counts must use restrained wording (for example: small/early signal, too early for strong conclusions).
    - identity read lines must not claim validated retention, channel fit proof, product-market fit, or similarly overstated certainty.
  - If the fetch or validation fails, an ephemeral error message is shown instead.

## Deferred Commands

`/traffic` and `/errors` are planned but not part of the current MVP. They have no active handlers, services, types, or logic in the runtime.

## Error Handling

The interaction endpoint has the following deterministic error behaviors:

-   **Malformed Request/Invalid JSON**: If the request body is not valid JSON, the Worker will return an `HTTP 500` and post an ephemeral message to Discord stating: `An unexpected error occurred while processing your command.`
-   **Unknown Command**: If a user invokes a valid slash command that is not recognized by the bot, the Worker will return an `HTTP 400` and a public message stating: `Unknown command: [command_name]`.
-   **Unsupported Interaction Type**: If the Worker receives a valid but unsupported interaction type (e.g., a message component interaction), it will return an `HTTP 400` and an ephemeral message stating: `Error: Unsupported interaction type.`
